const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const RestockRecommendation = require('../models/RestockRecommendation');
const logger = require('../utils/logger');

/**
 * Intelligent Predictive Restocking & Demand Forecasting Engine
 * Analyzes historical sales using MongoDB aggregation pipeline.
 */

/**
 * Calculate restock recommendation for a single product or all products in a business
 * @param {ObjectId} businessId
 * @param {ObjectId} [productId] - Optional specific product ID
 * @param {Number} [analysisDays=30] - Lookback window in days
 */
const calculateProductPrediction = async (businessId, productId = null, analysisDays = 30) => {
  try {
    const businessObjId = new mongoose.Types.ObjectId(businessId);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - analysisDays);

    // 1. Fetch target products
    const productFilter = { businessId: businessObjId, isArchived: false };
    if (productId) {
      productFilter._id = new mongoose.Types.ObjectId(productId);
    }

    const products = await Product.find(productFilter).populate('supplierId').lean();
    if (!products || products.length === 0) {
      return [];
    }

    // 2. High-performance MongoDB Aggregation Pipeline for historical sales
    const matchStage = {
      $match: {
        businessId: businessObjId,
        status: 'COMPLETED',
        createdAt: { $gte: startDate },
      },
    };

    if (productId) {
      matchStage.$match['items.productId'] = new mongoose.Types.ObjectId(productId);
    }

    const salesAggregation = await Sale.aggregate([
      matchStage,
      { $unwind: '$items' },
      ...(productId
        ? [{ $match: { 'items.productId': new mongoose.Types.ObjectId(productId) } }]
        : []),
      {
        $group: {
          _id: {
            productId: '$items.productId',
            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          },
          dailyUnits: { $sum: '$items.quantity' },
          dailyRevenue: { $sum: '$items.subtotal' },
        },
      },
      {
        $group: {
          _id: '$_id.productId',
          totalUnitsSold: { $sum: '$dailyUnits' },
          totalRevenue: { $sum: '$dailyRevenue' },
          salesDaysCount: { $sum: 1 },
          dailySalesHistory: {
            $push: {
              day: '$_id.day',
              units: '$dailyUnits',
              revenue: '$dailyRevenue',
            },
          },
        },
      },
    ]);

    // Create a fast lookup map for aggregated sales
    const salesMap = new Map();
    for (const record of salesAggregation) {
      salesMap.set(record._id.toString(), record);
    }

    const recommendations = [];

    for (const product of products) {
      const prodIdStr = product._id.toString();
      const salesData = salesMap.get(prodIdStr);

      const supplierLeadTimeDays = product.supplierId?.leadTimeDays || 5;
      const currentStock = Number(product.currentStock || 0);
      const minStock = Number(product.minimumStock || 10);
      const maxStock = Number(product.maximumStock || 500);

      // Check data sufficiency
      if (!salesData || salesData.salesDaysCount < 2 || salesData.totalUnitsSold === 0) {
        // Insufficient historical sales data
        const recDoc = {
          businessId,
          productId: product._id,
          productName: product.productName,
          SKU: product.SKU,
          category: product.category,
          currentStock,
          averageDailyDemand: 0,
          supplierLeadTimeDays,
          safetyStock: Math.ceil(minStock * 0.5),
          reorderPoint: minStock,
          targetStockLevel: maxStock,
          suggestedRestockQuantity: currentStock <= minStock ? Math.max(minStock * 2 - currentStock, 10) : 0,
          predictedStockoutDays: null,
          predictedStockoutDate: null,
          forecastConfidence: 15,
          hasSufficientData: false,
          explanation: `Insufficient historical sales data (less than 2 active sales days in the last ${analysisDays} days). Recommendations rely on default min/max stock thresholds.`,
          urgency: currentStock <= 0 ? 'CRITICAL' : currentStock <= minStock ? 'HIGH' : 'NONE',
          calculatedAt: new Date(),
        };

        await RestockRecommendation.findOneAndUpdate(
          { businessId, productId: product._id },
          recDoc,
          { upsert: true, new: true }
        );
        recommendations.push(recDoc);
        continue;
      }

      // 3. Mathematical Calculations
      // Average Daily Demand = Total Units Sold / Number of Days
      const totalUnits = salesData.totalUnitsSold;
      const avgDailyDemand = parseFloat((totalUnits / analysisDays).toFixed(2));

      // Weighted variance and trend calculation
      // Standard deviation of daily sales for confidence and dynamic safety stock
      const dailyUnitsArray = salesData.dailySalesHistory.map((d) => d.units);
      const mean = totalUnits / salesData.salesDaysCount;
      const variance =
        dailyUnitsArray.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
        salesData.salesDaysCount;
      const stdDev = Math.sqrt(variance);

      // Safety Stock: Z * stdDev * sqrt(LeadTime) or heuristic: (Avg Daily Demand * leadTime / 2) + stdDev
      const safetyStock = Math.max(
        Math.ceil(avgDailyDemand * 3),
        Math.ceil(stdDev * Math.sqrt(supplierLeadTimeDays)),
        5
      );

      // Reorder Point = (Average Daily Demand × Supplier Lead Time) + Safety Stock
      const reorderPoint = Math.ceil(avgDailyDemand * supplierLeadTimeDays + safetyStock);

      // Target Stock Level (Max of configured maximumStock or Reorder Point + 30 days demand)
      const targetStockLevel = Math.max(maxStock, reorderPoint + Math.ceil(avgDailyDemand * 14));

      // Suggested Restock Quantity = Target Stock Level - Current Stock
      let suggestedRestockQuantity = 0;
      if (currentStock <= reorderPoint) {
        suggestedRestockQuantity = Math.max(0, targetStockLevel - currentStock);
      }

      // Predicted stockout days: Current Stock / Average Daily Demand
      let predictedStockoutDays = null;
      let predictedStockoutDate = null;
      if (avgDailyDemand > 0) {
        predictedStockoutDays = Math.max(0, parseFloat((currentStock / avgDailyDemand).toFixed(1)));
        const stockoutDate = new Date();
        stockoutDate.setDate(stockoutDate.getDate() + Math.floor(predictedStockoutDays));
        predictedStockoutDate = stockoutDate;
      }

      // Forecast Confidence (0 - 100%) based on sales regularity and sample size
      const regularityScore = Math.min(100, Math.round((salesData.salesDaysCount / analysisDays) * 100));
      const variancePenalty = Math.min(40, Math.round((stdDev / (mean || 1)) * 20));
      const forecastConfidence = Math.max(20, Math.min(95, regularityScore + 20 - variancePenalty));

      // Determine Urgency
      let urgency = 'NONE';
      if (currentStock <= 0) {
        urgency = 'CRITICAL';
      } else if (predictedStockoutDays !== null && predictedStockoutDays <= supplierLeadTimeDays) {
        urgency = 'CRITICAL'; // Stockout predicted before a new order can arrive!
      } else if (currentStock <= reorderPoint) {
        urgency = 'HIGH';
      } else if (currentStock <= reorderPoint * 1.25) {
        urgency = 'MEDIUM';
      } else {
        urgency = 'LOW';
      }

      // Plain language explanation
      let explanation = '';
      if (currentStock <= 0) {
        explanation = `CRITICAL: Item is out of stock. Immediate order of ${suggestedRestockQuantity} units needed to cover ${supplierLeadTimeDays}-day supplier lead time.`;
      } else if (predictedStockoutDays !== null && predictedStockoutDays <= supplierLeadTimeDays) {
        explanation = `URGENT: At current sales velocity of ${avgDailyDemand} units/day, stockout is expected in ${predictedStockoutDays} days. Supplier requires ${supplierLeadTimeDays} days lead time. Order ${suggestedRestockQuantity} units now to prevent stockout.`;
      } else if (currentStock <= reorderPoint) {
        explanation = `Current stock (${currentStock}) is at or below the reorder point (${reorderPoint}). Recommended restock of ${suggestedRestockQuantity} units to achieve target inventory level of ${targetStockLevel}.`;
      } else {
        explanation = `Inventory is currently adequate. Projected to last ${predictedStockoutDays !== null ? `${predictedStockoutDays} days` : 'indefinitely'} based on ${avgDailyDemand} units/day demand.`;
      }

      const recDoc = {
        businessId,
        productId: product._id,
        productName: product.productName,
        SKU: product.SKU,
        category: product.category,
        currentStock,
        averageDailyDemand: avgDailyDemand,
        supplierLeadTimeDays,
        safetyStock,
        reorderPoint,
        targetStockLevel,
        suggestedRestockQuantity,
        predictedStockoutDays,
        predictedStockoutDate,
        forecastConfidence,
        hasSufficientData: true,
        explanation,
        urgency,
        calculatedAt: new Date(),
      };

      await RestockRecommendation.findOneAndUpdate(
        { businessId, productId: product._id },
        recDoc,
        { upsert: true, new: true }
      );

      recommendations.push(recDoc);
    }

    return recommendations;
  } catch (error) {
    logger.error('[Prediction Engine Error] Failed to generate predictions:', error);
    throw error;
  }
};

module.exports = {
  calculateProductPrediction,
};
