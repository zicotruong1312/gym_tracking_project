const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const dailySummaryRoutes = require('./routes/dailySummaryRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const coachRoutes = require('./routes/coachRoutes');
const healthLogRoutes = require('./routes/healthLogRoutes');
const chatRoutes = require('./routes/chatRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const app = express();

app.use(express.json());
app.use(cors());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/daily-summaries', dailySummaryRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/health-logs', healthLogRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/recommendations', recommendationRoutes);
module.exports = app;