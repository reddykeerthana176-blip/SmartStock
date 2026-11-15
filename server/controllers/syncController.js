const OfflineSyncOperation = require('../models/OfflineSyncOperation');
const { processSyncBatch } = require('../services/syncProcessor');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Handle batch offline synchronization
 */
const batchSync = async (req, res, next) => {
  try {
    const { operations } = req.body;
    const businessId = req.user.businessId;
    const userId = req.user.id;

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return errorResponse(res, 400, 'Batch must include an array of operations');
    }

    const results = await processSyncBatch(businessId, userId, operations);

    const processedCount = results.filter((r) => r.status === 'PROCESSED').length;
    const conflictCount = results.filter((r) => r.status === 'CONFLICT').length;
    const failedCount = results.filter((r) => r.status === 'FAILED').length;

    return successResponse(res, 200, 'Batch synchronization processed', {
      total: operations.length,
      processed: processedCount,
      conflicts: conflictCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get offline sync status and log history
 */
const getSyncStatus = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;

    const [recentOperations, statusCounts] = await Promise.all([
      OfflineSyncOperation.find({ businessId })
        .sort({ createdAt: -1 })
        .limit(25)
        .lean(),
      OfflineSyncOperation.aggregate([
        { $match: { businessId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const summary = {
      PENDING: 0,
      PROCESSED: 0,
      CONFLICT: 0,
      FAILED: 0,
    };
    statusCounts.forEach((s) => {
      summary[s._id] = s.count;
    });

    return successResponse(res, 200, 'Sync status retrieved', {
      summary,
      recentOperations,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  batchSync,
  getSyncStatus,
};
