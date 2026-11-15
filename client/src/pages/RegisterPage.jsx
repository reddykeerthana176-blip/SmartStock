import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../layouts/AuthLayout';
import { Button } from '../components/ui/Button';
import { Building2, User, Mail, Lock, DollarSign, AlertCircle } from 'lucide-react';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    businessName: '',
    name: '',
    email: '',
    password: '',
    currency: 'USD',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await register(formData);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Business Account"
      subtitle="Start intelligent inventory management today"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium border border-red-200 dark:border-red-900">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Business / Store Name *
          </label>
          <div className="relative">
            <input
              type="text"
              name="businessName"
              required
              value={formData.businessName}
              onChange={handleChange}
              placeholder="e.g. Apex Hardware & Supplies"
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Administrator Full Name *
          </label>
          <div className="relative">
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Sarah Connor"
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Work Email Address *
          </label>
          <div className="relative">
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="owner@yourcompany.com"
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Password (min. 6 characters) *
          </label>
          <div className="relative">
            <input
              type="password"
              name="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Operating Currency
          </label>
          <div className="relative">
            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="USD">USD ($ - US Dollar)</option>
              <option value="EUR">EUR (€ - Euro)</option>
              <option value="GBP">GBP (£ - British Pound)</option>
              <option value="CAD">CAD ($ - Canadian Dollar)</option>
              <option value="INR">INR (₹ - Indian Rupee)</option>
              <option value="AUD">AUD ($ - Australian Dollar)</option>
            </select>
            <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <Button type="submit" loading={loading} className="w-full py-2.5 font-bold shadow-md shadow-brand-500/20">
          Create Business Account
        </Button>

        <div className="text-center pt-2 text-xs text-gray-500 dark:text-gray-400">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
            Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
