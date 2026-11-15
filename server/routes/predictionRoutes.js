const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/', predictionController.getPredictions);
router.post('/recalculate', authorize('ADMIN'), predictionController.triggerRecalculate);
router.get('/:productId', predictionController.getProductPrediction);

module.exports = router;
