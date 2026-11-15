const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { applyStockMovement } = require('../services/stockService');
const { executeTransaction } = require('../config/db');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');
const { logAuditEvent } = require('../middleware/auditLogger');
const { emitToBusiness } = require('../config/socket');
const { v4: uuidv4 } = require('uuid');

/**
 * Record a new sale with atomic stock deduction and idempotency
 */
const createSale = async (req, res, next) => {
  try {
    const {
      items,
      subtotal,
      discount = 0,
      tax = 0,
      total,
      paymentMethod = 'CASH',
      customerName = 'Walk-in Customer',
      customerPhone = '',
      notes = '',
      idempotencyKey,
    } = req.body;

    const businessId = req.user.businessId;
    const userId = req.user.id;

    // 1. Idempotency Check: prevent double-clicks or replayed requests
    if (idempotencyKey) {
      const existingSale = await Sale.findOne({ businessId, idempotencyKey });
      if (existingSale) {
        return successResponse(res, 200, 'Sale previously completed (Idempotent replay)', existingSale);
      }
    }

    const transactionId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 2. Pre-validate stock availability for all products before executing
    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        businessId,
        isArchived: false,
      });

      if (!product) {
        return errorResponse(res, 404, `Product '${item.productName || item.productId}' is not available.`);
      }

      if (product.currentStock < item.quantity) {
        return errorResponse(
          res,
          400,
          `Insufficient stock for '${product.productName}'. Available: ${product.currentStock}, Requested: ${item.quantity}`
        );
      }
    }

    // 3. Atomically deduct stock and save sale record
    const result = await executeTransaction(async (session) => {
      // Deduct stock and record inventory movement for each item
      for (const item of items) {
        await applyStockMovement({
          businessId,
          productId: item.productId,
          type: 'SALE',
          quantity: item.quantity,
          referenceId: transactionId,
          referenceType: 'SALE',
          reason: `Sale ${transactionId}`,
          userId,
          session,
        });
      }

      // Format sale items
      const populatedItems = items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        SKU: i.SKU,
        barcode: i.barcode || '',
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        costPrice: Number(i.costPrice || 0),
        subtotal: Number(i.subtotal || i.quantity * i.unitPrice),
      }));

      const computedSubtotal = subtotal !== undefined
        ? Number(subtotal)
        : populatedItems.reduce((acc, i) => acc + i.subtotal, 0);

      const computedTotal = total !== undefined
        ? Number(total)
        : computedSubtotal - Number(discount) + Number(tax);

      const [sale] = await Sale.create(
        [
          {
            businessId,
            transactionId,
            items: populatedItems,
            subtotal: computedSubtotal,
            discount: Number(discount),
            tax: Number(tax),
            total: computedTotal,
            paymentMethod,
            status: 'COMPLETED',
            cashierId: userId,
            customerName,
            customerPhone,
            notes,
            idempotencyKey: idempotencyKey || null,
          },
        ],
        { session }
      );

      return sale;
    });

    // 4. Audit Log
    await logAuditEvent({
      businessId,
      user: req.user,
      action: 'SALE_COMPLETED',
      entityType: 'SALE',
      entityId: result._id,
      details: {
        transactionId,
        total: result.total,
        itemCount: items.length,
        paymentMethod,
      },
      req,
    });

    // 5. Broadcast real-time Socket.IO notification to dashboard
    emitToBusiness(businessId, 'sale:created', {
      saleId: result._id,
      transactionId: result.transactionId,
      total: result.total,
      itemCount: result.items.length,
      createdAt: result.createdAt,
    });

    return successResponse(res, 201, 'Sale recorded successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get paginated sales history
 */
const getSales = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      paymentMethod,
      startDate,
      endDate,
      search,
    } = req.query;

    const query = { businessId: req.user.businessId };

    if (paymentMethod && paymentMethod !== 'ALL') {
      query.paymentMethod = paymentMethod;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { transactionId: regex },
        { customerName: regex },
        { customerPhone: regex },
      ];
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

    const [sales, total] = await Promise.all([
      Sale.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate('cashierId', 'name email role')
        .lean(),
      Sale.countDocuments(query),
    ]);

    return paginatedResponse(res, sales, page, parsedLimit, total, 'Sales history retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get individual sale receipt by ID
 */
const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findOne({
      _id: id,
      businessId: req.user.businessId,
    }).populate('cashierId', 'name email role');

    if (!sale) {
      return errorResponse(res, 404, 'Sale not found');
    }

    return successResponse(res, 200, 'Sale details retrieved', sale);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSale,
  getSales,
  getSaleById,
};
