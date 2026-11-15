import React from 'react';
import { Boxes } from 'lucide-react';

export const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-indigo-50/30 dark:from-darkBg-base dark:to-indigo-950/20">
      <div className="w-full max-w-md">
        {/* Brand Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/30 mb-3">
            <Boxes className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-darkBg-card rounded-2xl shadow-xl border border-gray-200/80 dark:border-darkBg-border p-6 sm:p-8">
          {children}
        </div>

        <div className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
          SmartStock &copy; {new Date().getFullYear()} — Intelligent Inventory Cloud Platform
        </div>
      </div>
    </div>
  );
};
