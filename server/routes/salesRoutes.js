const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { protect } = require('../middleware/auth');
const { validateSale } = require('../validators/stockValidators');

router.use(protect);

router.post('/', validateSale, salesController.createSale);
router.get('/', salesController.getSales);
router.get('/:id', salesController.getSaleById);

module.exports = router;
