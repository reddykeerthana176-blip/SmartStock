const StockAlert = require('../models/StockAlert');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Get active alerts for the business
 */
const getAlerts = async (req, res, next) => {
  try {
    const { alertType, severity, isRead, limit = 50 } = req.query;
    const query = {
      businessId: req.user.businessId,
      isDismissed: false,
    };

    if (alertType && alertType !== 'ALL') {
      query.alertType = alertType;
    }

    if (severity && severity !== 'ALL') {
      query.severity = severity;
    }

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const alerts = await StockAlert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('productId', 'productName SKU currentStock minimumStock sellingPrice')
      .lean();

    const unreadCount = await StockAlert.countDocuments({
      businessId: req.user.businessId,
      isDismissed: false,
      isRead: false,
    });

    return successResponse(res, 200, 'Alerts fetched successfully', {
      alerts,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark alert as read
 */
const markAlertAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = await StockAlert.findOneAndUpdate(
      { _id: id, businessId: req.user.businessId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!alert) {
      return errorResponse(res, 404, 'Alert not found');
    }

    return successResponse(res, 200, 'Alert marked as read', alert);
  } catch (error) {
    next(error);
  }
};

/**
 * Dismiss an alert
 */
const dismissAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = await StockAlert.findOneAndUpdate(
      { _id: id, businessId: req.user.businessId },
      { isDismissed: true },
      { new: true }
    );

    if (!alert) {
      return errorResponse(res, 404, 'Alert not found');
    }

    return successResponse(res, 200, 'Alert dismissed');
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all alerts as read
 */
const markAllAsRead = async (req, res, next) => {
  try {
    await StockAlert.updateMany(
      { businessId: req.user.businessId, isDismissed: false, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return successResponse(res, 200, 'All alerts marked as read');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAlerts,
  markAlertAsRead,
  dismissAlert,
  markAllAsRead,
};
