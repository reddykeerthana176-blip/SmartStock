const RestockRecommendation = require('../models/RestockRecommendation');
const { calculateProductPrediction } = require('../services/predictionEngine');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Get all restock predictions for the business
 */
const getPredictions = async (req, res, next) => {
  try {
    const { refresh, urgency, days = 30 } = req.query;
    const businessId = req.user.businessId;

    if (refresh === 'true') {
      await calculateProductPrediction(businessId, null, parseInt(days, 10));
    }

    const query = { businessId };
    if (urgency && urgency !== 'ALL') {
      query.urgency = urgency;
    }

    // Sort order: CRITICAL first, then HIGH, MEDIUM, LOW
    const predictions = await RestockRecommendation.find(query)
      .populate('productId', 'productName SKU barcode currentStock minimumStock maximumStock purchasePrice sellingPrice image')
      .sort({
        urgency: 1,
        suggestedRestockQuantity: -1,
        calculatedAt: -1,
      })
      .lean();

    // Map urgency order in JS for consistent sorting
    const urgencyWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
    predictions.sort((a, b) => (urgencyWeight[b.urgency] || 0) - (urgencyWeight[a.urgency] || 0));

    const totalRecommendedRestockUnits = predictions.reduce(
      (acc, item) => acc + (item.suggestedRestockQuantity || 0),
      0
    );

    const criticalCount = predictions.filter((p) => p.urgency === 'CRITICAL').length;
    const highCount = predictions.filter((p) => p.urgency === 'HIGH').length;

    return successResponse(res, 200, 'Restock predictions retrieved', {
      predictions,
      metrics: {
        totalItemsAnalyzed: predictions.length,
        totalRecommendedRestockUnits,
        criticalCount,
        highCount,
        lastCalculated: predictions[0]?.calculatedAt || new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get restock prediction for a single product
 */
const getProductPrediction = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const businessId = req.user.businessId;

    const [prediction] = await calculateProductPrediction(businessId, productId, 30);
    if (!prediction) {
      return errorResponse(res, 404, 'No prediction could be generated for this product');
    }

    return successResponse(res, 200, 'Product prediction calculated', prediction);
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger batch recalculation
 */
const triggerRecalculate = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const recommendations = await calculateProductPrediction(businessId, null, 30);

    return successResponse(
      res,
      200,
      `Predictive restocking models recalculated for ${recommendations.length} products`,
      { count: recommendations.length }
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPredictions,
  getProductPrediction,
  triggerRecalculate,
};
