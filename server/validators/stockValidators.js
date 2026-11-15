/**
 * Input validators for Stock Operations and Sales
 */

const validateStockIn = (req, res, next) => {
  const { productId, quantity } = req.body;
  const errors = [];

  if (!productId) errors.push('Product ID is required');
  if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
    errors.push('Quantity must be a positive number');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

const validateStockOut = (req, res, next) => {
  const { productId, quantity } = req.body;
  const errors = [];

  if (!productId) errors.push('Product ID is required');
  if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
    errors.push('Quantity must be a positive number');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

const validateStockAdjust = (req, res, next) => {
  const { productId, newStock, reason } = req.body;
  const errors = [];

  if (!productId) errors.push('Product ID is required');
  if (newStock === undefined || isNaN(Number(newStock)) || Number(newStock) < 0) {
    errors.push('New stock must be a non-negative number');
  }
  if (!reason || !reason.trim()) {
    errors.push('A valid reason for the manual adjustment is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

const validateSale = (req, res, next) => {
  const { items, paymentMethod } = req.body;
  const errors = [];

  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push('Sale must include at least one item');
  } else {
    items.forEach((item, index) => {
      if (!item.productId) errors.push(`Item ${index + 1}: Product ID is required`);
      if (!item.quantity || Number(item.quantity) <= 0) errors.push(`Item ${index + 1}: Quantity must be greater than zero`);
      if (item.unitPrice === undefined || Number(item.unitPrice) < 0) errors.push(`Item ${index + 1}: Unit price cannot be negative`);
    });
  }

  const validPayments = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'BANK_TRANSFER', 'STORE_CREDIT'];
  if (paymentMethod && !validPayments.includes(paymentMethod)) {
    errors.push(`Invalid payment method. Allowed: ${validPayments.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = {
  validateStockIn,
  validateStockOut,
  validateStockAdjust,
  validateSale,
};
