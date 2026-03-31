const DailySummary = require('../models/DailySummary');
const { emitToUser } = require('../utils/socketHub');

const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const getToday = async (req, res) => {
  try {
    const today = getStartOfDay(new Date());
    let summary = await DailySummary.findOne({ userId: req.user._id, date: today });
    if (!summary) {
      summary = await DailySummary.create({
        userId: req.user._id,
        date: today,
        waterMl: 0,
        caloriesConsumed: 0,
        caloriesBurned: 0,
        exercisedToday: false,
      });
    }
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateToday = async (req, res) => {
  try {
    const today = getStartOfDay(new Date());
    const allowed = ['waterMl', 'caloriesConsumed', 'caloriesBurned', 'sleepMinutes', 'sleepStart', 'sleepEnd', 'exercisedToday', 'mindfulMinutes', 'weightKg', 'glucoseMgDl', 'glucoseConsumed'];
    const updates = { userId: req.user._id, date: today };
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });
    const summary = await DailySummary.findOneAndUpdate(
      { userId: req.user._id, date: today },
      updates,
      { new: true, upsert: true, runValidators: true }
    );
    emitToUser(req.user._id, 'healthflow:update', { scope: 'dailySummary' });
    res.json(summary);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const { from, to, days } = req.query;
    let start = getStartOfDay(new Date());
    let end = getStartOfDay(new Date());
    if (days && Number(days) > 0) {
      const n = Math.min(Number(days), 90);
      start.setUTCDate(start.getUTCDate() - n + 1);
    } else if (from && to) {
      start = getStartOfDay(new Date(from));
      end = getStartOfDay(new Date(to));
    } else {
      start.setUTCDate(start.getUTCDate() - 6);
    }
    const summaries = await DailySummary.find({
      userId: req.user._id,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });
    res.json(summaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getToday, updateToday, getHistory };
