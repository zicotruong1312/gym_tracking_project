let ioInstance = null;

function initSocket(io) {
  ioInstance = io;
}

function emitToUser(userId, event, payload) {
  if (!ioInstance || userId == null) return;
  const id = String(userId);
  ioInstance.to(`user:${id}`).emit(event, payload);
}

module.exports = { initSocket, emitToUser };
