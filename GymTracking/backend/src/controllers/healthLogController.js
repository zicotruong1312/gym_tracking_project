const HealthLog = require('../models/HealthLog');
const User = require('../models/User');
const DailySummary = require('../models/DailySummary');
const { emitToUser } = require('../utils/socketHub');

const addWeightLog = async (req, res) => {
  try {
    const { value, date, notes } = req.body;
    
    if (!value || isNaN(value)) {
      return res.status(400).json({ message: 'Vui lòng cung cấp cân nặng hợp lệ' });
    }

    const logDate = date ? new Date(date) : new Date();

    const log = await HealthLog.create({
      userId: req.user._id,
      date: logDate,
      type: 'weight',
      value: Number(value),
      unit: 'kg',
      notes: notes || '',
    });

    // Update User's current weight
    await User.findByIdAndUpdate(req.user._id, {
      'measurements.weight': Number(value)
    });

    // Option: also update DailySummary for today if logDate is today
    const startOfDay = new Date(logDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    if (startOfDay.getTime() === today.getTime()) {
      await DailySummary.findOneAndUpdate(
        { userId: req.user._id, date: startOfDay },
        { weightKg: Number(value) },
        { upsert: true, new: true, runValidators: true }
      );
    }

    emitToUser(req.user._id, 'healthflow:update', { scope: 'health' });
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getWeightHistory = async (req, res) => {
  try {
    // Default to last 6 months or all time, let's fetch all for weight progress
    const logs = await HealthLog.find({
      userId: req.user._id,
      type: 'weight'
    }).sort({ date: 1 }); // Ascending order for chart

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addWeightLog, getWeightHistory };
