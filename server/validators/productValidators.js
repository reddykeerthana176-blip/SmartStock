/**
 * Input validators for Products
 */

const validateProduct = (req, res, next) => {
  const { productName, SKU, category, purchasePrice, sellingPrice } = req.body;
  const errors = [];

  if (!productName || !productName.trim()) errors.push('Product name is required');
  if (!SKU || !SKU.trim()) errors.push('SKU is required');
  if (!category || !category.trim()) errors.push('Category is required');
  if (purchasePrice === undefined || isNaN(Number(purchasePrice)) || Number(purchasePrice) < 0) {
    errors.push('Purchase price must be a non-negative number');
  }
  if (sellingPrice === undefined || isNaN(Number(sellingPrice)) || Number(sellingPrice) < 0) {
    errors.push('Selling price must be a non-negative number');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = {
  validateProduct,
};
