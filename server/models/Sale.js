const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
    },
    SKU: {
      type: String,
      required: true,
    },
    barcode: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative'],
    },
    costPrice: {
      type: Number,
      default: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const saleSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Sale must belong to a business'],
      index: true,
    },
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      trim: true,
    },
    items: {
      type: [saleItemSchema],
      validate: [
        (val) => val && val.length > 0,
        'Sale must contain at least one product item',
      ],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'BANK_TRANSFER', 'STORE_CREDIT'],
      default: 'CASH',
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED'],
      default: 'COMPLETED',
      index: true,
    },
    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      default: 'Walk-in Customer',
      trim: true,
    },
    customerPhone: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
    },
    idempotencyKey: {
      type: String,
      default: null,
      trim: true,
    },
    offlineSyncId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high performance and analytics
saleSchema.index({ businessId: 1, transactionId: 1 }, { unique: true });
saleSchema.index(
  { businessId: 1, idempotencyKey: 1 },
  { 
    unique: true, 
    partialFilterExpression: { idempotencyKey: { $type: 'string', $gt: '' } } 
  }
);
saleSchema.index({ businessId: 1, createdAt: -1 });
saleSchema.index({ businessId: 1, 'items.productId': 1, createdAt: -1 });
saleSchema.index({ businessId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);
