const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', alertController.getAlerts);
router.put('/mark-all-read', alertController.markAllAsRead);
router.put('/:id/read', alertController.markAlertAsRead);
router.put('/:id/dismiss', alertController.dismissAlert);

module.exports = router;
