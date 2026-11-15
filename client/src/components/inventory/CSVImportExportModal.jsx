import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import api from '../../services/api';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';

export const CSVImportExportModal = ({ isOpen, onClose, onImportCompleted }) => {
  const [tab, setTab] = useState('import'); // 'import' | 'export'
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);
  const [error, setError] = useState('');

  const sampleCsvTemplate = `Product Name,SKU,Barcode,Category,Purchase Price,Selling Price,Current Stock,Min Stock,Max Stock,Location
Premium Wireless Earbuds,ELEC-EAR-01,890123456701,Electronics,29.50,69.99,50,15,200,Aisle 1
Stainless Steel Water Bottle,LIF-BOT-02,890123456702,Lifestyle,6.00,18.00,100,20,300,Aisle 4
Mechanical Keyboard Switch Pack,ACC-SWI-03,890123456703,Accessories,12.00,24.99,35,10,150,Aisle 2`;

  const handleExport = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `smartstock_inventory_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError('Failed to download inventory CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      setError('Please paste or upload CSV text content');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResultMessage(null);

      const res = await api.post('/products/import/csv', { csvContent: csvText });
      if (res.data?.success) {
        setResultMessage(res.data.message);
        setCsvText('');
        onImportCompleted();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'CSV Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="CSV Bulk Operations"
      maxWidth="max-w-xl"
    >
      <div className="flex border-b border-gray-200 dark:border-darkBg-border mb-4">
        <button
          onClick={() => { setTab('import'); setError(''); setResultMessage(null); }}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
            tab === 'import'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Bulk Import Products
        </button>
        <button
          onClick={() => { setTab('export'); setError(''); setResultMessage(null); }}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
            tab === 'export'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Export Inventory CSV
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      {resultMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-900">
          {resultMessage}
        </div>
      )}

      {tab === 'import' ? (
        <div className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-medium text-gray-700 dark:text-gray-300">
                Paste CSV or Upload File
              </label>
              <button
                type="button"
                onClick={() => setCsvText(sampleCsvTemplate)}
                className="text-brand-600 dark:text-brand-400 hover:underline"
              >
                Insert sample template
              </button>
            </div>
            <textarea
              rows="6"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Product Name,SKU,Barcode,Category,Purchase Price,Selling Price,Current Stock,Min Stock,Max Stock,Location..."
              className="w-full font-mono text-[11px] p-3 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="cursor-pointer inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50">
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Upload .csv file
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-darkBg-border">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleImport} loading={loading}>
              Run CSV Import
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 py-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-brand-600 dark:text-brand-400 mx-auto flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Export Complete Inventory Dataset
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              Download your entire active product catalog, SKU codes, pricing, stock levels, and threshold limits as a CSV file.
            </p>
          </div>
          <Button onClick={handleExport} loading={loading} icon={Download}>
            Download CSV Spreadsheet
          </Button>
        </div>
      )}
    </Modal>
  );
};
