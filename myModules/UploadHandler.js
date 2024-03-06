const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function(req, file, callback) {
        let folderName = req.body.folderName;
        if (!folderName) {
            return callback(new Error('Folder name is undefined'), null);
        }
        let uploadPath = path.join(global.__basedir, 'public', 'media', 'player-content', folderName);
        console.log(uploadPath);
        callback(null, uploadPath);
    },
    filename: function(req, file, callback) {
        callback(null, file.originalname);
    }
});

// Initialize multer with the defined storage engine
const upload = multer({ storage: storage });

module.exports = upload;
