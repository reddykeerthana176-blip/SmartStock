const { applyStockMovement } = require('../services/stockService');
const InventoryMovement = require('../models/InventoryMovement');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');
const { logAuditEvent } = require('../middleware/auditLogger');
const { jsonToCsv } = require('../services/csvService');

/**
 * Handle Stock-In (Shipment arrival, restock)
 */
const stockIn = async (req, res, next) => {
  try {
    const { productId, quantity, referenceId, reason } = req.body;
    const businessId = req.user.businessId;

    const result = await applyStockMovement({
      businessId,
      productId,
      type: 'STOCK_IN',
      quantity: Number(quantity),
      referenceId: referenceId || '',
      referenceType: 'RESTOCK',
      reason: reason || 'Stock received into inventory',
      userId: req.user.id,
    });

    await logAuditEvent({
      businessId,
      user: req.user,
      action: 'STOCK_IN',
      entityType: 'PRODUCT',
      entityId: productId,
      details: {
        productName: result.product.productName,
        quantityAdded: Number(quantity),
        newStock: result.product.currentStock,
      },
      req,
    });

    return successResponse(res, 200, `Successfully added ${quantity} units to stock`, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Stock-Out (Loss, write-off, return to supplier, internal use)
 */
const stockOut = async (req, res, next) => {
  try {
    const { productId, quantity, referenceId, reason, movementType = 'STOCK_OUT' } = req.body;
    const businessId = req.user.businessId;

    const validTypes = ['STOCK_OUT', 'DAMAGED', 'RETURN'];
    const type = validTypes.includes(movementType) ? movementType : 'STOCK_OUT';

    const result = await applyStockMovement({
      businessId,
      productId,
      type,
      quantity: Number(quantity),
      referenceId: referenceId || '',
      referenceType: type === 'DAMAGED' ? 'DAMAGE_REPORT' : 'MANUAL_AUDIT',
      reason: reason || 'Stock removed from inventory',
      userId: req.user.id,
    });

    await logAuditEvent({
      businessId,
      user: req.user,
      action: type,
      entityType: 'PRODUCT',
      entityId: productId,
      details: {
        productName: result.product.productName,
        quantityRemoved: Number(quantity),
        newStock: result.product.currentStock,
        reason,
      },
      req,
    });

    return successResponse(res, 200, `Successfully deducted ${quantity} units from stock`, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Stock Adjustment (Physical inventory audit reconciliation)
 */
const stockAdjust = async (req, res, next) => {
  try {
    const { productId, newStock, reason } = req.body;
    const businessId = req.user.businessId;

    const result = await applyStockMovement({
      businessId,
      productId,
      type: 'ADJUSTMENT',
      quantity: 0,
      newStockTarget: Number(newStock),
      referenceType: 'MANUAL_AUDIT',
      reason: reason || 'Physical inventory audit count',
      userId: req.user.id,
    });

    await logAuditEvent({
      businessId,
      user: req.user,
      action: 'STOCK_ADJUSTMENT',
      entityType: 'PRODUCT',
      entityId: productId,
      details: {
        productName: result.product.productName,
        adjustedTo: Number(newStock),
        reason,
      },
      req,
    });

    return successResponse(
      res,
      200,
      `Stock adjusted to ${newStock} units for '${result.product.productName}'`,
      result
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get paginated inventory movement history
 */
const getMovements = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      productId,
      type,
      startDate,
      endDate,
    } = req.query;

    const query = { businessId: req.user.businessId };

    if (productId) {
      query.productId = productId;
    }

    if (type && type !== 'ALL') {
      query.type = type;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    const [movements, total] = await Promise.all([
      InventoryMovement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate('productId', 'productName SKU category currentStock')
        .populate('performedBy', 'name email role')
        .lean(),
      InventoryMovement.countDocuments(query),
    ]);

    return paginatedResponse(res, movements, page, parsedLimit, total, 'Movements retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  stockIn,
  stockOut,
  stockAdjust,
  getMovements,
};
