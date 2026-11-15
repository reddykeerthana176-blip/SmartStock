const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const { checkAndGenerateAlerts } = require('./alertEngine');
const { emitToBusiness } = require('../config/socket');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Apply atomic stock movement
 * @param {Object} params
 * @param {ObjectId} params.businessId
 * @param {ObjectId} params.productId
 * @param {String} params.type - 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'SALE' | 'RETURN' | 'DAMAGED'
 * @param {Number} params.quantity - Positive number of items moving (or absolute new target if ADJUSTMENT)
 * @param {String} params.referenceId - Optional order/sale ID
 * @param {String} params.referenceType - Optional reference category
 * @param {String} params.reason - Explanation
 * @param {ObjectId} params.userId - Cashier / Staff ID
 * @param {ClientSession} session - Optional MongoDB session
 */
const applyStockMovement = async ({
  businessId,
  productId,
  type,
  quantity,
  newStockTarget,
  referenceId = '',
  referenceType = 'MANUAL_AUDIT',
  reason = '',
  userId = null,
  session = null,
}) => {
  const product = await Product.findOne({ _id: productId, businessId, isArchived: false }).session(session);
  if (!product) {
    throw new NotFoundError('Product not found or has been archived');
  }

  const previousStock = product.currentStock;
  let newStock = previousStock;
  let movementQuantity = 0;

  switch (type) {
    case 'STOCK_IN':
    case 'RETURN':
      movementQuantity = Math.abs(quantity);
      newStock = previousStock + movementQuantity;
      break;

    case 'STOCK_OUT':
    case 'SALE':
    case 'DAMAGED':
      movementQuantity = Math.abs(quantity);
      if (previousStock < movementQuantity) {
        throw new BadRequestError(
          `Insufficient stock for '${product.productName}'. Available: ${previousStock}, Requested: ${movementQuantity}`
        );
      }
      newStock = previousStock - movementQuantity;
      break;

    case 'ADJUSTMENT':
      newStock = Math.max(0, newStockTarget !== undefined ? Number(newStockTarget) : Number(quantity));
      movementQuantity = newStock - previousStock;
      break;

    default:
      throw new BadRequestError(`Unsupported stock movement type: ${type}`);
  }

  // Atomic update to avoid race conditions
  let updatedProduct;
  if (type === 'STOCK_OUT' || type === 'SALE' || type === 'DAMAGED') {
    // Condition ensures stock didn't drop concurrently below the required quantity
    updatedProduct = await Product.findOneAndUpdate(
      {
        _id: productId,
        businessId,
        currentStock: { $gte: movementQuantity },
      },
      {
        $inc: { currentStock: -movementQuantity },
      },
      { new: true, session }
    );

    if (!updatedProduct) {
      throw new BadRequestError(
        `Concurrency collision: Stock for '${product.productName}' changed before update could complete.`
      );
    }
  } else if (type === 'STOCK_IN' || type === 'RETURN') {
    updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, businessId },
      { $inc: { currentStock: movementQuantity } },
      { new: true, session }
    );
  } else {
    // ADJUSTMENT
    updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, businessId },
      { $set: { currentStock: newStock } },
      { new: true, session }
    );
  }

  // Record movement in audit history
  const [movement] = await InventoryMovement.create(
    [
      {
        businessId,
        productId,
        type,
        quantity: movementQuantity,
        previousStock,
        newStock: updatedProduct.currentStock,
        referenceId,
        referenceType,
        reason,
        performedBy: userId,
      },
    ],
    { session }
  );

  // Check alert thresholds asynchronously
  checkAndGenerateAlerts(updatedProduct, businessId).catch((err) => {
    logger.error('[Stock Alert Error] Background check failed:', err);
  });

  // Broadcast real-time stock update
  emitToBusiness(businessId, 'stock:updated', {
    productId: updatedProduct._id,
    SKU: updatedProduct.SKU,
    productName: updatedProduct.productName,
    currentStock: updatedProduct.currentStock,
    type,
    movementId: movement._id,
  });

  return { product: updatedProduct, movement };
};

module.exports = {
  applyStockMovement,
};
