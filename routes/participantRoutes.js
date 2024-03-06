const path = require('path');
const express = require('express');
const router = express.Router();
const upload = require('../myModules/uploadHandler'); // Adjust path as necessary
const ParticipantsConfigHandler = require('../myModules/ParticipantsConfigHandler'); // Adjust path as necessary

// Serve a static HTML file for the /participants route
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/participants.html'));
});

// Define the POST /upload endpoint under /participants
router.post('/upload', upload.array('files'), async (req, res) => {
    try {
        // Handle file upload post-processing here
        const participantsConfig = await ParticipantsConfigHandler.generateClientParticipantsConfig();
        await ParticipantsConfigHandler.saveConfig(participantsConfig);
        // Send a JSON response
        res.json({ message: 'Files uploaded successfully' });
    } catch (error) {
        console.error('Error during file upload:', error);
        res.status(500).json({ error: 'Error uploading files' });
    }
});

module.exports = router;
