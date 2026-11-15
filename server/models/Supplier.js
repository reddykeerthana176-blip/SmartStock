const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Supplier must belong to a business'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      maxlength: 120,
    },
    contactPerson: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    leadTimeDays: {
      type: Number,
      default: 5,
      min: [1, 'Lead time must be at least 1 day'],
      max: [120, 'Lead time cannot exceed 120 days'],
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

supplierSchema.index({ businessId: 1, name: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
