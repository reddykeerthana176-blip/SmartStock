import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export const AddProductPage = () => {
  const navigate = useNavigate();

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
    api.get('/suppliers').then((res) => {
      if (res.data?.success) setSuppliers(res.data.data);
    }).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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

      await api.post('/products', payload);
      navigate('/inventory');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Add New Inventory Product
        </h2>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-medium border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                name="productName"
                required
                value={formData.productName}
                onChange={handleChange}
                placeholder="e.g. Ergonomic Keyboard"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                SKU *
              </label>
              <input
                type="text"
                name="SKU"
                required
                value={formData.SKU}
                onChange={handleChange}
                placeholder="e.g. KB-ERG-01"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Barcode / UPC
              </label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                placeholder="e.g. 7891234567890"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <input
                type="text"
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                placeholder="Electronics"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Supplier
              </label>
              <select
                name="supplierId"
                value={formData.supplierId}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">No Supplier Assigned</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.leadTimeDays}d lead time)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Purchase Cost ($) *
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Retail Selling Price ($) *
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Initial Stock Intake
              </label>
              <input
                type="number"
                min="0"
                name="currentStock"
                value={formData.currentStock}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Minimum Stock (Alert Threshold)
              </label>
              <input
                type="number"
                min="0"
                name="minimumStock"
                value={formData.minimumStock}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Storage Location (Bin / Aisle)
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Aisle 1, Shelf B"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Description & Specifications
            </label>
            <textarea
              rows="3"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Specifications, supplier codes, warranty info..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-darkBg-border">
            <Button type="button" variant="secondary" onClick={() => navigate('/inventory')}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Product & Initialize Stock
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
