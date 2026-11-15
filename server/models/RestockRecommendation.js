const mongoose = require('mongoose');

const restockRecommendationSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
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
    category: {
      type: String,
      default: '',
    },
    currentStock: {
      type: Number,
      required: true,
    },
    averageDailyDemand: {
      type: Number,
      required: true,
      default: 0,
    },
    supplierLeadTimeDays: {
      type: Number,
      required: true,
      default: 5,
    },
    safetyStock: {
      type: Number,
      required: true,
      default: 0,
    },
    reorderPoint: {
      type: Number,
      required: true,
    },
    targetStockLevel: {
      type: Number,
      default: 0,
    },
    suggestedRestockQuantity: {
      type: Number,
      required: true,
      default: 0,
    },
    predictedStockoutDays: {
      type: Number,
      default: null,
    },
    predictedStockoutDate: {
      type: Date,
      default: null,
    },
    forecastConfidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    hasSufficientData: {
      type: Boolean,
      default: false,
    },
    explanation: {
      type: String,
      default: '',
    },
    urgency: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'],
      default: 'NONE',
    },
    calculatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

restockRecommendationSchema.index({ businessId: 1, productId: 1 }, { unique: true });
restockRecommendationSchema.index({ businessId: 1, urgency: 1, calculatedAt: -1 });

module.exports = mongoose.model('RestockRecommendation', restockRecommendationSchema);
