import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { formatDateTime } from '../utils/formatters';
import { Users2, Plus, ShieldCheck, User, Trash2 } from 'lucide-react';

export const StaffManagementPage = () => {
  const { user: currentUser } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff');
      if (res.data?.success) setStaff(res.data.data);
    } catch (err) {
      console.warn('[Fetch Staff Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');

    try {
      await api.post('/staff', formData);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'STAFF' });
      fetchStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add staff member');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStatus = async (member) => {
    const nextStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/staff/${member._id}`, { status: nextStatus });
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Remove ${member.name} from business staff roster?`)) return;
    try {
      await api.delete(`/staff/${member._id}`);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete staff member');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Staff & Role-Based Access Control
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Manage cashier permissions, inventory operators, and administrative privileges
          </p>
        </div>

        <Button size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Add Staff Member
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 dark:bg-darkBg-base/75 text-gray-500 font-semibold uppercase text-[11px] border-b border-gray-100 dark:border-darkBg-border">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-darkBg-border">
              {staff.map((member) => (
                <tr key={member._id} className="hover:bg-gray-50/50 dark:hover:bg-darkBg-hover/50">
                  <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-[11px]">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    {member.name} {member._id === currentUser?.id ? '(You)' : ''}
                  </td>

                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {member.email}
                  </td>

                  <td className="py-3 px-4">
                    <Badge variant={member.role === 'ADMIN' ? 'indigo' : 'gray'}>
                      {member.role === 'ADMIN' ? (
                        <ShieldCheck className="w-3 h-3 mr-1 text-brand-500" />
                      ) : (
                        <User className="w-3 h-3 mr-1" />
                      )}
                      {member.role}
                    </Badge>
                  </td>

                  <td className="py-3 px-4">
                    <Badge variant={member.status === 'ACTIVE' ? 'emerald' : 'red'}>
                      {member.status}
                    </Badge>
                  </td>

                  <td className="py-3 px-4 text-gray-400">
                    {member.lastLogin ? formatDateTime(member.lastLogin) : 'Never'}
                  </td>

                  <td className="py-3 px-4 text-right">
                    {member._id !== currentUser?.id && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleStatus(member)}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                          {member.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(member)}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Business Staff Member"
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
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Marcus Brody"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Work Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="staff@smartstock.io"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Initial Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Authorization Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
            >
              <option value="STAFF">STAFF (POS sales, stock-ins, inventory view)</option>
              <option value="ADMIN">ADMIN (Full CRUD, predictions, staff, settings)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-darkBg-border">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={modalLoading}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
