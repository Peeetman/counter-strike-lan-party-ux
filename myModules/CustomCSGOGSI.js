const EventEmitter = require('events');
const CSGOGSI = require('node-csgo-gsi');

class CustomCSGOGSI extends EventEmitter {
    constructor(config) {
        super();
        this.gsi = new CSGOGSI(config);
        this.myGameState = {
            roundPhase: 'unknown',
            bombState: 'unknown',
            roundWinTeam: 'unknown'
        };
        this.setupListeners();
    }

    setupListeners() {
        this.gsi.on("roundPhase", (phase) => this.handleRoundPhase(phase));
        this.gsi.on("bombState", (state) => this.handleBombState(state));
        // Additional listeners for round wins and other states can be added here
    }

    handleRoundPhase(phase) {
        // Example logic for handling round phase changes
        if (this.myGameState.roundPhase !== phase) {
            if (phase === 'live') {
                this.emit('RoundBegin');
            } else if (phase === 'over') {
                this.emit('RoundEnd');
            } else if (phase === 'freezetime') {
                this.emit('RoundFreeze');
            }
            this.myGameState.roundPhase = phase;
        }
    }

    handleBombState(state) {
        // Interpret bomb state changes based on your if statements
        if (state === 'planted' && this.myGameState.bombState !== 'planted') {
            this.emit('BombPlanted');
            this.myGameState.bombState = 'planted';
        } else if (state === 'defused' && this.myGameState.bombState === 'planted') {
            this.emit('BombDefused');
            this.myGameState.bombState = 'defused';
        } else if (state === 'exploded' && this.myGameState.bombState === 'planted') {
            this.emit('BombExploded');
            this.myGameState.bombState = 'exploded';
        }
    }

    resetRoundState() {
        // Reset relevant state at the start of a new round
        this.myGameState.bombState = 'unknown';
        // Additional state resets can be added here
    }

    // Implement additional handlers for WinTeam and other states as needed
}

module.exports = CustomCSGOGSI;
