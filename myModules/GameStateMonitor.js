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
            Object.keys(data.allplayers).forEach(steamid => {
                
                const newPlayerDataPayload = data.allplayers[steamid];
                const { state, name, team, match_stats } = newPlayerDataPayload;

                // Init currentPlayerState obj if not exists
                if (!this.currentPlayerState[steamid]) {
                    this.currentPlayerState[steamid] = {
                        name,
                        team,
                        health: state.health,
                        match_stats
                    };
                    this.customEmit('playerStateUpdate', this.currentPlayerState);
                 } else {

                    // Match Stats Change
                    if (JSON.stringify(this.currentPlayerState[steamid].match_stats) !== JSON.stringify(match_stats)) {
                        // with MVP Check
                        if (match_stats.mvps > this.currentPlayerState[steamid].match_stats.mvps) {
                            this.customEmit('playerMVP', { steamid, name });
                        }
                        this.currentPlayerState[steamid].match_stats = match_stats;
                        this.emitModifiedPlayerStateOnChange();
                        console.log("match_stats have changed");
                    }

                    
                    // Death of Player
                    if (this.currentPlayerState[steamid].health > 0 && state.health === 0) {
                        this.customEmit('playerDeath', { steamid, name });
                        this.currentPlayerState[steamid].health = state.health;
                    } else if (this.currentPlayerState[steamid].health !== state.health) {
                        this.currentPlayerState[steamid].health = state.health;
                    }

                    // Team Change
                    if (this.currentPlayerState[steamid].team !== team ) {
                        this.currentPlayerState[steamid].team = team;
                        this.emitModifiedPlayerStateOnChange();
                    }

                    // Name Change
                    if (this.currentPlayerState[steamid].name !== name ) {
                        this.currentPlayerState[steamid].name = name;
                        this.emitModifiedPlayerStateOnChange();
                    }
                }
            });
        }

        // Map State Changes
        if (data.map) {
            const currentMapData = data.map
            const newMatchState = {
                mode: currentMapData.mode,
                name: currentMapData.name,
                phase: currentMapData.phase,
                round: currentMapData.phase,
                team_ct_score: currentMapData.team_ct.score,
                team_t_score: currentMapData.team_t.score
            };

            if (JSON.stringify(this.currentMatchState) !== JSON.stringify(newMatchState)) {
                this.currentMatchState = newMatchState;
                this.customEmit('matchInfoUpdate', { newMatchState });
            }
        }
    }

    emitModifiedPlayerStateOnChange() {
        const playerStateWithoutHealth = {};
        // Iterate over currentPlayerState to copy each player's state except for the health
        Object.keys(this.currentPlayerState).forEach(steamid => {
            const { health, ...rest } = this.currentPlayerState[steamid]; // Destructure to exclude health
            playerStateWithoutHealth[steamid] = { ...rest }; // Copy the rest of the player's state
        });
        this.customEmit('playerStateUpdate', playerStateWithoutHealth);
        this.inspectCurrentStates();

    }

    emitWinTeam() {
        if(this.winTeam === 'CT') customEmit('winTeam_CT')
        else customEmit('winTeam_T')
    }

    customEmit(eventName, data) {
        if (this.inspect_mode) {
            console.log('Current Game State:', this.currentGameState);
            console.log('Current Player State:', this.currentPlayerState);
        }
        // OG Emit Function
        this.emit(eventName, data);
    }
}

module.exports = GameStateMonitor;