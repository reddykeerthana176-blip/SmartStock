const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAuditEvent } = require('../middleware/auditLogger');

/**
 * Get all suppliers for business
 */
const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find({
      businessId: req.user.businessId,
    })
      .sort({ name: 1 })
      .lean();

    // Attach product count per supplier
    const supplierIds = suppliers.map((s) => s._id);
    const productCounts = await Product.aggregate([
      {
        $match: {
          businessId: req.user.businessId,
          supplierId: { $in: supplierIds },
          isArchived: false,
        },
      },
      {
        $group: {
          _id: '$supplierId',
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map();
    productCounts.forEach((pc) => countMap.set(pc._id.toString(), pc.count));

    const enrichedSuppliers = suppliers.map((s) => ({
      ...s,
      productCount: countMap.get(s._id.toString()) || 0,
    }));

    return successResponse(res, 200, 'Suppliers retrieved', enrichedSuppliers);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new supplier
 */
const createSupplier = async (req, res, next) => {
  try {
    const { name, contactPerson, email, phone, address, leadTimeDays, notes } = req.body;
    const businessId = req.user.businessId;

    if (!name || !name.trim()) {
      return errorResponse(res, 400, 'Supplier name is required');
    }

    const supplier = await Supplier.create({
      businessId,
      name: name.trim(),
      contactPerson: contactPerson || '',
      email: email ? email.trim().toLowerCase() : '',
      phone: phone || '',
      address: address || '',
      leadTimeDays: leadTimeDays ? Number(leadTimeDays) : 5,
      notes: notes || '',
    });

    await logAuditEvent({
      businessId,
      user: req.user,
      action: 'SUPPLIER_CREATED',
      entityType: 'SUPPLIER',
      entityId: supplier._id,
      details: { supplierName: supplier.name },
      req,
    });

    return successResponse(res, 201, 'Supplier created successfully', supplier);
  } catch (error) {
    next(error);
  }
};

/**
 * Update supplier
 */
const updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, contactPerson, email, phone, address, leadTimeDays, notes, status } = req.body;

    const supplier = await Supplier.findOne({ _id: id, businessId: req.user.businessId });
    if (!supplier) {
      return errorResponse(res, 404, 'Supplier not found');
    }

    if (name) supplier.name = name.trim();
    if (contactPerson !== undefined) supplier.contactPerson = contactPerson;
    if (email !== undefined) supplier.email = email.trim().toLowerCase();
    if (phone !== undefined) supplier.phone = phone;
    if (address !== undefined) supplier.address = address;
    if (leadTimeDays !== undefined) supplier.leadTimeDays = Number(leadTimeDays);
    if (notes !== undefined) supplier.notes = notes;
    if (status !== undefined) supplier.status = status;

    await supplier.save();

    await logAuditEvent({
      businessId: req.user.businessId,
      user: req.user,
      action: 'SUPPLIER_UPDATED',
      entityType: 'SUPPLIER',
      entityId: supplier._id,
      details: { supplierName: supplier.name },
      req,
    });

    return successResponse(res, 200, 'Supplier updated successfully', supplier);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete supplier
 */
const deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    const supplier = await Supplier.findOne({ _id: id, businessId });
    if (!supplier) {
      return errorResponse(res, 404, 'Supplier not found');
    }

    // Check if products are tied to this supplier
    const linkedProductCount = await Product.countDocuments({
      businessId,
      supplierId: id,
      isArchived: false,
    });

    if (linkedProductCount > 0) {
      return errorResponse(
        res,
        400,
        `Cannot delete supplier. ${linkedProductCount} active product(s) are assigned to this supplier. Reassign them first.`
      );
    }

    await Supplier.deleteOne({ _id: id, businessId });

    await logAuditEvent({
      businessId,
      user: req.user,
      action: 'SUPPLIER_DELETED',
      entityType: 'SUPPLIER',
      entityId: id,
      details: { supplierName: supplier.name },
      req,
    });

    return successResponse(res, 200, 'Supplier deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
