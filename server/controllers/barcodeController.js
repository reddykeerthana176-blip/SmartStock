const Product = require('../models/Product');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Rapid lookup of product by barcode or SKU
 */
const lookupBarcode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const businessId = req.user.businessId;

    if (!code || !code.trim()) {
      return errorResponse(res, 400, 'Barcode or SKU code is required');
    }

    const trimmedCode = code.trim();

    // Query by barcode or SKU
    const product = await Product.findOne({
      businessId,
      isArchived: false,
      $or: [
        { barcode: trimmedCode },
        { SKU: trimmedCode.toUpperCase() },
      ],
    }).populate('supplierId', 'name contactPerson leadTimeDays');

    if (!product) {
      return successResponse(res, 200, 'No product found with this barcode', {
        found: false,
        scannedCode: trimmedCode,
      });
    }

    return successResponse(res, 200, 'Product found', {
      found: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  lookupBarcode,
};
