/**
 * Real-time event registration and handling
 */
const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    // Ping/Pong for latency tracking
    socket.on('client_ping', () => {
      socket.emit('server_pong', { timestamp: Date.now() });
    });
  });
};

module.exports = {
  registerSocketHandlers,
};
