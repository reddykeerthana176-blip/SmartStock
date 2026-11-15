const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file or fallback to root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smartstock',
  mongoMaxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '50', 10),
  mongoMinPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '10', 10),
  jwtSecret: process.env.JWT_SECRET || 'smartstock_dev_jwt_secret_key_super_secure_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'smartstock_dev_refresh_secret_key_2026',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
  maxProductsPerBusiness: parseInt(process.env.MAX_PRODUCTS_PER_BUSINESS || '100000', 10),
  defaultSafetyStockDays: parseInt(process.env.DEFAULT_SAFETY_STOCK_DAYS || '7', 10),
  defaultLeadTimeDays: parseInt(process.env.DEFAULT_LEAD_TIME_DAYS || '5', 10),
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  }
};

module.exports = config;
