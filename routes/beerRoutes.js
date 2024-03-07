const path = require('path');
const express = require('express');
const router = express.Router();

// Serve a static HTML file for the /mvpsettings route
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/beer.html'));
});

module.exports = router;
