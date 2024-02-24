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
        this.setupListeners();
    }

    setupListeners() {
        this.csgoGSI.on('all', this.handleGameStateChange.bind(this));
    }

    handleGameStateChange(data) {
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
            let stateChanged = false;

            Object.keys(data.allplayers).forEach(steamid => {
                const newPlayerDataPayload = data.allplayers[steamid];
                const { state, name, team, match_stats } = newPlayerDataPayload;

                // Initialize currentPlayerState object if it does not exist
                if (!this.currentPlayerState[steamid]) {
                    this.currentPlayerState[steamid] = {
                        name,
                        team,
                        health: state.health,
                        match_stats
                    };
                    stateChanged = true; // Flag state as changed
                } else {
                    // Match Stats Change check
                    if (JSON.stringify(this.currentPlayerState[steamid].match_stats) !== JSON.stringify(match_stats)) {
                        // MVP Check
                        if (match_stats.mvps > this.currentPlayerState[steamid].match_stats.mvps) {
                            this.customEmit('playerMVP', { steamid, name });
                        }
                        this.currentPlayerState[steamid].match_stats = match_stats;
                        stateChanged = true; // Flag state as changed
                    }

                    // Death of Player
                    if (this.currentPlayerState[steamid].health > 0 && state.health === 0) {
                        this.customEmit('playerDeath', { steamid, name });
                        this.currentPlayerState[steamid].health = state.health;
                        stateChanged = true; // Flag state as changed
                    } else if (this.currentPlayerState[steamid].health !== state.health) {
                        this.currentPlayerState[steamid].health = state.health;
                        stateChanged = true; // Consider health change as state change
                    }

                    // Team Change
                    if (this.currentPlayerState[steamid].team !== team) {
                        this.currentPlayerState[steamid].team = team;
                        stateChanged = true; // Flag state as changed
                    }

                    // Name Change
                    if (this.currentPlayerState[steamid].name !== name) {
                        this.currentPlayerState[steamid].name = name;
                        stateChanged = true; // Flag state as changed
                    }
                }
            });

            // After processing all players, emit the state update if any changes were detected
            if (stateChanged) {
                this.emitModifiedPlayerStateOnChange();
            }
        }
        
        // Map State Changes
        if (data.map) {
            const currentMapData = data.map
            const newMatchState = {
                mode: currentMapData.mode,
                name: currentMapData.name,
                phase: currentMapData.phase,
                round: currentMapData.round,
                team_ct_score: currentMapData.team_ct.score,
                team_t_score: currentMapData.team_t.score
            };

            if (JSON.stringify(this.currentMatchState) !== JSON.stringify(newMatchState)) {
                console.log("DIFFERENT MATCH STATES")
                this.currentMatchState = newMatchState;
                this.customEmit('matchInfoUpdate', { newMatchState });
            }
        }
    }

    emitModifiedPlayerStateOnChange() {
        try {
            // console.log('emitModifiedPlayerStateOnChange');
            const playerStateWithoutHealth = {};
            Object.keys(this.currentPlayerState).forEach(steamid => {
                const { health, ...rest } = this.currentPlayerState[steamid];
                playerStateWithoutHealth[steamid] = { ...rest };
            });
            this.customEmit('playerStateUpdate', {playerStateWithoutHealth});
        } catch (error) {
            console.error('Error in emitModifiedPlayerStateOnChange:', error);
        }
    }

    emitWinTeam() {
        try{
            if(this.winTeam === 'CT') this.customEmit('winTeam_CT')
            else this.customEmit('winTeam_T')
        } catch (error) {
            console.error('Error in emitWinTeam:', error);
        }
    }

    customEmit(eventName, data) {
        try{
            if (this.inspect_mode) {
                console.log('Current Game State:', this.currentGameState);
                console.log('Current Player State:', this.currentPlayerState);
            }
            // OG Emit Function
            this.emit(eventName, data);
        } catch (error) {
            console.error('Error in customEmit:', error);
        }
    }
}

module.exports = GameStateMonitor;
 