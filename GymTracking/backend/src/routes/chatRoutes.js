const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { chat } = require('../controllers/chatController');

router.post('/message', protect, chat);

module.exports = router;
