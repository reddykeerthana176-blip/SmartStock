const { errorResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Global Centralized Express Error Handler
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field '${err.path}': '${err.value}'`;
  }

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((val) => val.message);
  }

  // Handle MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicatedKeys = Object.keys(err.keyValue || {});
    const key = duplicatedKeys[0] || 'field';
    const value = err.keyValue ? err.keyValue[key] : '';
    message = `Duplicate value '${value}' for unique field '${key}'. Please use a different value.`;
    details = { field: key, value };
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
  }

  // Structured Logging
  logger.error(`[API Error] ${req.method} ${req.originalUrl} - ${statusCode} ${message}`, err, {
    url: req.originalUrl,
    method: req.method,
    statusCode,
    userId: req.user?.id,
  });

  return errorResponse(res, statusCode, message, details);
};

module.exports = errorHandler;
