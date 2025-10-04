const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:username', profileController.getProfile);
router.put('/', authMiddleware, profileController.updateProfile);
router.post('/:profileOwnerId/comments', authMiddleware, profileController.postComment);

module.exports = router;