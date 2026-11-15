const mongoose = require('mongoose');

const stockAlertSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Alert must belong to a business'],
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true,
    },
    productName: {
      type: String,
      default: '',
    },
    SKU: {
      type: String,
      default: '',
    },
    alertType: {
      type: String,
      enum: ['LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'RESTOCK_REQUIRED'],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true,
    },
    currentStock: {
      type: Number,
      required: true,
    },
    thresholdStock: {
      type: Number,
      required: true,
    },
    recommendedQuantity: {
      type: Number,
      default: 0,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDismissed: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

stockAlertSchema.index({ businessId: 1, isDismissed: 1, createdAt: -1 });
stockAlertSchema.index({ businessId: 1, isRead: 1, createdAt: -1 });
stockAlertSchema.index({ businessId: 1, productId: 1, alertType: 1, isDismissed: 1 });

module.exports = mongoose.model('StockAlert', stockAlertSchema);
