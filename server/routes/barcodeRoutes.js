const express = require('express');
const router = express.Router();
const barcodeController = require('../controllers/barcodeController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/:code', barcodeController.lookupBarcode);

module.exports = router;
