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

module.exports = router;
