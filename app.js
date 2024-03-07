global.__basedir = __dirname;

// Dashboard
const http = require('http');
const express = require('express');
const router = express.Router();
const app = express();
const server = http.createServer(app);
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
// Socket IO
const io = require('socket.io')(server);
const voteNamespace = io.of('/vote');

// Importing Routes
const mvpSettingsRoutes = require('./routes/mvpSettingsRoutes');
const votingRoutes = require('./routes/votingRoutes');
const beerRoutes = require('./routes/beerRoutes');
const apiRoutes = require('./routes/apiRoutes');

// Register the routes
app.use(express.static('public'));
app.use('/mvpsettings', mvpSettingsRoutes);
app.use('/beer', beerRoutes);
app.use('/voting', votingRoutes);
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
    const participantsConfig = participantsConfigHandler.getConfigCache();
    io.emit('sendParticipantsConfig', ({ participantsConfig }));
    console.log('SOCKET IO: Sent Clients participantsConfig');
});

// Voting SocketIO Integration ---------------------
let votingParticipants = {};
voteNamespace.on('connection', (socket) => {
    console.log(`VOTING SOCKET IO: Client connected: ${socket.id}`);

    socket.on('registerParticipant', ({steamid, name}) => {
        // Ensure the participant is not already registered
        if (!votingParticipants[steamid]) {
            
            // Register new participant
            votingParticipants[steamid] = {
                name: name,
                team: null,
                socketId: socket.id // Keep track of the socket ID if needed
            };
            
            console.log(`VOTING SOCKET IO: Participant joined: ${steamid} - ${votingParticipants[steamid].name}`);

            // Notify all clients about the new participant
            voteNamespace.emit('newParticipant', { votingParticipants });
        } else {
            console.log(`VOTING SOCKET IO: Participant already registered: ${steamid}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`VOTING SOCKET IO: Client disconnected: ${socket.id}`);
        // Find and remove the disconnected participant
        for (const steamid in votingParticipants) {
            if (votingParticipants[steamid].socketId === socket.id) {
                console.log(`VOTING SOCKET IO: Participant left: ${steamid} - ${votingParticipants[steamid].name}`);
                delete votingParticipants[steamid];
                voteNamespace.emit('participantLeft', {steamid});
                break;
            }
        }
    });
});
// Voting SocketIO Integration End -------------------------------------------

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

    socket.on('updateBeerCount', async (data) => {
        const { steamid, action } = data;
        // Assuming you have a function to update the beer count
        await participantsConfigHandler.updateBeerCount(steamid, action); // Implement this function based on your data management

        // After updating, emit the new count to all clients
        const newBeerCount = participantsConfigHandler.getBeerCount(steamid); // Get the updated beer count
        io.emit('beerCountUpdated', { steamid, beers: newBeerCount });
        io.emit('sendParticipantsConfig', ({ participantsConfig }));
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