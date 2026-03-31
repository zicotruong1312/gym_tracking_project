const CoachClass = require('../models/CoachClass');
const Instructor = require('../models/Instructor');
const Brand = require('../models/Brand');

const getClasses = async (req, res) => {
  try {
    const classes = await CoachClass.find().sort({ createdAt: -1 });
    res.json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getInstructors = async (req, res) => {
  try {
    const instructors = await Instructor.find().sort({ createdAt: -1 });
    res.json({ success: true, data: instructors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find().sort({ createdAt: -1 });
    res.json({ success: true, data: brands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getClassesByInstructor = async (req, res) => {
  try {
    const { instructorId } = req.params;
    const classes = await CoachClass.find({ instructorId }).sort({ createdAt: -1 });
    res.json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markClassViewed = async (req, res) => {
  try {
    const { classId } = req.params;
    if (!classId) return res.status(400).json({ success: false, message: 'Missing classId' });

    const updated = await CoachClass.findByIdAndUpdate(
      classId,
      { $inc: { viewsCount: 1 } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ success: false, message: 'Class not found' });
    return res.json({ success: true, data: { viewsCount: updated.viewsCount } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const addClassWatchSeconds = async (req, res) => {
  try {
    const { classId } = req.params;
    const secondsRaw = req.body?.seconds;
    const seconds = Math.max(0, Math.min(24 * 60 * 60, Number(secondsRaw)));

    if (!classId) return res.status(400).json({ success: false, message: 'Missing classId' });
    if (!Number.isFinite(seconds)) return res.status(400).json({ success: false, message: 'Invalid seconds' });

    if (seconds === 0) return res.json({ success: true, data: { ok: true } });

    const updated = await CoachClass.findByIdAndUpdate(
      classId,
      { $inc: { totalWatchSeconds: seconds, watchEvents: 1 } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ success: false, message: 'Class not found' });
    return res.json({ success: true, data: { totalWatchSeconds: updated.totalWatchSeconds } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const markClassLiked = async (req, res) => {
  try {
    const { classId } = req.params;
    if (!classId) return res.status(400).json({ success: false, message: 'Missing classId' });

    const updated = await CoachClass.findByIdAndUpdate(
      classId,
      { $inc: { likesCount: 1 } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ success: false, message: 'Class not found' });
    return res.json({ success: true, data: { likesCount: updated.likesCount } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getClasses,
  getInstructors,
  getBrands,
  getClassesByInstructor,
  markClassViewed,
  addClassWatchSeconds,
  markClassLiked,
};

