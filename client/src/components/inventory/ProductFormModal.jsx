import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import api from '../../services/api';

export const ProductFormModal = ({ isOpen, onClose, product = null, onSaved }) => {
  const isEditing = !!product;

  const [formData, setFormData] = useState({
    productName: '',
    SKU: '',
    barcode: '',
    category: 'Electronics',
    description: '',
    purchasePrice: '',
    sellingPrice: '',
    currentStock: '0',
    minimumStock: '10',
    maximumStock: '500',
    supplierId: '',
    location: '',
  });

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.get('/suppliers').then((res) => {
        if (res.data?.success) setSuppliers(res.data.data);
      }).catch(() => {});
    }

    if (product) {
      setFormData({
        productName: product.productName || '',
        SKU: product.SKU || '',
        barcode: product.barcode || '',
        category: product.category || 'General',
        description: product.description || '',
        purchasePrice: product.purchasePrice || '',
        sellingPrice: product.sellingPrice || '',
        currentStock: product.currentStock !== undefined ? String(product.currentStock) : '0',
        minimumStock: product.minimumStock !== undefined ? String(product.minimumStock) : '10',
        maximumStock: product.maximumStock !== undefined ? String(product.maximumStock) : '500',
        supplierId: product.supplierId?._id || product.supplierId || '',
        location: product.location || '',
      });
    } else {
      setFormData({
        productName: '',
        SKU: '',
        barcode: '',
        category: 'Electronics',
        description: '',
        purchasePrice: '',
        sellingPrice: '',
        currentStock: '0',
        minimumStock: '10',
        maximumStock: '500',
        supplierId: '',
        location: '',
      });
    }
    setError('');
  }, [product, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        currentStock: Number(formData.currentStock),
        minimumStock: Number(formData.minimumStock),
        maximumStock: Number(formData.maximumStock),
        supplierId: formData.supplierId || null,
      };

      if (isEditing) {
        await api.put(`/products/${product._id}`, payload);
      } else {
        await api.post('/products', payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Product' : 'Add New Inventory Item'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              name="productName"
              required
              value={formData.productName}
              onChange={handleChange}
              placeholder="e.g. Ergonomic Office Chair"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              SKU (Stock Keeping Unit) *
            </label>
            <input
              type="text"
              name="SKU"
              required
              value={formData.SKU}
              onChange={handleChange}
              placeholder="e.g. CHR-ERG-001"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Barcode / UPC / EAN
            </label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              placeholder="e.g. 789123456789"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category *
            </label>
            <input
              type="text"
              name="category"
              required
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g. Electronics, Furniture"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Supplier
            </label>
            <select
              name="supplierId"
              value={formData.supplierId}
              onChange={handleChange}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            >
              <option value="">No Supplier Assigned</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.leadTimeDays}d lead)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cost / Purchase Price ($) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              name="purchasePrice"
              value={formData.purchasePrice}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Retail / Selling Price ($) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              name="sellingPrice"
              value={formData.sellingPrice}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>

          {!isEditing && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Initial Stock Count
              </label>
              <input
                type="number"
                min="0"
                name="currentStock"
                value={formData.currentStock}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Min Stock (Alert Threshold)
            </label>
            <input
              type="number"
              min="0"
              name="minimumStock"
              value={formData.minimumStock}
              onChange={handleChange}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Storage Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Aisle 2, Bin 12"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            rows="2"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Product notes, specifications, or model variations..."
            className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-darkBg-border">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEditing ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
