global.__basedir = __dirname;

// Dashboard
const http = require('http');
const express = require('express');
const router = express.Router();
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;

// Importing Routes
const participantRoutes = require('./routes/participantRoutes');
const apiRoutes = require('./routes/apiRoutes');

// Register the routes
app.use(express.static('public'));
app.use('/participants', participantRoutes);
app.use('/api', apiRoutes);

//ParticipantsConfigHandler
const participantsConfigHandler = require('./myModules/participantsConfigHandler');

// GSI
const CSGOGSI = require('node-csgo-gsi');
const GameStateMonitor = require('./myModules/GameStateMonitor');

// has to match gamestate_integration_*.cfg in CS folder
const csgoGSI = new CSGOGSI({
    port: 3000, 
    authToken: ["Q79v5tcxVQ8u"]
});
const gameStateMonitor = new GameStateMonitor(csgoGSI, false);

gameStateMonitor.on('bombPlanted', () => {
    const eventText = 'Bomb planted!';
    io.emit('bombPlanted')
    console.log('Server: ' + eventText);
});

gameStateMonitor.on('bombDefused', () => { 
    const eventText = 'Bomb defused!';
    io.emit('bombDefused')
    console.log('Server: ' + eventText);
});

gameStateMonitor.on('bombExploded', () => {
    const eventText = 'Bomb exploded!';
    io.emit('bombExploded')
    console.log('Server: ' + eventText);
});

gameStateMonitor.on('roundBegin', () => {
    const eventText = 'New round!';
    io.emit('roundBegin');
    console.log('Server: ' + eventText);
})

gameStateMonitor.on('roundFreeze', () => {
    const eventText = 'Freezetime.';
    io.emit('roundFreeze');
    console.log('Server: ' + eventText);
})

gameStateMonitor.on('roundEnd', () => {
    const eventText = 'Round ended.';
    console.log('Server: ' + eventText);
})

// Round Win Condition and Effect Handling
gameStateMonitor.on('roundWinCondition', ({roundWinCondition}) => {
    console.log(`Server: Round Win Condition: ${roundWinCondition}`);
})

gameStateMonitor.on('winTeam_CT', () => {
    const eventText = 'Counter-Terrorists win!';
    io.emit('eventText', eventText);
    io.emit('winTeam_CT');
    console.log('Server: ' + eventText);
})

gameStateMonitor.on('winTeam_T', () => {
    const eventText = 'Terrorists win!';
    io.emit('eventText', eventText);
    io.emit('winTeam_T');
    console.log('Server: ' + eventText);
})

gameStateMonitor.on('playerDeath', ({ steamid, name }) => {
    const eventText = `Player with ID [${steamid}] and Name [${name}] has died.`;
    console.log('Server: ' + eventText);
    io.emit('playerDeath', ({ steamid, name }));
})

gameStateMonitor.on('playerDeathWithGrenade', ({ steamid, name }) => {
    const eventText = `Player with ID [${steamid}] and Name [${name}] died with a grenade in the hand.`
    console.log('Server: ' + eventText);
    io.emit('playerDeathWithGrenade', ({ steamid, name }));
})

gameStateMonitor.on('playerMVP', ({ steamid, name }) => {
    const eventText = `MVP: ID [${steamid}] Name [${name}] Whoop Whoop.`;
    console.log('Server: ' + eventText);
    io.emit('playerMVP', ({ steamid, name }));
})

gameStateMonitor.on('matchInfoUpdate', ({ newMatchState }) => {
    const eventText = `matchInfoUpdate: ${newMatchState}`;
    // const eventText = `matchInfoUpdate: ${JSON.stringify(newMatchState)}`;
    io.emit('matchInfoUpdate', ({ newMatchState }));
    console.log('Server: ' + eventText);
})

gameStateMonitor.on('playerStateUpdate', ({ playerStateWithoutHealth }) => {
    const eventText = `playerStateUpdate: ${playerStateWithoutHealth}`;
    // const eventText = `playerStateUpdate: ${JSON.stringify(playerStateWithoutHealth)}`;
    io.emit('playerStateUpdate', playerStateWithoutHealth);
    console.log('Server: ' + eventText);
});

gameStateMonitor.on('roundPhaseChange', ({ newRoundPhase }) => {
    const eventText = `roundPhaseChange: ${newRoundPhase}`;
    io.emit('roundPhaseChange', {newRoundPhase});
    console.log('Server: ' + eventText);
});

gameStateMonitor.on('roundPhaseCountdownUpdate', ({ newRoundPhaseCountdownString, urgend }) => {
    io.emit('roundPhaseCountdownUpdate', ({newRoundPhaseCountdownString, urgend}));
});

gameStateMonitor.on('getCurrentClientParticipantsConfig', () => {
    io.emit('sendParticipantsConfig', ({ participantsConfig }));
    console.log('SOCKET IO: Sent Clients participantsConfig');
});


//Dashboard Server
io.on('connection', async (socket) => {
    console.log(`SOCKET IO: Client connected: ${socket.id}`);
    
    // Client Connect Trigger Datasending
    gameStateMonitor.emitModifiedPlayerStateOnChange();
    gameStateMonitor.emitCurrentMatchState();

    // ParticipantConfig on Connection from Cache
    const participantsConfig = await participantsConfigHandler.getConfigCache();
    io.emit('sendParticipantsConfig', ({ participantsConfig }));
    console.log('SOCKET IO: Sent Clients participantsConfig');

    // For example, you can emit a message to the client
    socket.emit('connected', 'SOCKET IO: You are now connected to the server.');

    // Listen for events from the client
    socket.on('clientEvent', (data) => {
        console.log('SOCKET IO: Received data from client:', data);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('SOCKET IO: A client has disconnected.');
    });
});

//Define a route to serve static files from the node_modules directory
// app.use('/dist', express.static(path.join(__dirname, './public')));

// Load the configuration at server startup
reloadConfigCache();
async function reloadConfigCache() {
    let loaded = await participantsConfigHandler.generateClientParticipantsConfig();
    await participantsConfigHandler.saveConfig(loaded);
    console.log('Server: Finished building and Saving ConfigCache')
}

server.listen(8080, () => {
    console.log('Dashboard Server Running on port 3001');
});