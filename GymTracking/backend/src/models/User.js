const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female'], required: true },
  age: { type: Number, required: true },
  measurements: {
    weight: { type: Number, required: true }, // kg
    height: { type: Number, required: true }, // cm
    waist: { type: Number }, // cm - Dùng để track tiến độ cắt mỡ
  },
  activityLevel: { type: Number, default: 1.55 }, // Mức độ vận động
  goals: {
    targetType: { type: String, enum: ['cut', 'bulk', 'maintain'], default: 'cut' },
    targetWeight: Number,
    durationMonths: { type: Number, default: 3 } // Deadline mục tiêu
  },
  autoStats: {
    bmr: Number,
    tdee: Number
  }
}, { timestamps: true });

// TỰ ĐỘNG HÓA: Mongoose Middleware tự tính BMR và TDEE trước khi lưu vào DB
userSchema.pre('save', function(next) {
  // Công thức Mifflin-St Jeor
  let bmrCalc = (10 * this.measurements.weight) + (6.25 * this.measurements.height) - (5 * this.age);
  bmrCalc = this.gender === 'male' ? bmrCalc + 5 : bmrCalc - 161;
  
  this.autoStats.bmr = Math.round(bmrCalc);
  this.autoStats.tdee = Math.round(bmrCalc * this.activityLevel);
  next();
});

module.exports = mongoose.model('User', userSchema);