const mongoose = require('mongoose');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const InventoryMovement = require('../models/InventoryMovement');
const StockAlert = require('../models/StockAlert');
const { successResponse } = require('../utils/apiResponse');

/**
 * Get core 6 KPI summary cards
 */
const getSummary = async (req, res, next) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.user.businessId);

    // Start of today (00:00:00)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Start of yesterday (for trend comparisons)
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const [
      inventoryStats,
      todaySales,
      yesterdaySales,
      unreadAlertsCount,
    ] = await Promise.all([
      // Inventory aggregation
      Product.aggregate([
        { $match: { businessId, isArchived: false } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalStockUnits: { $sum: '$currentStock' },
            inventoryValuation: {
              $sum: { $multiply: ['$currentStock', '$purchasePrice'] },
            },
            retailValuation: {
              $sum: { $multiply: ['$currentStock', '$sellingPrice'] },
            },
            outOfStockCount: {
              $sum: {
                $cond: [{ $lte: ['$currentStock', 0] }, 1, 0],
              },
            },
            lowStockCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ['$currentStock', 0] },
                      { $lte: ['$currentStock', '$minimumStock'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      // Today's sales aggregation
      Sale.aggregate([
        {
          $match: {
            businessId,
            status: 'COMPLETED',
            createdAt: { $gte: startOfToday },
          },
        },
        {
          $group: {
            _id: null,
            todayRevenue: { $sum: '$total' },
            todayTransactions: { $sum: 1 },
            todayUnitsSold: { $sum: { $sum: '$items.quantity' } },
          },
        },
      ]),

      // Yesterday's sales (for percentage delta calculation)
      Sale.aggregate([
        {
          $match: {
            businessId,
            status: 'COMPLETED',
            createdAt: { $gte: startOfYesterday, $lt: startOfToday },
          },
        },
        {
          $group: {
            _id: null,
            yesterdayRevenue: { $sum: '$total' },
          },
        },
      ]),

      // Active unread alerts
      StockAlert.countDocuments({ businessId, isDismissed: false, isRead: false }),
    ]);

    const inv = inventoryStats[0] || {
      totalProducts: 0,
      totalStockUnits: 0,
      inventoryValuation: 0,
      retailValuation: 0,
      outOfStockCount: 0,
      lowStockCount: 0,
    };

    const today = todaySales[0] || {
      todayRevenue: 0,
      todayTransactions: 0,
      todayUnitsSold: 0,
    };

    const yesterdayRev = yesterdaySales[0]?.yesterdayRevenue || 0;
    const revenueChangePercent = yesterdayRev > 0
      ? parseFloat((((today.todayRevenue - yesterdayRev) / yesterdayRev) * 100).toFixed(1))
      : 0;

    return successResponse(res, 200, 'Dashboard KPIs retrieved', {
      kpi: {
        totalProducts: inv.totalProducts,
        totalStockUnits: inv.totalStockUnits,
        lowStockItems: inv.lowStockCount,
        outOfStockItems: inv.outOfStockCount,
        todayRevenue: parseFloat(today.todayRevenue.toFixed(2)),
        todayTransactions: today.todayTransactions,
        todayUnitsSold: today.todayUnitsSold,
        inventoryValuation: parseFloat(inv.inventoryValuation.toFixed(2)),
        retailValuation: parseFloat(inv.retailValuation.toFixed(2)),
        potentialProfit: parseFloat((inv.retailValuation - inv.inventoryValuation).toFixed(2)),
        revenueChangePercent,
        unreadAlertsCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sales trends and top-performing products
 */
const getSalesAnalytics = async (req, res, next) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.user.businessId);
    const { days = 14 } = req.query;

    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - parseInt(days, 10));

    // Daily Sales aggregation
    const dailyTrend = await Sale.aggregate([
      {
        $match: {
          businessId,
          status: 'COMPLETED',
          createdAt: { $gte: lookbackDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          transactions: { $sum: 1 },
          units: { $sum: { $sum: '$items.quantity' } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          revenue: { $round: ['$revenue', 2] },
          transactions: 1,
          units: 1,
        },
      },
    ]);

    // Top selling products in this timeframe
    const topProducts = await Sale.aggregate([
      {
        $match: {
          businessId,
          status: 'COMPLETED',
          createdAt: { $gte: lookbackDate },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          SKU: { $first: '$items.SKU' },
          totalUnitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 6 },
      {
        $project: {
          _id: 1,
          productName: 1,
          SKU: 1,
          totalUnitsSold: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
        },
      },
    ]);

    return successResponse(res, 200, 'Sales analytics retrieved', {
      dailyTrend,
      topProducts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get category distribution and inventory health metrics
 */
const getInventoryAnalytics = async (req, res, next) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.user.businessId);

    const [categoryDistribution, stockHealth] = await Promise.all([
      // Category Breakdown
      Product.aggregate([
        { $match: { businessId, isArchived: false } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            stockUnits: { $sum: '$currentStock' },
            valuation: {
              $sum: { $multiply: ['$currentStock', '$purchasePrice'] },
            },
          },
        },
        { $sort: { valuation: -1 } },
        {
          $project: {
            _id: 0,
            category: '$_id',
            count: 1,
            stockUnits: 1,
            valuation: { $round: ['$valuation', 2] },
          },
        },
      ]),

      // Stock health distribution (Out of Stock, Low Stock, Optimal, Overstock)
      Product.aggregate([
        { $match: { businessId, isArchived: false } },
        {
          $project: {
            status: {
              $cond: [
                { $lte: ['$currentStock', 0] },
                'Out of Stock',
                {
                  $cond: [
                    { $lte: ['$currentStock', '$minimumStock'] },
                    'Low Stock',
                    {
                      $cond: [
                        {
                          $and: [
                            { $gt: ['$maximumStock', 0] },
                            { $gt: ['$currentStock', '$maximumStock'] },
                          ],
                        },
                        'Overstocked',
                        'Optimal',
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            status: '$_id',
            count: 1,
          },
        },
      ]),
    ]);

    return successResponse(res, 200, 'Inventory analytics retrieved', {
      categoryDistribution,
      stockHealth,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent activity feed (sales, movements, adjustments)
 */
const getRecentActivity = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;

    const [recentMovements, recentSales] = await Promise.all([
      InventoryMovement.find({ businessId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('productId', 'productName SKU category')
        .populate('performedBy', 'name email role')
        .lean(),

      Sale.find({ businessId })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('cashierId', 'name')
        .lean(),
    ]);

    return successResponse(res, 200, 'Recent activity retrieved', {
      recentMovements,
      recentSales,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  getSalesAnalytics,
  getInventoryAnalytics,
  getRecentActivity,
};
