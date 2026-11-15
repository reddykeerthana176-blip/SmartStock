import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Truck, Plus, Mail, Phone, Edit, Trash2, Clock, Package } from 'lucide-react';

export const SuppliersPage = () => {
  const { isAdmin } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    leadTimeDays: 5,
    notes: '',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers');
      if (res.data?.success) setSuppliers(res.data.data);
    } catch (err) {
      console.warn('[Fetch Suppliers Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      leadTimeDays: 5,
      notes: '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name || '',
      contactPerson: sup.contactPerson || '',
      email: sup.email || '',
      phone: sup.phone || '',
      address: sup.address || '',
      leadTimeDays: sup.leadTimeDays || 5,
      notes: sup.notes || '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');

    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier._id}`, formData);
      } else {
        await api.post('/suppliers', formData);
      }
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save supplier');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (sup) => {
    if (!window.confirm(`Delete supplier '${sup.name}'?`)) return;
    try {
      await api.delete(`/suppliers/${sup._id}`);
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete supplier');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Suppliers & Vendor Management
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Configure supplier order lead times to empower accurate predictive restocking calculations
          </p>
        </div>

        {isAdmin && (
          <Button size="sm" icon={Plus} onClick={handleOpenAdd}>
            Add Supplier
          </Button>
        )}
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {suppliers.map((sup) => (
          <Card key={sup._id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                    {sup.name}
                  </h4>
                  <p className="text-xs text-gray-500">{sup.contactPerson || 'Lead Representative'}</p>
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(sup)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(sup)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-darkBg-border space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
              {sup.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span>{sup.email}</span>
                </div>
              )}
              {sup.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{sup.phone}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-darkBg-border flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-gray-500">
                <Clock className="w-3.5 h-3.5 text-brand-500" />
                Lead Time: <strong>{sup.leadTimeDays} days</strong>
              </span>

              <Badge variant="gray">
                <Package className="w-3 h-3 mr-1" />
                {sup.productCount || 0} Products
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-medium border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Supplier Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Nexus Electronics Global"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Contact Person
            </label>
            <input
              type="text"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              placeholder="e.g. David Chen"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="orders@supplier.com"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Order Lead Time (Days) * (Used in Reorder Point calculation)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              required
              value={formData.leadTimeDays}
              onChange={(e) => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value, 10) || 5 })}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white font-bold"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-darkBg-border">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={modalLoading}>
              Save Supplier
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
