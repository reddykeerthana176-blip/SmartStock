import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useOffline } from '../../context/OfflineContext';
import { queueOfflineOperation } from '../../offline/indexedDB';
import api from '../../services/api';
import { ArrowDownLeft, ArrowUpRight, Sliders } from 'lucide-react';

export const StockMovementModal = ({ isOpen, onClose, product, onUpdated }) => {
  const { isOnline, refreshPendingCount } = useOffline();
  const [movementType, setMovementType] = useState('STOCK_IN'); // STOCK_IN, STOCK_OUT, ADJUSTMENT
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!product) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError('Please provide a valid quantity greater than zero');
      setLoading(false);
      return;
    }

    try {
      if (!isOnline) {
        // Queue operation for offline background sync
        if (movementType === 'STOCK_IN') {
          await queueOfflineOperation({
            entityType: 'STOCK_IN',
            action: 'STOCK_IN',
            payload: {
              productId: product._id,
              quantity: parsedQty,
              reason: reason || 'Offline Stock-In',
            },
          });
          await refreshPendingCount();
          onUpdated();
          onClose();
          return;
        } else {
          setError('Offline adjustments for stock-out are restricted to prevent data collisions.');
          setLoading(false);
          return;
        }
      }

      // Online API Execution
      if (movementType === 'STOCK_IN') {
        await api.post('/stock/in', {
          productId: product._id,
          quantity: parsedQty,
          reason,
        });
      } else if (movementType === 'STOCK_OUT') {
        await api.post('/stock/out', {
          productId: product._id,
          quantity: parsedQty,
          reason: reason || 'Manual stock deduction',
        });
      } else {
        // ADJUSTMENT
        await api.post('/stock/adjust', {
          productId: product._id,
          newStock: parsedQty,
          reason: reason || 'Physical inventory audit',
        });
      }

      onUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Inventory Stock"
      maxWidth="max-w-md"
    >
      <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-100 dark:border-gray-800 text-xs">
        <p className="font-semibold text-gray-900 dark:text-white truncate">
          {product.productName}
        </p>
        <div className="flex justify-between mt-1 text-gray-500 dark:text-gray-400">
          <span>SKU: {product.SKU}</span>
          <span>Current Stock: <strong className="text-brand-600 dark:text-brand-400">{product.currentStock} units</strong></span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      {/* Movement Type Tabs */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMovementType('STOCK_IN')}
          className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-medium border transition ${
            movementType === 'STOCK_IN'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
              : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 mb-1 text-emerald-500" />
          <span>Stock In</span>
        </button>

        <button
          type="button"
          onClick={() => setMovementType('STOCK_OUT')}
          className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-medium border transition ${
            movementType === 'STOCK_OUT'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-700 dark:text-red-300'
              : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 mb-1 text-red-500" />
          <span>Stock Out</span>
        </button>

        <button
          type="button"
          onClick={() => setMovementType('ADJUSTMENT')}
          className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-medium border transition ${
            movementType === 'ADJUSTMENT'
              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-brand-500 text-brand-700 dark:text-brand-300'
              : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Sliders className="w-4 h-4 mb-1 text-brand-500" />
          <span>Audit Set</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {movementType === 'ADJUSTMENT' ? 'New Exact Stock Level' : 'Quantity Units'} *
          </label>
          <input
            type="number"
            min={movementType === 'ADJUSTMENT' ? '0' : '1'}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Reason / Reference Note {movementType === 'ADJUSTMENT' ? '*' : '(Optional)'}
          </label>
          <input
            type="text"
            required={movementType === 'ADJUSTMENT'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              movementType === 'STOCK_IN'
                ? 'Supplier PO shipment PO-9021'
                : movementType === 'STOCK_OUT'
                ? 'Damaged, expired, or returned'
                : 'Quarterly stock count variance reconciliation'
            }
            className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-darkBg-border">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Commit Movement
          </Button>
        </div>
      </form>
    </Modal>
  );
};
