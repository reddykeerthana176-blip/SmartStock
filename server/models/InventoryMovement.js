const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Movement must belong to a business'],
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required for movement tracking'],
      index: true,
    },
    type: {
      type: String,
      enum: ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'SALE', 'RETURN', 'DAMAGED'],
      required: [true, 'Movement type is required'],
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
    },
    previousStock: {
      type: Number,
      required: [true, 'Previous stock level is required'],
    },
    newStock: {
      type: Number,
      required: [true, 'New stock level is required'],
    },
    referenceId: {
      type: String,
      default: '',
      index: true,
    },
    referenceType: {
      type: String,
      enum: ['SALE', 'RESTOCK', 'MANUAL_AUDIT', 'DAMAGE_REPORT', 'RETURN', 'INITIAL'],
      default: 'MANUAL_AUDIT',
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

inventoryMovementSchema.index({ businessId: 1, productId: 1, createdAt: -1 });
inventoryMovementSchema.index({ businessId: 1, type: 1, createdAt: -1 });
inventoryMovementSchema.index({ businessId: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);
