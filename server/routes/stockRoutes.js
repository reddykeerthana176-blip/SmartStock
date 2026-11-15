const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  validateStockIn,
  validateStockOut,
  validateStockAdjust,
} = require('../validators/stockValidators');

router.use(protect);

router.post('/in', validateStockIn, stockController.stockIn);
router.post('/out', authorize('ADMIN'), validateStockOut, stockController.stockOut);
router.post('/adjust', authorize('ADMIN'), validateStockAdjust, stockController.stockAdjust);
router.get('/movements', stockController.getMovements);

module.exports = router;
