const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: [120, 'Business name cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Business email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: 'USA' },
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
      uppercase: true,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    maxProducts: {
      type: Number,
      default: 100000,
      immutable: true, // System ceiling
    },
    settings: {
      defaultLowStockThreshold: { type: Number, default: 10 },
      defaultLeadTimeDays: { type: Number, default: 5 },
      defaultSafetyStockDays: { type: Number, default: 7 },
      enablePredictiveAlerts: { type: Boolean, default: true },
      enableAutoDeductions: { type: Boolean, default: true },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'TRIAL'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

businessSchema.index({ status: 1 });

module.exports = mongoose.model('Business', businessSchema);
