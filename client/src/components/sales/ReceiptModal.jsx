import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { Printer, CheckCircle2 } from 'lucide-react';

export const ReceiptModal = ({ isOpen, onClose, sale }) => {
  const { business } = useAuth();
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaction Completed" maxWidth="max-w-md">
      <div className="text-center pb-4 border-b border-gray-100 dark:border-darkBg-border">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h4 className="font-bold text-base text-gray-900 dark:text-white">
          Payment Successful
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Transaction ID: <span className="font-mono text-gray-700 dark:text-gray-300">{sale.transactionId}</span>
        </p>
      </div>

      {/* Printable Receipt Section */}
      <div id="receipt-print-area" className="py-4 space-y-3 font-mono text-xs">
        <div className="text-center text-[11px] text-gray-500">
          <p className="font-bold text-gray-800 dark:text-gray-200 uppercase">{business?.name || 'SmartStock Retail'}</p>
          <p>{formatDateTime(sale.createdAt || new Date())}</p>
          <p>Cashier: {sale.customerName ? `Customer: ${sale.customerName}` : 'Standard Register'}</p>
        </div>

        <div className="border-t border-b border-dashed border-gray-200 dark:border-gray-700 py-2 space-y-1.5">
          {sale.items?.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-gray-800 dark:text-gray-200">
              <span className="truncate pr-2">
                {item.quantity}x {item.productName}
              </span>
              <span className="font-semibold shrink-0">
                {formatCurrency(item.subtotal || item.quantity * item.unitPrice)}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-right text-gray-600 dark:text-gray-300">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount:</span>
              <span>-{formatCurrency(sale.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>{formatCurrency(sale.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-700">
            <span>TOTAL:</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 pt-0.5">
            <span>Payment Method:</span>
            <span>{sale.paymentMethod}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-darkBg-border">
        <Button variant="secondary" onClick={handlePrint} icon={Printer} className="flex-1">
          Print Receipt
        </Button>
        <Button onClick={onClose} className="flex-1">
          New Sale
        </Button>
      </div>
    </Modal>
  );
};
