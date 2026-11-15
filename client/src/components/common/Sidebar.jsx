import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Boxes,
  Barcode,
  ShoppingBag,
  History,
  BellRing,
  TrendingUp,
  Truck,
  BarChart3,
  Users2,
  Settings,
  PackagePlus,
  LogOut,
  Sparkles,
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, business, isAdmin, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Inventory', href: '/inventory', icon: Boxes },
    ...(isAdmin ? [{ name: 'Add Product', href: '/products/new', icon: PackagePlus }] : []),
    { name: 'Barcode Scanner', href: '/scanner', icon: Barcode },
    { name: 'Point of Sale', href: '/sales/new', icon: ShoppingBag },
    { name: 'Sales History', href: '/sales', icon: History },
    { name: 'Stock Alerts', href: '/alerts', icon: BellRing },
    ...(isAdmin
      ? [
          { name: 'Predictive Restock', href: '/predictions', icon: TrendingUp, badge: 'AI' },
          { name: 'Suppliers', href: '/suppliers', icon: Truck },
          { name: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
          { name: 'Staff Management', href: '/staff', icon: Users2 },
          { name: 'Settings', href: '/settings', icon: Settings },
        ]
      : [{ name: 'Suppliers', href: '/suppliers', icon: Truck }]),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-darkBg-card border-r border-gray-200 dark:border-darkBg-border flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-100 dark:border-darkBg-border">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-brand-500/30">
            <Boxes className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h1 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
              SmartStock
            </h1>
            <p className="text-[11px] font-medium text-brand-600 dark:text-brand-400 truncate">
              {business?.name || 'Inventory SaaS'}
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => onClose && onClose()}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100/70 dark:hover:bg-darkBg-hover'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  <Sparkles className="w-2.5 h-2.5" />
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-gray-100 dark:border-darkBg-border">
          <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-brand-600/10 text-brand-600 dark:text-brand-400 font-bold flex items-center justify-center text-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {user?.role}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
