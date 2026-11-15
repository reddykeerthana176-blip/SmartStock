import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ReceiptModal } from '../components/sales/ReceiptModal';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { Search, Eye, History, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';

export const SalesHistoryPage = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [selectedSale, setSelectedSale] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const fetchSales = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (search.trim()) params.append('search', search.trim());
      if (paymentMethod && paymentMethod !== 'ALL') params.append('paymentMethod', paymentMethod);

      const res = await api.get(`/sales?${params.toString()}`);
      if (res.data?.success) {
        setSales(res.data.data);
        if (res.data.meta) setMeta(res.data.meta);
      }
    } catch (err) {
      console.warn('[Fetch Sales Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(1);
  }, [paymentMethod]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSales(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Sales & Transaction Ledger
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Audit history of completed sales receipts and customer transactions
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="relative sm:col-span-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Transaction ID or Customer Name..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex gap-2">
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white text-xs"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="CASH">Cash</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="DEBIT_CARD">Debit Card</option>
              <option value="UPI">UPI / QR</option>
            </select>
            <Button type="submit" size="sm">
              Search
            </Button>
          </div>
        </form>
      </Card>

      {/* Sales Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 dark:bg-darkBg-base/75 text-gray-500 font-semibold uppercase text-[11px] border-b border-gray-100 dark:border-darkBg-border">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-darkBg-border">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-400">
                    <History className="w-8 h-8 mx-auto mb-2 stroke-1" />
                    No transactions found
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-gray-50/50 dark:hover:bg-darkBg-hover/50">
                    <td className="py-3 px-4 font-mono font-semibold text-gray-900 dark:text-white">
                      {sale.transactionId}
                    </td>

                    <td className="py-3 px-4 text-gray-500">
                      {formatDateTime(sale.createdAt)}
                    </td>

                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300 font-medium">
                      {sale.customerName || 'Walk-in'}
                    </td>

                    <td className="py-3 px-4 text-gray-500">
                      {sale.items?.length || 0} product(s)
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant="indigo">{sale.paymentMethod}</Badge>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-white">
                      {formatCurrency(sale.total)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedSale(sale);
                          setIsReceiptOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition"
                        title="View printable receipt"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-darkBg-border text-xs text-gray-500">
          <span>Showing {sales.length} of {meta.total} transactions</span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              disabled={meta.page <= 1}
              onClick={() => fetchSales(meta.page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-2">Page {meta.page} of {meta.totalPages || 1}</span>
            <Button
              size="sm"
              variant="secondary"
              disabled={meta.page >= meta.totalPages}
              onClick={() => fetchSales(meta.page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={selectedSale}
      />
    </div>
  );
};
