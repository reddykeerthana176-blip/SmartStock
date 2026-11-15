const StockAlert = require('../models/StockAlert');
const { emitToBusiness } = require('../config/socket');
const logger = require('../utils/logger');

/**
 * Intelligent Alert Engine
 * Evaluates stock thresholds and generates deduplicated alerts
 */
const checkAndGenerateAlerts = async (product, businessId) => {
  try {
    const currentStock = product.currentStock;
    const minStock = product.minimumStock || 10;
    const maxStock = product.maximumStock || 1000;

    let alertType = null;
    let severity = 'MEDIUM';
    let message = '';
    let recommendedQuantity = 0;

    if (currentStock <= 0) {
      alertType = 'OUT_OF_STOCK';
      severity = 'CRITICAL';
      recommendedQuantity = Math.max(minStock * 2, 25);
      message = `${product.productName} (SKU: ${product.SKU}) is completely OUT OF STOCK! Immediate restock of at least ${recommendedQuantity} units recommended.`;
    } else if (currentStock <= minStock) {
      alertType = 'LOW_STOCK';
      severity = currentStock <= Math.ceil(minStock / 2) ? 'HIGH' : 'MEDIUM';
      recommendedQuantity = Math.max(minStock * 2 - currentStock, 20);
      message = `${product.productName} (SKU: ${product.SKU}) is running low. Only ${currentStock} units remain (Threshold: ${minStock}). Recommended restock: ${recommendedQuantity} units.`;
    } else if (maxStock && currentStock > maxStock) {
      alertType = 'OVERSTOCK';
      severity = 'LOW';
      recommendedQuantity = 0;
      message = `${product.productName} (SKU: ${product.SKU}) is overstocked. Current: ${currentStock} exceeds max capacity of ${maxStock} units.`;
    }

    // If stock is healthy, dismiss any open low/out of stock alerts
    if (!alertType) {
      await StockAlert.updateMany(
        {
          businessId,
          productId: product._id,
          isDismissed: false,
          alertType: { $in: ['LOW_STOCK', 'OUT_OF_STOCK'] },
        },
        { isDismissed: true, readAt: new Date() }
      );
      return null;
    }

    // Deduplication check: Do not re-create an alert if an active unread/undismissed alert of this type exists
    const existingAlert = await StockAlert.findOne({
      businessId,
      productId: product._id,
      alertType,
      isDismissed: false,
    });

    if (existingAlert) {
      // Just update current stock and message if changed
      existingAlert.currentStock = currentStock;
      existingAlert.thresholdStock = minStock;
      existingAlert.recommendedQuantity = recommendedQuantity;
      existingAlert.message = message;
      await existingAlert.save();
      return existingAlert;
    }

    // Create new alert
    const newAlert = await StockAlert.create({
      businessId,
      productId: product._id,
      productName: product.productName,
      SKU: product.SKU,
      alertType,
      severity,
      currentStock,
      thresholdStock: minStock,
      recommendedQuantity,
      message,
      isRead: false,
      isDismissed: false,
    });

    // Broadcast alert in real-time to all connected business clients
    emitToBusiness(businessId, 'alert:new', newAlert);
    logger.info(`[Alert Engine] Generated ${alertType} alert for ${product.productName}`, {
      businessId,
      productId: product._id,
      severity,
    });

    return newAlert;
  } catch (error) {
    logger.error('[Alert Engine Error] Failed to generate stock alert:', error);
    return null;
  }
};

module.exports = {
  checkAndGenerateAlerts,
};
