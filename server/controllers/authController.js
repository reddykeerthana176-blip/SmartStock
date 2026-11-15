const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Business = require('../models/Business');
const User = require('../models/User');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const config = require('../config/env');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAuditEvent } = require('../middleware/auditLogger');
const { executeTransaction } = require('../config/db');

/**
 * Register a new business and admin account
 */
const register = async (req, res, next) => {
  try {
    const { businessName, name, email, password, currency, phone } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return errorResponse(res, 409, 'An account with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await executeTransaction(async (session) => {
      // 1. Create Business
      const [business] = await Business.create(
        [
          {
            name: businessName,
            email: email.toLowerCase(),
            phone: phone || '',
            currency: currency || 'USD',
          },
        ],
        { session }
      );

      // 2. Create Admin User
      const [user] = await User.create(
        [
          {
            businessId: business._id,
            name,
            email: email.toLowerCase(),
            passwordHash,
            role: 'ADMIN',
            status: 'ACTIVE',
            lastLogin: new Date(),
          },
        ],
        { session }
      );

      // 3. Create Default Categories
      await Category.create(
        [
          { businessId: business._id, name: 'Electronics', color: '#3B82F6' },
          { businessId: business._id, name: 'Apparel', color: '#10B981' },
          { businessId: business._id, name: 'Food & Beverage', color: '#F59E0B' },
          { businessId: business._id, name: 'General Merchandise', color: '#8B5CF6' },
        ],
        { session }
      );

      // 4. Create Default Supplier
      await Supplier.create(
        [
          {
            businessId: business._id,
            name: 'Primary Wholesale Distribution',
            contactPerson: 'Lead Account Rep',
            email: 'orders@primarywholesale.com',
            leadTimeDays: 5,
          },
        ],
        { session }
      );

      return { business, user };
    });

    const token = result.user.generateAuthToken();
    const refreshToken = result.user.generateRefreshToken();

    await logAuditEvent({
      businessId: result.business._id,
      user: result.user,
      action: 'BUSINESS_REGISTERED',
      entityType: 'BUSINESS',
      entityId: result.business._id,
      details: { businessName, adminEmail: email },
      req,
    });

    return successResponse(
      res,
      201,
      'Business and administrator account registered successfully',
      {
        token,
        refreshToken,
        user: {
          id: result.user._id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
        business: {
          id: result.business._id,
          name: result.business.name,
          currency: result.business.currency,
          taxRate: result.business.taxRate,
        },
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * User login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+passwordHash')
      .populate('businessId');

    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      return errorResponse(res, 403, 'Your account has been deactivated. Please contact your manager.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    user.lastLogin = new Date();
    await user.save();

    const token = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    await logAuditEvent({
      businessId: user.businessId._id,
      user,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user._id,
      details: { email: user.email },
      req,
    });

    return successResponse(res, 200, 'Login successful', {
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      business: {
        id: user.businessId._id,
        name: user.businessId.name,
        currency: user.businessId.currency,
        taxRate: user.businessId.taxRate,
        settings: user.businessId.settings,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get currently authenticated user and business profile
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('businessId');
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    return successResponse(res, 200, 'Profile retrieved', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: user.status,
        lastLogin: user.lastLogin,
      },
      business: user.businessId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout
 */
const logout = async (req, res) => {
  return successResponse(res, 200, 'Logged out successfully');
};

/**
 * Update business settings (Admin only)
 */
const updateBusinessSettings = async (req, res, next) => {
  try {
    const { name, phone, address, currency, taxRate, settings } = req.body;

    const business = await Business.findById(req.user.businessId);
    if (!business) {
      return errorResponse(res, 404, 'Business not found');
    }

    if (name) business.name = name;
    if (phone !== undefined) business.phone = phone;
    if (address) business.address = { ...business.address, ...address };
    if (currency) business.currency = currency.toUpperCase();
    if (taxRate !== undefined) business.taxRate = Number(taxRate);
    if (settings) business.settings = { ...business.settings, ...settings };

    await business.save();

    await logAuditEvent({
      businessId: business._id,
      user: req.user,
      action: 'SETTINGS_UPDATED',
      entityType: 'BUSINESS',
      entityId: business._id,
      details: { name, currency, taxRate },
      req,
    });

    return successResponse(res, 200, 'Business settings updated', business);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  updateBusinessSettings,
};
