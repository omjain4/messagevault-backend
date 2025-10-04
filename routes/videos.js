const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const videoController = require('../controllers/videoController');
const authMiddleware = require('../middleware/authMiddleware');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function (req, file, cb) {
    cb(null, 'video-' + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

router.get('/gallery', videoController.getGalleryVideos);
router.post('/upload', [authMiddleware, upload.single('video')], videoController.uploadVideo);

module.exports = router;