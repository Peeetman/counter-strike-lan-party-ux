const multer = require('multer');
const path = require('path');

// Set storage engine
const storage = multer.diskStorage({
    destination: function(req, file, callback) {
        // This will save files to 'public/media/player-content/<folderName>'
        // Ensure 'folderName' is passed correctly from the client
        const folderName = req.body.folderName;
        const uploadPath = path.join(global.__basedir, 'public', 'media', 'player-content', folderName);
        callback(null, uploadPath);
    },
    filename: function(req, file, callback) {
        // Keep the original file name
        callback(null, file.originalname);
    }
});

// Initialize multer with the defined storage engine
const upload = multer({ storage: storage });

module.exports = upload;
