// ParticipantsConfigHandler.js
const fsPromises = require('fs').promises;
const path = require('path');

const configPath = path.join(global.__basedir, 'data', 'participants.json');
const playerContentBasePath = path.join(global.__basedir, 'public', 'media', 'player-content');
const publicContentBasepath = './media/player-content';

async function getConfig() {
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

function generateRandomMVP(gifFiles, soundFiles) {
    // Function to get a random item from an array
    const getRandomItem = (items) => items[Math.floor(Math.random() * items.length)];

    // Randomly select one GIF and one sound file
    const randomGif = gifFiles.length > 0 ? getRandomItem(gifFiles) : null;
    const randomSoundFile = soundFiles.length > 0 ? getRandomItem(soundFiles) : null;

    // Return an object with the paths to the randomly selected files
    return {
        gif: randomGif,
        soundFile: randomSoundFile
    };
}

async function generateClientParticipantsConfig() {
    let participantsConfig = await getConfig();

    try {
        for (const steamid of Object.keys(participantsConfig)) {
            const folderName = participantsConfig[steamid].folder;
            try {
                const files = await fsPromises.readdir(path.join(playerContentBasePath, folderName));

                const imageExtensions = ['.png', '.jpg', '.jpeg'];
                const soundFileExtensions = ['.mp3'];
                const gifFileExtensions = ['.gif'];

                // Process images
                const imageFilePaths = files.filter(imageFile => imageExtensions.some(ext => imageFile.endsWith(ext)))
                                            .map(imageFile => `${publicContentBasepath}/${folderName}/${imageFile}`);
                participantsConfig[steamid].avatars = imageFilePaths.length > 0 ? imageFilePaths : [`${publicContentBasepath}/placeholder.png`];

                // Process sound files
                const soundFiles = files.filter(soundFile => soundFileExtensions.some(ext => soundFile.endsWith(ext)))
                                            .map(soundFile => `${publicContentBasepath}/${folderName}/${soundFile}`);
                if(soundFiles.length > 0) participantsConfig[steamid].mp3s = soundFiles;

                // Process GIFs
                const gifFiles = files.filter(gifFile => gifFileExtensions.some(ext => gifFile.endsWith(ext)))
                                         .map(gifFile => `${publicContentBasepath}/${folderName}/${gifFile}`);
                if(gifFiles.length > 0) participantsConfig[steamid].gifs = gifFiles;

                //Generate Random MVP Object for now
                if(gifFiles.length > 0 && soundFiles.length > 0) {
                    participantsConfig[steamid].mvp = generateRandomMVP(gifFiles, soundFiles);
                    participantsConfig[steamid].mvp.random = true;
                }

            } catch (err) {
                console.error('Error reading or processing files for player:', folderName, err);
            }
        }
    } catch (err) {
        console.error('Error reading or processing participants config file:', err);
    }
    console.log('ParticipantsConfig reloaded');
    return participantsConfig;
}

module.exports = {
    generateClientParticipantsConfig,
    getConfig,
    saveConfig,
};