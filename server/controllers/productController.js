const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const config = require('../config/env');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');
const { logAuditEvent } = require('../middleware/auditLogger');
const { checkAndGenerateAlerts } = require('../services/alertEngine');
const { jsonToCsv, parseCsv } = require('../services/csvService');
const { emitToBusiness } = require('../config/socket');

/**
 * Get paginated list of products with filters and search
 */
const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category = '',
      stockStatus = '',
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = {
      businessId: req.user.businessId,
      isArchived: false,
    };

    // Category filter
    if (category && category !== 'ALL') {
      query.category = category;
    }

    // Search query (productName, SKU, or barcode)
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { productName: regex },
        { SKU: regex },
        { barcode: regex },
        { description: regex },
      ];
    }

    // Stock Status filters
    if (stockStatus === 'OUT_OF_STOCK') {
      query.currentStock = { $lte: 0 };
    } else if (stockStatus === 'LOW_STOCK') {
      query.$expr = {
        $and: [
          { $gt: ['$currentStock', 0] },
          { $lte: ['$currentStock', '$minimumStock'] },
        ],
      };
    } else if (stockStatus === 'OVERSTOCK') {
      query.$expr = {
        $and: [
          { $gt: ['$maximumStock', 0] },
          { $gt: ['$currentStock', '$maximumStock'] },
        ],
      };
    }

    // Sorting
    const sort = {};
    const sortOrder = order === 'asc' ? 1 : -1;
    if (sortBy === 'stock' || sortBy === 'currentStock') {
      sort.currentStock = sortOrder;
    } else if (sortBy === 'price' || sortBy === 'sellingPrice') {
      sort.sellingPrice = sortOrder;
    } else if (sortBy === 'name' || sortBy === 'productName') {
      sort.productName = sortOrder;
    } else {
      sort.createdAt = sortOrder;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parsedLimit)
        .populate('supplierId', 'name contactPerson leadTimeDays')
        .lean(),
      Product.countDocuments(query),
    ]);

    return paginatedResponse(res, products, page, parsedLimit, total, 'Products fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get product details by ID along with recent stock movements
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({
      _id: id,
      businessId: req.user.businessId,
      isArchived: false,
    }).populate('supplierId');

    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    // Fetch recent stock movements for this product
    const movements = await InventoryMovement.find({
      businessId: req.user.businessId,
      productId: id,
    })
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('performedBy', 'name email role');

    return successResponse(res, 200, 'Product retrieved', {
      product,
      recentMovements: movements,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new product with 100,000 product limit enforcement
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      productName,
      SKU,
      barcode,
      category,
      description,
      purchasePrice,
      sellingPrice,
      currentStock,
      minimumStock,
      maximumStock,
      supplierId,
      location,
      image,
    } = req.body;

    const businessId = req.user.businessId;

    // Safe concurrent limit enforcement: count existing unarchived products
    const currentCount = await Product.countDocuments({ businessId, isArchived: false });
    if (currentCount >= config.maxProductsPerBusiness) {
      return errorResponse(
        res,
        400,
        `Maximum inventory limit reached. Your business has reached the 100,000 item capacity.`
      );
    }

    // Check duplicate SKU in this business
    const existingSku = await Product.findOne({
      businessId,
      SKU: SKU.trim().toUpperCase(),
      isArchived: false,
    });
    if (existingSku) {
      return errorResponse(res, 409, `A product with SKU '${SKU.toUpperCase()}' already exists.`);
    }

    // Check duplicate barcode in this business (if provided)
    if (barcode && barcode.trim()) {
      const existingBarcode = await Product.findOne({
        businessId,
        barcode: barcode.trim(),
        isArchived: false,
      });
      if (existingBarcode) {
        return errorResponse(res, 409, `A product with barcode '${barcode.trim()}' already exists.`);
      }
    }

    const initialStock = Math.max(0, Number(currentStock || 0));

    const product = await Product.create({
      businessId,
      productName: productName.trim(),
      SKU: SKU.trim().toUpperCase(),
      barcode: barcode ? barcode.trim() : '',
      category: category.trim(),
      description: description || '',
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      currentStock: initialStock,
      minimumStock: minimumStock !== undefined ? Number(minimumStock) : 10,
      maximumStock: maximumStock !== undefined ? Number(maximumStock) : 1000,
      supplierId: supplierId || null,
      location: location || '',
      image: image || '',
    });

    // Record initial inventory movement if stock > 0
    if (initialStock > 0) {
      await InventoryMovement.create({
        businessId,
        productId: product._id,
        type: 'STOCK_IN',
        quantity: initialStock,
        previousStock: 0,
        newStock: initialStock,
        referenceType: 'INITIAL',
        reason: 'Initial stock intake upon product creation',
        performedBy: req.user.id,
      });
    }

    // Evaluate stock threshold
    await checkAndGenerateAlerts(product, businessId);

    // Audit log
    await logAuditEvent({
      businessId,
      user: req.user,
      action: 'PRODUCT_CREATED',
      entityType: 'PRODUCT',
      entityId: product._id,
      details: { productName: product.productName, SKU: product.SKU, initialStock },
      req,
    });

    emitToBusiness(businessId, 'product:created', product);

    return successResponse(res, 201, 'Product created successfully', product);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing product
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    const product = await Product.findOne({ _id: id, businessId, isArchived: false });
    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    const {
      productName,
      SKU,
      barcode,
      category,
      description,
      purchasePrice,
      sellingPrice,
      minimumStock,
      maximumStock,
      supplierId,
      location,
      image,
    } = req.body;

    // Validate SKU uniqueness if altered
    if (SKU && SKU.trim().toUpperCase() !== product.SKU) {
      const skuConflict = await Product.findOne({
        businessId,
        SKU: SKU.trim().toUpperCase(),
        _id: { $ne: id },
        isArchived: false,
      });
      if (skuConflict) {
        return errorResponse(res, 409, `SKU '${SKU.toUpperCase()}' is already in use by another product.`);
      }
      product.SKU = SKU.trim().toUpperCase();
    }

    // Validate Barcode uniqueness if altered
    if (barcode && barcode.trim() !== product.barcode) {
      const barcodeConflict = await Product.findOne({
        businessId,
        barcode: barcode.trim(),
        _id: { $ne: id },
        isArchived: false,
      });
      if (barcodeConflict) {
        return errorResponse(res, 409, `Barcode '${barcode.trim()}' is already assigned to another product.`);
      }
      product.barcode = barcode.trim();
    }

    if (productName) product.productName = productName.trim();
    if (category) product.category = category.trim();
    if (description !== undefined) product.description = description;
    if (purchasePrice !== undefined) product.purchasePrice = Number(purchasePrice);
    if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
    if (minimumStock !== undefined) product.minimumStock = Number(minimumStock);
    if (maximumStock !== undefined) product.maximumStock = Number(maximumStock);
    if (supplierId !== undefined) product.supplierId = supplierId || null;
    if (location !== undefined) product.location = location;
    if (image !== undefined) product.image = image;

    await product.save();

    // Check alert status
    await checkAndGenerateAlerts(product, businessId);

    await logAuditEvent({
      businessId,
      user: req.user,
      action: 'PRODUCT_UPDATED',
      entityType: 'PRODUCT',
      entityId: product._id,
      details: { productName: product.productName },
      req,
    });

    emitToBusiness(businessId, 'product:updated', product);

    return successResponse(res, 200, 'Product updated successfully', product);
  } catch (error) {
    next(error);
  }
};

/**
 * Archive / Delete product (Soft delete to preserve relational sales history)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    const product = await Product.findOne({ _id: id, businessId, isArchived: false });
    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    product.isArchived = true;
    await product.save();

    await logAuditEvent({
      businessId,
      user: req.user,
      action: 'PRODUCT_ARCHIVED',
      entityType: 'PRODUCT',
      entityId: product._id,
      details: { productName: product.productName, SKU: product.SKU },
      req,
    });

    emitToBusiness(businessId, 'product:deleted', { productId: id });

    return successResponse(res, 200, 'Product removed from active inventory');
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk CSV Export
 */
const exportCSV = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const products = await Product.find({ businessId, isArchived: false }).lean();

    const fields = [
      { key: 'productName', label: 'Product Name' },
      { key: 'SKU', label: 'SKU' },
      { key: 'barcode', label: 'Barcode' },
      { key: 'category', label: 'Category' },
      { key: 'purchasePrice', label: 'Purchase Price' },
      { key: 'sellingPrice', label: 'Selling Price' },
      { key: 'currentStock', label: 'Current Stock' },
      { key: 'minimumStock', label: 'Min Stock' },
      { key: 'maximumStock', label: 'Max Stock' },
      { key: 'location', label: 'Location' },
      { key: 'description', label: 'Description' },
    ];

    const csvData = jsonToCsv(products, fields);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products_inventory.csv');
    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk CSV Import with limit validation
 */
const importCSV = async (req, res, next) => {
  try {
    const { csvContent } = req.body;
    if (!csvContent) {
      return errorResponse(res, 400, 'CSV content string is required');
    }

    const businessId = req.user.businessId;
    const parsedRows = parseCsv(csvContent);

    if (parsedRows.length === 0) {
      return errorResponse(res, 400, 'No valid product rows found in CSV');
    }

    const currentCount = await Product.countDocuments({ businessId, isArchived: false });
    if (currentCount + parsedRows.length > config.maxProductsPerBusiness) {
      return errorResponse(
        res,
        400,
        `Import would exceed the 100,000 product limit. Current: ${currentCount}, Attempting to import: ${parsedRows.length}`
      );
    }

    let importedCount = 0;
    const errors = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const name = row['Product Name'] || row.productName || row.name;
      const sku = (row['SKU'] || row.sku || '').toUpperCase();
      const category = row['Category'] || row.category || 'General';
      const purchasePrice = parseFloat(row['Purchase Price'] || row.purchasePrice || 0);
      const sellingPrice = parseFloat(row['Selling Price'] || row.sellingPrice || 0);
      const currentStock = parseInt(row['Current Stock'] || row.currentStock || 0, 10);
      const barcode = row['Barcode'] || row.barcode || '';

      if (!name || !sku) {
        errors.push(`Row ${i + 1}: Missing Product Name or SKU`);
        continue;
      }

      // Check duplicate SKU
      const existing = await Product.findOne({ businessId, SKU: sku, isArchived: false });
      if (existing) {
        errors.push(`Row ${i + 1}: SKU '${sku}' already exists. Skipped.`);
        continue;
      }

      const newProd = await Product.create({
        businessId,
        productName: name,
        SKU: sku,
        barcode,
        category,
        purchasePrice,
        sellingPrice,
        currentStock,
        minimumStock: parseInt(row['Min Stock'] || row.minimumStock || 10, 10),
        maximumStock: parseInt(row['Max Stock'] || row.maximumStock || 500, 10),
        location: row['Location'] || row.location || '',
      });

      if (currentStock > 0) {
        await InventoryMovement.create({
          businessId,
          productId: newProd._id,
          type: 'STOCK_IN',
          quantity: currentStock,
          previousStock: 0,
          newStock: currentStock,
          referenceType: 'INITIAL',
          reason: 'CSV Bulk Import intake',
          performedBy: req.user.id,
        });
      }

      importedCount++;
    }

    return successResponse(res, 200, `CSV Import completed: ${importedCount} products added.`, {
      importedCount,
      failedCount: errors.length,
      errors,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  exportCSV,
  importCSV,
};
