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
        // Ensure the directory exists
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log(uploadPath);
        callback(null, uploadPath);
    },
    filename: function(req, file, callback) {
        const uploadPath = path.join(global.__basedir, 'public', 'media', 'player-content', req.body.folderName);

        // Determine file type and pattern for deletion
        const fileType = path.extname(file.originalname).toLowerCase();
        const filePattern = fileType === '.mp3' ? /\.mp3$/ : /\.gif$/;

        // Delete existing files of the same type
        fs.readdir(uploadPath, (err, files) => {
            if (err) {
                console.error('Could not list the directory.', err);
                return callback(err);
            }

            files.forEach(existingFile => {
                if (filePattern.test(path.extname(existingFile).toLowerCase())) {
                    // If the existing file is of the same type, delete it
                    fs.unlink(path.join(uploadPath, existingFile), unlinkErr => {
                        if (unlinkErr) {
                            console.error('Could not delete existing file', existingFile, unlinkErr);
                            return callback(unlinkErr);
                        }
                        console.log('Deleted existing file:', existingFile);
                    });
                }
            });

            // Proceed with saving the new file
            callback(null, file.originalname);
        });
    }
});


// File filter function
const fileFilter = (req, file, cb) => {
    // Allowed ext
    const filetypes = /\.(mp3|gif)$/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = file.mimetype === 'audio/mpeg' || file.mimetype === 'image/gif';

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Files must be either MP3 or GIF!'));
    }
};

// Initialize multer with the defined storage engine and file filter
const upload = multer({ 
    storage: storage, 
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 10 } // Example: limit file size to 10MB
});

module.exports = upload;
