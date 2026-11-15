/**
 * Format currency with business locale
 */
export const formatCurrency = (amount = 0, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${Number(amount || 0).toFixed(2)}`;
  }
};

/**
 * Format numbers with commas
 */
export const formatNumber = (num = 0) => {
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Format Date to standard readable format
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format Date with time
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Stock status helper
 */
export const getStockStatus = (currentStock, minStock = 10, maxStock = 1000) => {
  if (currentStock <= 0) {
    return { label: 'Out of Stock', color: 'red', bg: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900' };
  }
  if (currentStock <= minStock) {
    return { label: 'Low Stock', color: 'amber', bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900' };
  }
  if (maxStock && currentStock > maxStock) {
    return { label: 'Overstock', color: 'blue', bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900' };
  }
  return { label: 'In Stock', color: 'emerald', bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900' };
};
