const Workout = require('../models/Workout');
const Exercise = require('../models/Exercise');
const DailySummary = require('../models/DailySummary');
const { emitToUser } = require('../utils/socketHub');

// @desc    Lưu lịch sử tập luyện
// @route   POST /api/workouts
// @access  Private
exports.createWorkout = async (req, res) => {
    try {
        const {
            startedAt,
            endedAt,
            exercises,
            physicalCondition,
            totalDurationMinutes,
            muscleGroup
        } = req.body;

        const workout = new Workout({
            userId: req.user.id, // Lấy từ token qua middleware protect
            startedAt,
            endedAt,
            exercises,
            physicalCondition,
            totalDurationMinutes,
            muscleGroup,
            date: new Date()
        });

        // Tính lượng Calories tiêu thụ từ cơ sở dữ liệu bài tập
        let totalCalories = 0;
        if (exercises && exercises.length > 0) {
            for (let ex of exercises) {
                if (ex.exerciseId) {
                    const exerciseData = await Exercise.findById(ex.exerciseId);
                    const calPerSet = exerciseData?.caloriesPerSet || 15;
                    const setCount = ex.completedSets && ex.completedSets.length > 0
                        ? ex.completedSets.length
                        : (ex.sets || 1);
                    totalCalories += (calPerSet * setCount);
                } else {
                    // Exercise không có ID trong DB → dùng mức chuẩn 15 kcal/set
                    const setCount = ex.completedSets && ex.completedSets.length > 0
                        ? ex.completedSets.length
                        : (ex.sets || 1);
                    totalCalories += (15 * setCount);
                }
            }
        }
        // Bổ sung calo từ thời gian tập thực tế (6 kcal/phút) nếu có
        if (totalDurationMinutes && totalDurationMinutes > 0) {
            const durationCals = totalDurationMinutes * 6;
            // Lấy max giữa 2 phương pháp (tránh undercount khi duration dài)
            totalCalories = Math.max(totalCalories, durationCals);
        }
        // Đảm bảo mỗi buổi tập đều ghi ít nhất 30 kcal
        if (totalCalories < 30) totalCalories = 30;


        workout.caloriesBurned = totalCalories;
        const savedWorkout = await workout.save();

        // Tích hợp hệ thống DailySummary: cộng dồn số Calo đốt được vào ngày hôm nay
        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);
        let summary = await DailySummary.findOne({
            userId: req.user.id,
            date: todayObj
        });

        if (!summary) summary = new DailySummary({ userId: req.user.id, date: todayObj });

        summary.caloriesBurned = (summary.caloriesBurned || 0) + totalCalories;
        summary.exercisedToday = true;
        await summary.save();

        emitToUser(req.user._id, 'healthflow:update', { scope: 'workout' });
        res.status(201).json({ success: true, data: savedWorkout, caloriesBurned: totalCalories });
    } catch (error) {
        console.error('Lỗi khi tạo workout:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lưu bài tập' });
    }
};

// @desc    Lấy lịch sử tập luyện của user
// @route   GET /api/workouts/history
// @access  Private
exports.getWorkoutsHistory = async (req, res) => {
    try {
        const workouts = await Workout.find({ userId: req.user.id })
            .sort({ date: -1 }) // Mới nhất lên trước
            .populate('exercises.exerciseId', 'name imageUrl videoUrl') // Populate info từ bảng Exercise nếu cần
            .exec();

        res.status(200).json({ success: true, count: workouts.length, data: workouts });
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử workout:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy lịch sử bài tập' });
    }
};

// @desc    Lấy danh sách các bài tập (Exercise)
// @route   GET /api/workouts/exercises
// @access  Private
exports.getExercises = async (req, res) => {
    try {
        const filters = { isActive: true }; // Chỉ lấy các bài tập đang kích hoạt

        // Hỗ trợ lọc theo múi cơ hoặc loại bài tập
        if (req.query.muscleGroup) {
            filters.muscleGroup = req.query.muscleGroup;
        }
        if (req.query.type) {
            filters.type = req.query.type;
        }

        const exercises = await Exercise.find(filters).sort({ sortOrder: 1, name: 1 });
        res.status(200).json({ success: true, count: exercises.length, data: exercises });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách bài tập:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách bài tập' });
    }
};
