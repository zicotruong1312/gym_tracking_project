const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getClasses, getInstructors, getBrands, getClassesByInstructor, markClassViewed, addClassWatchSeconds, markClassLiked } = require('../controllers/coachController');

router.get('/classes', getClasses);
router.get('/classes/by-instructor/:instructorId', getClassesByInstructor);
router.get('/instructors', getInstructors);
router.get('/brands', getBrands);

// Engagement endpoints (global)
router.post('/classes/:classId/viewed', protect, markClassViewed);
router.post('/classes/:classId/watch', protect, addClassWatchSeconds);
router.post('/classes/:classId/like', protect, markClassLiked);

module.exports = router;

