// Dashboard
const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);
const path = require('path');


app.use(express.static('public'));

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
    io.emit('eventText', eventText);
    io.emit('bombPlanted')
    console.log('Server: ' + eventText);
});

gameStateMonitor.on('bombDefused', () => { 
    const eventText = 'Bomb defused!';
    io.emit('eventText', eventText);
    io.emit('bombDefused') 
    console.log('Server: ' + eventText);
});

gameStateMonitor.on('bombExploded', () => {
    const eventText = 'Bomb exploded!';
    io.emit('eventText', eventText);
    io.emit('bombExploded') 
    console.log('Server: ' + eventText);
});

gameStateMonitor.on('roundBegin', () => {
    const eventText = 'New round!';
    io.emit('eventText', eventText);
    io.emit('roundBegin');
    console.log('Server: ' + eventText);
})

gameStateMonitor.on('roundFreeze', () => {
    const eventText = 'Freezetime.';
    io.emit('eventText', eventText);
    io.emit('roundFreeze');
    console.log('Server: ' + eventText);
})

gameStateMonitor.on('roundEnd', () => {
    const eventText = 'Round ended.';
    io.emit('eventText', eventText);
    io.emit('roundEnd');
    console.log('Server: ' + eventText);
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
    const eventText = `Player with ID [${steamid}] and Name [${name}] has died.`
    console.log('Server: ' + eventText);
    const eventTextAlt = `${name} has died.`
    io.emit('eventText', eventTextAlt);
    io.emit('playerDeath', ({ steamid, name }));
})

gameStateMonitor.on('playerMVP', ({ steamid, name }) => {
    const eventText = `MVP: ID [${steamid}] Name [${name}] Whoop Whoop.`;
    console.log('Server: ' + eventText);
    const eventTextAlt = `${name} is MVP.`;
    io.emit('eventText', eventTextAlt);
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

//Dashboard Server
io.on('connection', (socket) => {
    console.log(`SOCKET IO: Client connected: ${socket.id}`);

    // You can perform additional actions here when a client connects

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

server.listen(8080, () => {
    console.log('Dashboard Server Running on port 3001');
});