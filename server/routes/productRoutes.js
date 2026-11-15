const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { validateProduct } = require('../validators/productValidators');

router.use(protect);

router.get('/', productController.getProducts);
router.get('/export/csv', authorize('ADMIN'), productController.exportCSV);
router.post('/import/csv', authorize('ADMIN'), productController.importCSV);
router.get('/:id', productController.getProductById);
router.post('/', authorize('ADMIN'), validateProduct, productController.createProduct);
router.put('/:id', authorize('ADMIN'), productController.updateProduct);
router.delete('/:id', authorize('ADMIN'), productController.deleteProduct);

module.exports = router;
