const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const stockRoutes = require('./stockRoutes');
const barcodeRoutes = require('./barcodeRoutes');
const salesRoutes = require('./salesRoutes');
const alertRoutes = require('./alertRoutes');
const predictionRoutes = require('./predictionRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const supplierRoutes = require('./supplierRoutes');
const staffRoutes = require('./staffRoutes');
const syncRoutes = require('./syncRoutes');

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/stock', stockRoutes);
router.use('/barcode', barcodeRoutes);
router.use('/sales', salesRoutes);
router.use('/alerts', alertRoutes);
router.use('/predictions', predictionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/staff', staffRoutes);
router.use('/sync', syncRoutes);

module.exports = router;
