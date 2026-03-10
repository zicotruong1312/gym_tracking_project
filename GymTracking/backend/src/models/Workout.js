const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  muscleGroup: { type: String, required: true }, // VD: Chest, Back, Legs
  exercises: [{
    name: String,
    sets: Number,
    reps: Number,
    weight: Number // Mức tạ (kg)
  }],
  physicalCondition: {
    energyLevel: { type: Number, min: 1, max: 10 },
    injuryNotes: { type: String } // Log lại các vấn đề như đau gối phải, lật cổ chân để né bài
  }
});

module.exports = mongoose.model('Workout', workoutSchema);