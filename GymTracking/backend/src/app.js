const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
// const workoutRoutes = require('./routes/workoutRoutes');
// const nutritionRoutes = require('./routes/nutritionRoutes');

const app = express();

// Middlewares
app.use(express.json()); // Cho phép đọc dữ liệu JSON gửi lên
app.use(cors());

// Routes
app.use('/api/users', userRoutes);
// app.use('/api/workouts', workoutRoutes);
// app.use('/api/nutrition', nutritionRoutes);

module.exports = app;