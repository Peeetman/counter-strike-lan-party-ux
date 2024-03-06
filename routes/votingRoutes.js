const path = require('path');
const express = require('express');
const router = express.Router();
const upload = require('../myModules/uploadHandler'); // Adjust path as necessary
const ParticipantsConfigHandler = require('../myModules/ParticipantsConfigHandler'); // Adjust path as necessary

// Serve a static HTML file for the /voting route
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/voting.html'));
});

module.exports = router;
