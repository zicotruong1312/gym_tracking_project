const mongoose = require('mongoose');

const nutritionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  foodItem: { type: String, required: true },
  mealType: { 
    type: String, 
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Pre-workout', 'Post-workout', 'Snack'],
    required: true // Bắt buộc phân loại, đặc biệt là bữa Pre-workout nạp năng lượng trước khi đẩy tạ
  },
  macros: {
    calories: { type: Number, required: true },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 }
  }
});

module.exports = mongoose.model('Nutrition', nutritionSchema);