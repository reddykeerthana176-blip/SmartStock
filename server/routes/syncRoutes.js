const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/batch', syncController.batchSync);
router.get('/status', syncController.getSyncStatus);

module.exports = router;
