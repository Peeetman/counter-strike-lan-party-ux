// ParticipantsConfigHandler.js
const fsPromises = require('fs').promises;
const path = require('path');

const configPath = path.join(global.__basedir, 'data', 'participants.json');
const playerContentBasePath = path.join(global.__basedir, 'public', 'media', 'player-content');
const publicContentBasepath = './media/player-content';

global.participantsConfigCache = {};

async function getConfigCache() {
    if (Object.keys(participantsConfigCache).length <= 0) {
        const loaded = await loadConfig();
        setConfigCache(loaded);
    }
    return participantsConfigCache;
}

function setConfigCache(config) {
    participantsConfigCache = config;
    return true;
}

function getBeerCount(steamid) {
    if(participantsConfigCache[steamid]) return participantsConfigCache[steamid].beers;
    else return false;
}

async function updateBeerCount(steamid, action){
    if(action === 'increment'){
        participantsConfigCache[steamid].beers += 1;
        setConfigCache(participantsConfigCache)
    } else if (action === 'decrement'){
        if (participantsConfigCache[steamid].beers != 0){
            participantsConfigCache[steamid].beers -= 1;
            setConfigCache(participantsConfigCache)
        }
    }
}

function getNadeDeaths(steamid) {
    if(participantsConfigCache[steamid]) return participantsConfigCache[steamid].nadeDeaths;
    else return false;
}

async function updateNadeDeaths(steamid, action){
    if(action === 'increment'){
        participantsConfigCache[steamid].nadeDeaths += 1;
        setConfigCache(participantsConfigCache)
    } else if (action === 'decrement'){
        if (participantsConfigCache[steamid].nadeDeaths != 0){
            participantsConfigCache[steamid].nadeDeaths -= 1;
            setConfigCache(participantsConfigCache)
        }
    }
}

async function loadConfig() {
    try {
        const data = await fsPromises.readFile(configPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading participants config:', err);
        throw new Error('Failed to read participants configuration.');
    }
}

async function saveConfig(config) {
    try {
        const data = JSON.stringify(config, null, 2); // Pretty-print the JSON
        await fsPromises.writeFile(configPath, data, 'utf8');
        console.log('Participants configuration saved successfully.');
    } catch (err) {
        console.error('Error saving participants config:', err);
        throw new Error('Failed to save participants configuration.');
    }
}

async function generateClientParticipantsConfig() {
    let participantsConfig = await loadConfig();

    try {
        for (const steamid of Object.keys(participantsConfig)) {
            const folderName = participantsConfig[steamid].folder;
            try {
                const files = await fsPromises.readdir(path.join(playerContentBasePath, folderName));

                const imageExtensions = ['.png', '.jpg', '.jpeg'];
                const soundFileExtensions = ['.mp3'];
                const gifFileExtensions = ['.gif'];

                // Process images
                const imageFiles = files.filter(imageFile => imageExtensions.some(ext => imageFile.endsWith(ext)))
                                            .map(imageFile => `${publicContentBasepath}/${folderName}/${imageFile}`);
                participantsConfig[steamid].images = imageFiles.length > 0 ? imageFiles : [`${publicContentBasepath}/placeholder.png`];

                // Process sound files
                const soundFiles = files.filter(soundFile => soundFileExtensions.some(ext => soundFile.endsWith(ext)))
                                            .map(soundFile => `${publicContentBasepath}/${folderName}/${soundFile}`);
                if(soundFiles.length > 0) participantsConfig[steamid].mp3 = soundFiles[0];
                else delete participantsConfig[steamid].mp3;

                // Process GIFs
                const gifFiles = files.filter(gifFile => gifFileExtensions.some(ext => gifFile.endsWith(ext)))
                                         .map(gifFile => `${publicContentBasepath}/${folderName}/${gifFile}`);
                if(gifFiles.length > 0) participantsConfig[steamid].gif = gifFiles[0];
                else delete participantsConfig[steamid].gif;

                //Set Avatar to first image for now
                if(imageFiles.length > 0) participantsConfig[steamid].avatar = imageFiles[0];
                else participantsConfig[steamid].avatar = `${publicContentBasepath}/placeholder.png`;

            } catch (err) {
                console.error('Error reading or processing files for player:', folderName, err);
            }
        }
    } catch (err) {
        console.error('Error reading or processing participants config file:', err);
    }
    console.log('ParticipantsConfig reloaded');
    setConfigCache(participantsConfig);
    await saveConfig(participantsConfig);
    return participantsConfig;
}

module.exports = {
    generateClientParticipantsConfig,
    loadConfig,
    saveConfig,
    getConfigCache,
    setConfigCache,
    getBeerCount,
    updateBeerCount,
    updateNadeDeaths,
    getNadeDeaths
};