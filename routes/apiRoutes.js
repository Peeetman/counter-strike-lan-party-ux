const express = require('express');
const router = express.Router();
const participantsConfigHandler = require('../myModules/ParticipantsConfigHandler');

// GET participant config
router.get('/getParticipantConfig', async (req, res) => {
    try {
        const participantConfig = await participantsConfigHandler.getConfigCache();
        res.json(participantConfig);
    } catch (error) {
        console.error('Failed to get participant config:', error);
        res.status(500).send('Server error occurred trying to retrieve participant config.');
    }
});

router.get('/reloadParticipantConfig', async (req, res) => {
    try {
        const participantConfig = await participantsConfigHandler.generateClientParticipantsConfig();
        res.json(participantConfig);
    } catch (error) {
        console.error('Failed to get participant config:', error);
        res.status(500).send('Server error occurred trying to retrieve participant config.');
    }
});

router.post('/updateParticipantMVP', async (req, res) => {
    try {
        // Assumes the updated config is sent in the request body
        const steamid = req.body.steamid;
        const gifFile = req.body.gifFile;
        const soundFile = req.body.soundFile;

        // Validate updatedConfig or apply any necessary transformations
        await participantsConfigHandler.updateParticipantMVPCache({steamid, gifFile, soundFile});
        // Optionally, return the updated config or a success message
        res.json({ message: 'Participant configuration updated successfully.' });
    } catch (error) {
        console.error('Failed to update participant config:', error);
        res.status(500).send('Server error occurred trying to update participant config.');
    }
});

module.exports = router;
