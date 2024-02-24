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
    console.log('The bomb has been planted!'); 
    io.emit('bombPlanted') 
});

gameStateMonitor.on('bombDefused', () => { 
    console.log('The bomb has been defused!'); 
    io.emit('bombDefused') 
});

gameStateMonitor.on('bombExploded', () => {
    console.log('The bomb has exploded!')
    io.emit('bombExploded') 
});

gameStateMonitor.on('roundBegin', () => {
    console.log('A new round has begun.');
    io.emit('roundBegin');
})

gameStateMonitor.on('roundFreeze', () => {
    console.log('A Freeze has begun.');
    io.emit('roundFreeze');
})

gameStateMonitor.on('roundEnd', () => {
    console.log('The round has ended.');
    io.emit('roundEnd');
})

gameStateMonitor.on('winTeam_CT', () => {
    console.log('Counter-Terrorists have won the round!');
    io.emit('winTeam_CT');
})

gameStateMonitor.on('winTeam_T', () => {
    console.log('Terrorists have won the round!');
    io.emit('winTeam_T');
})

gameStateMonitor.on('playerDeath', ({ steamid, name }) => {
    console.log(`Player with ID [${steamid}] and Name [${name}] has died.`);
    io.emit('playerDeath', ({ steamid, name }));
})

gameStateMonitor.on('playerMVP', ({ steamid, name }) => {
    console.log(`MVP: ID [${steamid}] Name [${name}] Whoop Whoop.`);
    io.emit('playerMVP', ({ steamid, name }));
})

gameStateMonitor.on('matchInfoUpdate', ({ newMatchState }) => {
    console.log(`matchInfoUpdate: ${newMatchState}`);
    io.emit('matchInfoUpdate', ({ steamid, name }));
})

gameStateMonitor.on('playerStateUpdate', ({ playerStateWithoutHealth }) => {
    console.log(`playerStateUpdate: ${JSON.stringify(playerStateWithoutHealth)}`);
    io.emit('playerStateUpdate', playerStateWithoutHealth);
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