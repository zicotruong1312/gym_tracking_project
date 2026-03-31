const Nutrition = require('../models/Nutrition');
const FoodItem = require('../models/FoodItem');
const { emitToUser } = require('../utils/socketHub');

// @desc    Lấy danh sách món ăn từ database chuẩn
// @route   GET /api/nutrition/foods
// @access  Private
exports.getFoods = async (req, res) => {
  try {
    let filter = {};
    if (req.query.q) {
      filter.name = { $regex: req.query.q, $options: 'i' };
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    const foods = await FoodItem.find(filter).sort({ category: 1, name: 1 });
    res.status(200).json({ success: true, data: foods });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách món ăn:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// @desc    Tạo món ăn mới vào database chuẩn
// @route   POST /api/nutrition/foods
// @access  Private
exports.createFood = async (req, res) => {
  try {
    const { name, calories, protein, carbs, fat, category } = req.body;
    const newFood = new FoodItem({
      name,
      calories,
      protein: protein || 0,
      carbs: carbs || 0,
      fat: fat || 0,
      category: category || 'Cá nhân'
    });
    await newFood.save();
    res.status(201).json({ success: true, data: newFood });
  } catch (error) {
    console.error('Lỗi khi tạo món ăn mới:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// @desc    Thêm bữa ăn (lưu calo, macro...)
// @route   POST /api/nutrition
// @access  Private
exports.addMeal = async (req, res) => {
  try {
    const { foodItem, mealType, macros, quantity, unit, date } = req.body;

    const nutrition = new Nutrition({
      userId: req.user.id,
      foodItem,
      mealType,
      macros,
      quantity,
      unit,
      date: date || new Date()
    });

    const savedNutrition = await nutrition.save();
    emitToUser(req.user._id, 'healthflow:update', { scope: 'nutrition' });
    res.status(201).json({ success: true, data: savedNutrition });
  } catch (error) {
    console.error('Lỗi khi thêm bữa ăn:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi thêm bữa ăn' });
  }
};

// @desc    Lấy lịch sử ăn uống
// @route   GET /api/nutrition/history
// @access  Private
exports.getNutritionHistory = async (req, res) => {
  try {
    let filter = { userId: req.user.id };

    if (req.query.startDate && req.query.endDate) {
      // Tìm từ đầu ngày startDate đến cuối ngày endDate
      filter.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(`${req.query.endDate}T23:59:59.999Z`)
      };
    } else if (req.query.date) {
      // Giữ lại logic cũ cho 1 ngày
      const queryDate = new Date(req.query.date);
      const nextDate = new Date(queryDate);
      nextDate.setDate(nextDate.getDate() + 1);

      filter.date = {
        $gte: queryDate,
        $lt: nextDate
      };
    }

    const history = await Nutrition.find(filter).sort({ date: -1 });
    res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử dinh dưỡng:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy lịch sử dinh dưỡng' });
  }
};

// @desc    Xóa bữa ăn
// @route   DELETE /api/nutrition/:id
// @access  Private
exports.deleteMeal = async (req, res) => {
  try {
    const meal = await Nutrition.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!meal) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bữa ăn' });
    }
    emitToUser(req.user._id, 'healthflow:update', { scope: 'nutrition' });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error('Lỗi khi xóa bữa ăn:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi xóa bữa ăn' });
  }
};
