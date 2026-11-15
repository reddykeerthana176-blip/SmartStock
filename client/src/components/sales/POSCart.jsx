import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';
import { useOffline } from '../../context/OfflineContext';
import { queueOfflineOperation } from '../../offline/indexedDB';
import api from '../../services/api';
import { Trash2, Plus, Minus, CreditCard, Banknote, QrCode, ShoppingCart, User } from 'lucide-react';

export const POSCart = ({ items, onUpdateQuantity, onRemoveItem, onClearCart, onSaleCompleted }) => {
  const { isOnline, refreshPendingCount } = useOffline();
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const discountAmount = (subtotal * (parseFloat(discountPercent) || 0)) / 100;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = taxableSubtotal * 0.0825; // 8.25% default tax
  const total = taxableSubtotal + tax;

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setError('');

    const idempotencyKey = `POS-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const transactionId = `TXN-${Date.now()}`;

    const salePayload = {
      transactionId,
      items: items.map((i) => ({
        productId: i._id,
        productName: i.productName,
        SKU: i.SKU,
        barcode: i.barcode,
        quantity: i.quantity,
        unitPrice: i.sellingPrice,
        costPrice: i.purchasePrice,
        subtotal: i.sellingPrice * i.quantity,
      })),
      subtotal,
      discount: discountAmount,
      tax,
      total,
      paymentMethod,
      customerName: customerName || 'Walk-in Customer',
      customerPhone,
      idempotencyKey,
    };

    try {
      if (!isOnline) {
        // Queue sale in IndexedDB while offline
        await queueOfflineOperation({
          entityType: 'SALE',
          action: 'RECORD_SALE',
          payload: salePayload,
          idempotencyKey,
        });

        await refreshPendingCount();
        onSaleCompleted({ ...salePayload, isOffline: true });
        onClearCart();
        return;
      }

      // Online checkout
      const res = await api.post('/sales', salePayload);
      if (res.data?.success) {
        onSaleCompleted(res.data.data);
        onClearCart();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete sale checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-darkBg-card rounded-2xl border border-gray-200 dark:border-darkBg-border shadow-soft flex flex-col h-full">
      {/* Cart Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-darkBg-border">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h3 className="font-bold text-sm text-gray-900 dark:text-white">
            Current Order ({items.length})
          </h3>
        </div>
        {items.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {error && (
        <div className="m-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      {/* Line items list */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[350px]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
            <ShoppingCart className="w-8 h-8 mb-2 stroke-1" />
            <p className="text-xs">Cart is empty. Select products to begin sale.</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item._id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-100 dark:border-gray-800 text-xs"
            >
              <div className="truncate pr-2">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {item.productName}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {formatCurrency(item.sellingPrice)} each &middot; SKU: {item.SKU}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-darkBg-card">
                  <button
                    onClick={() => onUpdateQuantity(item._id, item.quantity - 1)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Minus className="w-3 h-3 text-gray-500" />
                  </button>
                  <span className="px-2 font-bold text-gray-800 dark:text-gray-200">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Plus className="w-3 h-3 text-gray-500" />
                  </button>
                </div>

                <span className="font-bold text-gray-900 dark:text-white w-14 text-right">
                  {formatCurrency(item.sellingPrice * item.quantity)}
                </span>

                <button
                  onClick={() => onRemoveItem(item._id)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Customer Info */}
      <div className="p-4 border-t border-gray-100 dark:border-darkBg-border space-y-3 bg-gray-50/50 dark:bg-darkBg-base/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer Name"
            className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-darkBg-card border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
          />
          <div className="flex items-center gap-1 w-24">
            <span className="text-xs text-gray-400">% Disc:</span>
            <input
              type="number"
              min="0"
              max="100"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className="w-12 px-2 py-1.5 rounded-lg bg-white dark:bg-darkBg-card border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white text-center"
            />
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
            Payment Method
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'CASH', label: 'Cash', icon: Banknote },
              { id: 'CREDIT_CARD', label: 'Card', icon: CreditCard },
              { id: 'UPI', label: 'UPI / QR', icon: QrCode },
            ].map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => setPaymentMethod(pm.id)}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                  paymentMethod === pm.id
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-semibold'
                    : 'border-gray-200 dark:border-darkBg-border text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-darkBg-card'
                }`}
              >
                <pm.icon className="w-3.5 h-3.5" />
                <span>{pm.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-1 text-xs pt-2 border-t border-gray-200 dark:border-darkBg-border">
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Discount ({discountPercent}%)</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>Tax (8.25%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-1">
            <span>Total</span>
            <span className="text-brand-600 dark:text-brand-400">{formatCurrency(total)}</span>
          </div>
        </div>

        <Button
          onClick={handleCheckout}
          disabled={items.length === 0 || loading}
          loading={loading}
          className="w-full py-2.5 text-sm font-bold shadow-md shadow-brand-500/20"
        >
          Complete Sale &bull; {formatCurrency(total)}
        </Button>
      </div>
    </div>
  );
};
