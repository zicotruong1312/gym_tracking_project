const mongoose = require('mongoose');

const coachClassSchema = new mongoose.Schema({
  title: { type: String, required: true },
  duration: { type: String, required: true }, // e.g., '20 min'
  type: { type: String, required: true },     // e.g., 'Workout', 'Yoga', 'Mindfulness'
  category: { type: String, required: true }, // e.g., 'mobility', 'cardio', 'strength'
  section: { type: String, required: true },  // e.g., 'Peloton', 'Sleep', 'Stress', 'Fitness'
  image: { type: String, required: true },
  videoUrl: { type: String, default: '' },
  instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', default: null },
  // Engagement (global across users)
  viewsCount: { type: Number, default: 0 },
  likesCount: { type: Number, default: 0 },
  totalWatchSeconds: { type: Number, default: 0 },
  watchEvents: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('CoachClass', coachClassSchema);
