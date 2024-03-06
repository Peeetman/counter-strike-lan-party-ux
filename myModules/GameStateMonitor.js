// GameStateMonitor.js

const EventEmitter = require('events');

class GameStateMonitor extends EventEmitter {
    constructor(csgoGSI, inspect_mode = false) {
        super();
        this.csgoGSI = csgoGSI;
        this.inspect_mode = inspect_mode;
        this.currentGameState = {
            roundPhase: 'unknown',
            bombState: 'unknown',
            winTeam: 'unknown',
        };
        this.currentPlayerState = {};
        this.currentMatchState = {};
        this.currentRoundPhaseCountdown = {};
        this.setupListeners();
    }

    setupListeners() {
        this.csgoGSI.on('all', this.handleGameStateChange.bind(this));
    }

    handleGameStateChange(data) {
        // console.log(data);
        // Round Phase Changes
        if (data.round && this.currentGameState.roundPhase !== data.round.phase) {
            this.currentGameState.roundPhase = data.round.phase;
            switch (data.round.phase) {
                case 'live':
                    this.customEmit('roundBegin');
                    this.currentGameState.winTeam = 'unknown'; // Reset winTeam at the start of a new round
                    break;
                case 'over':
                    this.customEmit('roundEnd');
                    break;
                case 'freezetime':
                    this.customEmit('roundFreeze');
                    break;
            }
        }

        // WinTeam Change
        if (data.round && data.round.win_team && this.currentGameState.winTeam !== data.round.win_team) {
            this.currentGameState.winTeam = data.round.win_team;
            this.emitWinTeam()
        }

        // Bomb Changes
        if (data.round && data.round.bomb && this.currentGameState.bombState !== data.round.bomb) {
            this.currentGameState.bombState = data.round.bomb;
            switch (data.round.bomb) {
                case 'planted':
                    this.customEmit('bombPlanted');
                    break;
                case 'defused':
                    this.customEmit('bombDefused');
                    break;
                case 'exploded':
                    this.customEmit('bombExploded');
                    break;
                }
        }

        // All Player Data
        if (data.allplayers) {
            /*
            console.log("data.allplayers exists");
            //Testing behavour of Object.keys to understand it better
            Object.keys(data.allplayers).forEach(steamid => {
                console.log(steamid);
                try {
                    this.emitModifiedPlayerStateOnChange();
                } catch (error) {
                    console.error('Error in emitModifiedPlayerStateOnChange:', error);
                }
            })
            */
            
            // Indicates if any player's state has changed, initializing to false
            let PlayerStateChanged = false;

            Object.keys(data.allplayers).forEach(steamid => {
                const newPlayerDataPayload = data.allplayers[steamid];
                const { state, name, team, match_stats, weapons } = newPlayerDataPayload;

                const weaponType = "Grenade";
                const weaponState = "active";
                const activeGrenade = Object.keys(this.filterObjectsByTypeAndState(weapons, weaponType, weaponState)).length

                // Initialize currentPlayerState object if it does not exist
                if (!this.currentPlayerState[steamid]) {
                    this.currentPlayerState[steamid] = {
                        name,
                        team,
                        health: state.health,
                        match_stats,
                        weapons,
                        timestampLastActiveGrenade: 0
                    };

                    PlayerStateChanged = true; // Flag state as changed
                } else {
                    // Match Stats
                    if (JSON.stringify(this.currentPlayerState[steamid].match_stats) !== JSON.stringify(match_stats)) {
                        // MVP Check
                        if (match_stats.mvps > this.currentPlayerState[steamid].match_stats.mvps) {
                            this.customEmit('playerMVP', { steamid, name });
                        }
                        this.currentPlayerState[steamid].match_stats = match_stats;
                        PlayerStateChanged = true; // Flag state as changed
                    }

                    // Death of Player
                    if (this.currentPlayerState[steamid].health > 0 && state.health === 0) {
                        this.customEmit('playerDeath', { steamid, name });
                        this.currentPlayerState[steamid].health = state.health;
                        PlayerStateChanged = true; // Flag state as changed

                        if(Date.now() - this.currentPlayerState[steamid].timestampLastActiveGrenade < 1000 || activeGrenade > 0) {
                            console.log(`GameStateMonitor.js: ${name} died with grenade in hand`)
                            this.customEmit('playerDeathWithGrenade', { steamid, name });
                        }

                    } else if (this.currentPlayerState[steamid].health !== state.health) {
                        this.currentPlayerState[steamid].health = state.health;
                        PlayerStateChanged = true;
                    }

                    // Team Change
                    if (this.currentPlayerState[steamid].team !== team) {
                        this.currentPlayerState[steamid].team = team;
                        PlayerStateChanged = true;
                    }

                    // Name Change
                    if (this.currentPlayerState[steamid].name !== name) {
                        this.currentPlayerState[steamid].name = name;
                        PlayerStateChanged = true;
                    }

                    // Weapon Change   
                    if (JSON.stringify(this.currentPlayerState[steamid].weapons) !== JSON.stringify(weapons)) {
                        if ( activeGrenade > 0 ) this.currentPlayerState[steamid].timestampLastActiveGrenade = Date.now();
                        this.currentPlayerState[steamid].weapons = weapons;
                        // PlayerStateChanged = true; // no emit

                    }
                }
            });

            const payloadSteamids = Object.keys(data.allplayers);
            // Iterate over currentPlayerState and delete entries that are not present in payloadSteamids
            Object.keys(this.currentPlayerState).forEach((steamid) => {
                if (!payloadSteamids.includes(steamid)) {
                    delete this.currentPlayerState[steamid];
                }
            });

            // After processing all players, emit the state update if any changes were detected
            if (PlayerStateChanged) {
                this.emitModifiedPlayerStateOnChange();
            }
        }

        // Map State Changes
        if (data.map) {
            const currentMapData = data.map
            const newMatchState = {
                mode: currentMapData.mode,
                name: currentMapData.name,
                match_phase: currentMapData.phase,
                round: currentMapData.round,
                team_ct_score: currentMapData.team_ct.score,
                team_t_score: currentMapData.team_t.score
            };

            if (JSON.stringify(this.currentMatchState) !== JSON.stringify(newMatchState)) {
                this.currentMatchState = newMatchState;
                this.emitCurrentMatchState(newMatchState)
            }
        }

        try {
            //Phase Countown Changes
            if(data.phase_countdowns) {
                const currentRoundPhaseCountdown = data.phase_countdowns;
                let currentRoundPhaseCountdownChanged = false;

                // Emit and Update only On Phase-Change but ignore Phase 'defuse' to not give intel
                if(this.currentRoundPhaseCountdown.phase !== currentRoundPhaseCountdown.phase && currentRoundPhaseCountdown.phase !== 'defuse') {
                    const newRoundPhase = currentRoundPhaseCountdown.phase;
                    this.customEmit('roundPhaseChange', { newRoundPhase });
                    currentRoundPhaseCountdownChanged = true;
                }

                let newRoundPhaseCountdownString = '';
                let urgend = false;
                if(currentRoundPhaseCountdown.phase !== 'bomb' && currentRoundPhaseCountdown.phase !== 'defuse') {                
                    // Emit CountdownUpdate on 1 second Change
                    if (Math.ceil(parseFloat(this.currentRoundPhaseCountdown.phase_ends_in)) - Math.ceil(parseFloat(currentRoundPhaseCountdown.phase_ends_in)) >= 1) {
                        const newRoundPhaseCountdown = Math.ceil(parseFloat(currentRoundPhaseCountdown.phase_ends_in));
                        newRoundPhaseCountdownString = new Date(newRoundPhaseCountdown * 1000).toISOString().substring(14, 19);
                        (newRoundPhaseCountdown <= 10 ? urgend = true : urgend = false);
                        this.customEmit('roundPhaseCountdownUpdate', { newRoundPhaseCountdownString, urgend });
                        currentRoundPhaseCountdownChanged = true;
                    }
                } else {
                    // newRoundPhaseCountdownString = '😱';
                    // this.customEmit('roundPhaseCountdownUpdate', { newRoundPhaseCountdownString, urgend });
                    // currentRoundPhaseCountdownChanged = true;
                    // check bomb planted again
                    if (currentRoundPhaseCountdown.phase === 'bomb' && this.currentGameState.bombState !== 'planted'){
                        this.currentGameState.bombState = 'planted';
                        this.customEmit('bombPlanted');
                    }
                }

                if (currentRoundPhaseCountdownChanged) this.currentRoundPhaseCountdown = currentRoundPhaseCountdown;
            }
        } catch (error) {console.error(error)};
    }

    filterObjectsByTypeAndState(jsonObject, type, state) {
      const filteredObjects = {};
      for (const key in jsonObject) {
        if (jsonObject[key].type === type && jsonObject[key].state === state) {
          filteredObjects[key] = jsonObject[key];
        }
      }
      return filteredObjects;
    }

    emitCurrentMatchState(){
        const newMatchState = this.currentMatchState
        this.customEmit('matchInfoUpdate', { newMatchState });
    }

    emitModifiedPlayerStateOnChange() {
        try {
            // console.log('emitModifiedPlayerStateOnChange');
            const playerStateWithoutHealth = {};
            Object.keys(this.currentPlayerState).forEach(steamid => {
                const { health, weapons, weaponsTimestamp, ...rest } = this.currentPlayerState[steamid];
                playerStateWithoutHealth[steamid] = { 
                    ...rest,
                    alive: (health > 0 ? true : false)
                };
            });
            this.customEmit('playerStateUpdate', {playerStateWithoutHealth});
        } catch (error) {
            console.error('Error in emitModifiedPlayerStateOnChange:', error);
        }
    }

    emitWinTeam() {
        try{
            if(this.currentGameState.winTeam === 'CT') this.customEmit('winTeam_CT')
            else this.customEmit('winTeam_T')
        } catch (error) {
            console.error('Error in emitWinTeam:', error);
        }
    }

    customEmit(eventName, data = false) {
        try{
            if (this.inspect_mode) {
                console.log('Current Game State:', JSON.stringify(this.currentGameState));
                console.log('Current Player State:', JSON.stringify(this.currentPlayerState));
            }
            // OG Emit Function
            this.emit(eventName, data);
        } catch (error) {
            console.error('Error in customEmit:', error);
        }
    }

    getPlayerState(){
        return this.currentPlayerState;
    }
}

module.exports = GameStateMonitor;
 