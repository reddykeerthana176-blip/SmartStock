const AuditLog = require('../models/AuditLog');

/**
 * Log significant business events
 */
const logAuditEvent = async ({
  businessId,
  user,
  action,
  entityType,
  entityId,
  details = {},
  req = null,
}) => {
  try {
    const ipAddress = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers['user-agent'] || '';

    await AuditLog.create({
      businessId,
      userId: user?._id || user?.id || null,
      userName: user?.name || 'System',
      userRole: user?.role || 'SYSTEM',
      action,
      entityType,
      entityId: entityId ? entityId.toString() : '',
      details,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error('[Audit Logger Error] Failed to write audit log:', error.message);
  }
};

module.exports = {
  logAuditEvent,
};
