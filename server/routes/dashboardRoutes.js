const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/summary', dashboardController.getSummary);
router.get('/sales', dashboardController.getSalesAnalytics);
router.get('/inventory', dashboardController.getInventoryAnalytics);
router.get('/activity', dashboardController.getRecentActivity);

module.exports = router;
