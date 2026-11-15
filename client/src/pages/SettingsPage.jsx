import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Settings, Building2, Sliders, CheckCircle2 } from 'lucide-react';

export const SettingsPage = () => {
  const { business, updateBusiness } = useAuth();

  const [formData, setFormData] = useState({
    name: business?.name || '',
    phone: business?.phone || '',
    currency: business?.currency || 'USD',
    taxRate: business?.taxRate !== undefined ? String(business.taxRate) : '8.25',
    defaultLowStockThreshold: business?.settings?.defaultLowStockThreshold || 10,
    defaultLeadTimeDays: business?.settings?.defaultLeadTimeDays || 5,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        currency: formData.currency,
        taxRate: Number(formData.taxRate),
        settings: {
          defaultLowStockThreshold: Number(formData.defaultLowStockThreshold),
          defaultLeadTimeDays: Number(formData.defaultLeadTimeDays),
        },
      };

      const res = await api.put('/auth/settings', payload);
      if (res.data?.success) {
        updateBusiness(res.data.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update business settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Business & Inventory Configuration
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Configure business metadata, sales tax rate, and baseline restocking algorithms
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {success && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-900">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings successfully saved and synchronized across your business.</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        {/* Business Identity */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-darkBg-border">
            <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              Business Profile & Region
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Registered Business Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Store Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Sales Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                name="taxRate"
                value={formData.taxRate}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Catalog Ceiling
              </label>
              <div className="pt-2">
                <Badge variant="indigo">100,000 Products (Active Limit)</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Restocking & Alert Defaults */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-darkBg-border">
            <Sliders className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              Stock Threshold Defaults
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Default Low-Stock Alert Units
              </label>
              <input
                type="number"
                min="1"
                name="defaultLowStockThreshold"
                value={formData.defaultLowStockThreshold}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Applied when creating new items without explicit threshold
              </span>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Default Supplier Lead Time (Days)
              </label>
              <input
                type="number"
                min="1"
                name="defaultLeadTimeDays"
                value={formData.defaultLeadTimeDays}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Used in predictive restocking calculations when supplier is unassigned
              </span>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={loading} className="px-6">
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
