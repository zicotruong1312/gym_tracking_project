const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const app = require('./src/app.js');
const { initSocket } = require('./src/utils/socketHub');

connectDB();

const PORT = process.env.PORT || 5000;

const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: clientOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

initSocket(io);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.join(`user:${decoded.id}`);
    next();
  } catch (e) {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', () => {});

server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy trên port ${PORT} (HTTP + Socket.IO)`);
});
