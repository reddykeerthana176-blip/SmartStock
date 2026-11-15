const bcrypt = require('bcryptjs');
const User = require('../models/User');
const config = require('../config/env');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAuditEvent } = require('../middleware/auditLogger');

/**
 * Get staff members for the business (Admin only)
 */
const getStaffMembers = async (req, res, next) => {
  try {
    const staff = await User.find({ businessId: req.user.businessId })
      .select('-passwordHash -refreshTokenHash')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, 200, 'Staff members retrieved', staff);
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new staff member (Admin only)
 */
const createStaffMember = async (req, res, next) => {
  try {
    const { name, email, password, role = 'STAFF' } = req.body;
    const businessId = req.user.businessId;

    if (!name || !email || !password) {
      return errorResponse(res, 400, 'Name, email, and password are required');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return errorResponse(res, 409, 'An account with this email address already exists');
    }

    const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      businessId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: ['ADMIN', 'STAFF'].includes(role) ? role : 'STAFF',
      status: 'ACTIVE',
    });

    await logAuditEvent({
      businessId,
      user: req.user,
      action: 'STAFF_MEMBER_CREATED',
      entityType: 'USER',
      entityId: newUser._id,
      details: { staffName: newUser.name, staffEmail: newUser.email, role: newUser.role },
      req,
    });

    return successResponse(res, 201, 'Staff member added successfully', {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update staff member status or role (Admin only)
 */
const updateStaffMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, status } = req.body;
    const businessId = req.user.businessId;

    const staffMember = await User.findOne({ _id: id, businessId });
    if (!staffMember) {
      return errorResponse(res, 404, 'Staff member not found');
    }

    // Prevent admin from deactivating themselves
    if (id === req.user.id && status === 'INACTIVE') {
      return errorResponse(res, 400, 'You cannot deactivate your own administrative account');
    }

    if (name) staffMember.name = name.trim();
    if (role && ['ADMIN', 'STAFF'].includes(role)) staffMember.role = role;
    if (status && ['ACTIVE', 'INACTIVE'].includes(status)) staffMember.status = status;

    await staffMember.save();

    await logAuditEvent({
      businessId,
      user: req.user,
      action: 'STAFF_MEMBER_UPDATED',
      entityType: 'USER',
      entityId: staffMember._id,
      details: { staffName: staffMember.name, role: staffMember.role, status: staffMember.status },
      req,
    });

    return successResponse(res, 200, 'Staff member updated', {
      id: staffMember._id,
      name: staffMember.name,
      email: staffMember.email,
      role: staffMember.role,
      status: staffMember.status,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a staff member (Admin only)
 */
const deleteStaffMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    if (id === req.user.id) {
      return errorResponse(res, 400, 'You cannot delete your own administrative account');
    }

    const staffMember = await User.findOne({ _id: id, businessId });
    if (!staffMember) {
      return errorResponse(res, 404, 'Staff member not found');
    }

    await User.deleteOne({ _id: id, businessId });

    await logAuditEvent({
      businessId,
      user: req.user,
      action: 'STAFF_MEMBER_DELETED',
      entityType: 'USER',
      entityId: id,
      details: { staffName: staffMember.name, staffEmail: staffMember.email },
      req,
    });

    return successResponse(res, 200, 'Staff member removed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStaffMembers,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
};
