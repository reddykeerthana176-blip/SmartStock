const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/', supplierController.getSuppliers);
router.post('/', authorize('ADMIN'), supplierController.createSupplier);
router.put('/:id', authorize('ADMIN'), supplierController.updateSupplier);
router.delete('/:id', authorize('ADMIN'), supplierController.deleteSupplier);

module.exports = router;
