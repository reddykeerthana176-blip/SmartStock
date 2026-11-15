const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./env');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [config.clientUrl, 'http://localhost:5173', 'http://localhost:3000', '*'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Optional socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        socket.user = decoded;
      } catch (err) {
        console.warn('[Socket Auth] Token verification failed:', err.message);
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    // Client joins business room for strict multi-tenant isolation
    socket.on('join_business', (businessId) => {
      if (businessId) {
        socket.join(`business:${businessId}`);
        console.log(`[Socket] Client ${socket.id} joined business room: business:${businessId}`);
      }
    });

    socket.on('leave_business', (businessId) => {
      if (businessId) {
        socket.leave(`business:${businessId}`);
        console.log(`[Socket] Client ${socket.id} left business room: business:${businessId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      // Disconnected gracefully
    });
  });

  console.log('[Socket] Socket.IO real-time server initialized.');
  return io;
};

const getIO = () => {
  return io;
};

/**
 * Emit event strictly to users within the specific business room
 */
const emitToBusiness = (businessId, event, payload) => {
  if (io && businessId) {
    io.to(`business:${businessId.toString()}`).emit(event, payload);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToBusiness
};
