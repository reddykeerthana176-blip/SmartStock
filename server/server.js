const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const { connectDB } = require('./config/db');
const { initSocket } = require('./config/socket');
const { registerSocketHandlers } = require('./sockets/socketHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const logger = require('./utils/logger');

const app = express();
const httpServer = http.createServer(app);

// Initialize Real-time Socket.IO Server
const io = initSocket(httpServer);
registerSocketHandlers(io);

// Security & Parsing Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://localhost:3000', '*'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Global API Rate Limiter
app.use('/api', apiLimiter);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'SmartStock Backend API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount Main API Router
app.use('/api', apiRoutes);

// Global Error Handler
app.use(errorHandler);

// Connect to MongoDB and start HTTP Server
const startServer = async () => {
  await connectDB();

  httpServer.listen(config.port, () => {
    logger.info(`[SmartStock Server] Active and listening on port ${config.port} in ${config.nodeEnv} mode`);
    console.log(`[SmartStock] Ready at http://localhost:${config.port}`);
  });
};

// If not being required by automated tests
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { app, httpServer };
