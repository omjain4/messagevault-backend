const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/inbox', authMiddleware, messageController.getInbox);
router.post('/', authMiddleware, messageController.sendMessage);
router.put('/:id/read', authMiddleware, messageController.markAsRead);

module.exports = router;