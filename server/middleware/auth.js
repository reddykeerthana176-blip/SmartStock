const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Protect routes: verify JWT Bearer token and populate req.user
 */
const protect = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return errorResponse(res, 401, 'Authentication required. Please log in.');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 401, 'Token expired. Please refresh your session.');
      }
      return errorResponse(res, 401, 'Invalid authentication token.');
    }

    // Attach basic claims immediately for low latency
    req.user = {
      id: decoded.id,
      businessId: decoded.businessId,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email,
    };

    // Optionally verify user is active
    const currentUser = await User.findById(decoded.id).select('status role businessId name email');
    if (!currentUser) {
      return errorResponse(res, 401, 'The account belonging to this token no longer exists.');
    }

    if (currentUser.status !== 'ACTIVE') {
      return errorResponse(res, 403, 'Your account has been deactivated. Please contact your administrator.');
    }

    // Ensure businessId matches
    req.user.businessId = currentUser.businessId;
    req.user.role = currentUser.role;

    next();
  } catch (error) {
    return errorResponse(res, 500, 'Authentication error', error.message);
  }
};

module.exports = {
  protect,
};
