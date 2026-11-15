const mongoose = require('mongoose');

const offlineSyncOperationSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    operationId: {
      type: String,
      required: true,
      trim: true,
    },
    entityType: {
      type: String,
      enum: ['SALE', 'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'PRODUCT'],
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSED', 'CONFLICT', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    errorMessage: {
      type: String,
      default: '',
    },
    idempotencyKey: {
      type: String,
      default: '',
      index: true,
    },
    clientTimestamp: {
      type: Date,
      required: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

offlineSyncOperationSchema.index({ businessId: 1, operationId: 1 }, { unique: true });
offlineSyncOperationSchema.index({ businessId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('OfflineSyncOperation', offlineSyncOperationSchema);
