const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getTodayRecommendations } = require('../controllers/recommendationController');

router.get('/today', protect, getTodayRecommendations);

module.exports = router;
