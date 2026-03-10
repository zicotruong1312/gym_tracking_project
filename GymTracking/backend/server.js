require('dotenv').config();
const connectDB = require('./src/config/db');
const app = require('./src/app.js');

// Kết nối Database
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy ngon lành trên port ${PORT}`);
});