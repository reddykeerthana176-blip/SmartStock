const Product = require('../models/Product');
const Sale = require('../models/Sale');
const OfflineSyncOperation = require('../models/OfflineSyncOperation');
const { applyStockMovement } = require('./stockService');
const { executeTransaction } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Process offline synchronized batch operations with conflict resolution & idempotency
 */
const processSyncBatch = async (businessId, userId, operations = []) => {
  const results = [];

  for (const op of operations) {
    const { operationId, entityType, action, payload, clientTimestamp, idempotencyKey } = op;

    // Check if operation was already processed
    const existingOp = await OfflineSyncOperation.findOne({
      businessId,
      operationId,
    });

    if (existingOp && existingOp.status === 'PROCESSED') {
      results.push({
        operationId,
        status: 'PROCESSED',
        message: 'Operation already processed previously (Idempotent)',
        data: existingOp.payload,
      });
      continue;
    }

    // Record or update sync operation state as PENDING
    let syncRecord = existingOp;
    if (!syncRecord) {
      syncRecord = await OfflineSyncOperation.create({
        businessId,
        operationId,
        entityType,
        action,
        payload,
        status: 'PENDING',
        idempotencyKey: idempotencyKey || operationId,
        clientTimestamp: clientTimestamp ? new Date(clientTimestamp) : new Date(),
      });
    }

    try {
      if (entityType === 'SALE') {
        // Process offline sale
        const saleData = payload;

        // Conflict check: ensure all products exist and have sufficient stock
        let conflictFound = false;
        let conflictMessage = '';

        for (const item of saleData.items) {
          const product = await Product.findOne({
            _id: item.productId,
            businessId,
            isArchived: false,
          });

          if (!product) {
            conflictFound = true;
            conflictMessage = `Product '${item.productName || item.productId}' no longer exists in inventory.`;
            break;
          }

          if (product.currentStock < item.quantity) {
            conflictFound = true;
            conflictMessage = `Stock conflict for '${product.productName}': requested ${item.quantity}, but only ${product.currentStock} units are available on server.`;
            break;
          }
        }

        if (conflictFound) {
          syncRecord.status = 'CONFLICT';
          syncRecord.errorMessage = conflictMessage;
          syncRecord.processedAt = new Date();
          await syncRecord.save();

          results.push({
            operationId,
            status: 'CONFLICT',
            message: conflictMessage,
          });
          continue;
        }

        // Execute sale atomically
        await executeTransaction(async (session) => {
          // Deduct stock for all items
          for (const item of saleData.items) {
            await applyStockMovement({
              businessId,
              productId: item.productId,
              type: 'SALE',
              quantity: item.quantity,
              referenceId: saleData.transactionId,
              referenceType: 'SALE',
              reason: 'Offline POS Sale Sync',
              userId,
              session,
            });
          }

          // Create Sale record
          const [newSale] = await Sale.create(
            [
              {
                businessId,
                transactionId: saleData.transactionId || `TXN-OFFLINE-${Date.now()}`,
                items: saleData.items,
                subtotal: saleData.subtotal,
                discount: saleData.discount || 0,
                tax: saleData.tax || 0,
                total: saleData.total,
                paymentMethod: saleData.paymentMethod || 'CASH',
                status: 'COMPLETED',
                cashierId: userId,
                customerName: saleData.customerName || 'Offline Customer',
                customerPhone: saleData.customerPhone || '',
                idempotencyKey: idempotencyKey || operationId,
                offlineSyncId: operationId,
                createdAt: clientTimestamp ? new Date(clientTimestamp) : new Date(),
              },
            ],
            { session }
          );

          syncRecord.status = 'PROCESSED';
          syncRecord.errorMessage = '';
          syncRecord.processedAt = new Date();
          await syncRecord.save({ session });

          results.push({
            operationId,
            status: 'PROCESSED',
            message: 'Sale successfully synchronized and committed',
            saleId: newSale._id,
          });
        });
      } else if (entityType === 'STOCK_IN') {
        const { productId, quantity, reason } = payload;
        await applyStockMovement({
          businessId,
          productId,
          type: 'STOCK_IN',
          quantity,
          referenceId: operationId,
          referenceType: 'RESTOCK',
          reason: reason || 'Offline Stock-In Sync',
          userId,
        });

        syncRecord.status = 'PROCESSED';
        syncRecord.processedAt = new Date();
        await syncRecord.save();

        results.push({
          operationId,
          status: 'PROCESSED',
          message: 'Stock-in successfully synchronized',
        });
      } else {
        throw new Error(`Unsupported offline entity type: ${entityType}`);
      }
    } catch (err) {
      logger.error(`[Sync Processor Error] Failed operation ${operationId}:`, err);
      syncRecord.status = 'FAILED';
      syncRecord.errorMessage = err.message;
      syncRecord.processedAt = new Date();
      await syncRecord.save();

      results.push({
        operationId,
        status: 'FAILED',
        message: err.message,
      });
    }
  }

  return results;
};

module.exports = {
  processSyncBatch,
};
