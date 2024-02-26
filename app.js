// Dashboard
const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;

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

// Participant Config with player-image paths and mvp presets
let participantsConfig = {}
const playerAvatarBasePath = './media/player-content'
async function loadParticipantsConfig() {
    try {
        const configPath = path.join(__dirname, 'participants.json');
        const data = await fsPromises.readFile(configPath, 'utf8');
        participantsConfig = JSON.parse(data);

        for (const steamid of Object.keys(participantsConfig)) {
            //Player Images
            const folderName = participantsConfig[steamid].folder;
            try {
                const files = await fsPromises.readdir(path.join(__dirname, 'public', 'media', 'player-content', folderName));
                // Map Immages
                // List of common image file extensions
                const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
                // Filter files by checking if their extension matches any in the list, then map to full paths
                const imageFilePaths = files.filter(file => 
                                            imageExtensions.some(ext => file.endsWith(ext)))
                                            .map(file => `${playerAvatarBasePath}/${folderName}/${file}`);
                participantsConfig[steamid].playerImages = imageFilePaths;

                // MVP Soundfile Src
                // List of common image file extensions
                const soundFileExtensions = ['.mp3', '.wav', '.ogg'];
                // Filter files by checking if their extension matches any in the list, then map to full paths
                const soundFilePaths = files.filter(file => 
                                            soundFileExtensions.some(ext => file.endsWith(ext)))
                                            .map(file => `${playerAvatarBasePath}/${folderName}/${file}`);
                
                // MVP Background Gif Src
                // List of common gif
                const gifFileExtensions = ['.gif'];
                // Filter files by checking if their extension matches any in the list, then map to full paths
                const gifFilePath = files.filter(file => 
                                            gifFileExtensions.some(ext => file.endsWith(ext)))
                                            .map(file => `${playerAvatarBasePath}/${folderName}/${file}`);

                // Crate mvp.soundFileSrc or mvp.backgroundGifSrc if present
                if(soundFilePaths.length > 0 || gifFilePath.length > 0) {
                    participantsConfig[steamid].mvp = {}
                    if(soundFilePaths.length > 0) participantsConfig[steamid].mvp.soundFileSrc = soundFilePaths[0]
                    if(gifFilePath.length > 0) participantsConfig[steamid].mvp.backgroundGifSrc = gifFilePath[0]
                }
            } catch (err) {
                console.error('Error reading or processing player config file:', err);
            }
        } 
    } catch (err) {
        console.error('Error reading or processing player config file:', err);
    }
    console.log('Server: ParticipantsConfig reloaded');
    console.log(participantsConfig)
    return participantsConfig;
}

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
    const eventText = `Player with ID [${steamid}] and Name [${name}] has died.`;
    console.log('Server: ' + eventText);
    io.emit('playerDeath', ({ steamid, name }));
})

gameStateMonitor.on('playerDeathWithGrenade', ({ steamid, name }) => {
    const eventText = `Player with ID [${steamid}] and Name [${name}] died with a grenade in the hand.`
    console.log('Server: ' + eventText);
    const eventTextAlt = `${name} died with a grenade in the hand. noob!`;
    io.emit('eventText', eventTextAlt);
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

//Dashboard Server
io.on('connection', async (socket) => {
    console.log(`SOCKET IO: Client connected: ${socket.id}`);
    
    // Client Connect Trigger Datasending
    gameStateMonitor.emitModifiedPlayerStateOnChange();
    gameStateMonitor.emitCurrentMatchState();

    participantsConfig = await loadParticipantsConfig();
    io.emit('sendParticipantsConfig', ({ participantsConfig }));

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
participantsConfig = loadParticipantsConfig();

server.listen(8080, () => {
    console.log('Dashboard Server Running on port 3001');
});