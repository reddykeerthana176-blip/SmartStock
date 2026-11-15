const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Product must belong to a business'],
      index: true,
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    SKU: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true,
      maxlength: [50, 'SKU cannot exceed 50 characters'],
    },
    barcode: {
      type: String,
      trim: true,
      default: '',
      maxlength: [50, 'Barcode cannot exceed 50 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    currentStock: {
      type: Number,
      default: 0,
      min: [0, 'Current stock cannot be negative'],
      index: true,
    },
    minimumStock: {
      type: Number,
      default: 10,
      min: [0, 'Minimum stock cannot be negative'],
    },
    maximumStock: {
      type: Number,
      default: 1000,
      min: [0, 'Maximum stock cannot be negative'],
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
      index: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    image: {
      type: String,
      default: '',
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound Unique Indexes within each business
productSchema.index({ businessId: 1, SKU: 1 }, { unique: true });

// Conditional index for barcode: only enforce uniqueness when barcode is non-empty
productSchema.index(
  { businessId: 1, barcode: 1 },
  { 
    unique: true, 
    partialFilterExpression: { barcode: { $type: 'string', $gt: '' } } 
  }
);

// High-speed compound indexes for inventory lookups, filtering, and stock counts
productSchema.index({ businessId: 1, isArchived: 1, currentStock: 1 });
productSchema.index({ businessId: 1, isArchived: 1, category: 1 });
productSchema.index({ businessId: 1, isArchived: 1, createdAt: -1 });

// Full-text search index for instant product lookup
productSchema.index({
  productName: 'text',
  SKU: 'text',
  barcode: 'text',
  description: 'text',
});

// Virtuals for inventory metrics
productSchema.virtual('inventoryValuation').get(function () {
  return (this.currentStock || 0) * (this.purchasePrice || 0);
});

productSchema.virtual('retailValuation').get(function () {
  return (this.currentStock || 0) * (this.sellingPrice || 0);
});

productSchema.virtual('stockStatus').get(function () {
  if (this.currentStock <= 0) return 'OUT_OF_STOCK';
  if (this.currentStock <= this.minimumStock) return 'LOW_STOCK';
  if (this.maximumStock && this.currentStock > this.maximumStock) return 'OVERSTOCK';
  return 'OPTIMAL';
});

module.exports = mongoose.model('Product', productSchema);
