const User = require('../models/User');

const createOrUpdateUser = async (req, res) => {
  try {
    const userData = req.body;
    
    // Tạo user mới. Nhờ hàm pre('save') ở Model, BMR và TDEE sẽ tự động được tính
    const newUser = new User(userData);
    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Đã lưu thông tin, hệ thống đã tự động tính toán TDEE!',
      data: newUser
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = { createOrUpdateUser };