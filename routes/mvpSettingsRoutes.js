const path = require('path');
const express = require('express');
const router = express.Router();
const upload = require('../myModules/uploadHandler'); // Adjust path as necessary
const ParticipantsConfigHandler = require('../myModules/ParticipantsConfigHandler'); // Adjust path as necessary

// Serve a static HTML file for the /mvpsettings route
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/mvpsettings.html'));
});

router.post('/upload', (req, res) => {
    const uploadFiles = upload.array('files');
    uploadFiles(req, res, async (error) => {
        if (error) {
            // This will catch errors thrown by Multer including file filter validation errors
            console.error('Multer error during file upload:', error);
            return res.status(500).json({ error: error.message });
        }
        try {
            // Handle file upload post-processing here
            const participantsConfig = await ParticipantsConfigHandler.generateClientParticipantsConfig();
            await ParticipantsConfigHandler.saveConfig(participantsConfig);
            res.json({ message: 'Files uploaded successfully' });
        } catch (error) {
            // This will catch errors thrown after files have been uploaded successfully
            console.error('Error during file upload post-processing:', error);
            res.status(500).json({ error: 'Error uploading files' });
        }
    });
});

module.exports = router;
