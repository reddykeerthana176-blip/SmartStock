import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StockLevelBarChart } from '../charts/StockLevelBarChart';
import { CategoryPieChart } from '../charts/CategoryPieChart';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { Download, BarChart3, TrendingUp, PieChart, Layers } from 'lucide-react';

export const ReportsAnalyticsPage = () => {
  const [kpi, setKpi] = useState({});
  const [categoryData, setCategoryData] = useState([]);
  const [stockHealth, setStockHealth] = useState([]);
  const [sampleProducts, setSampleProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [sumRes, invRes, prodRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/inventory'),
          api.get('/products?limit=10&sortBy=stock&order=asc'),
        ]);

        if (sumRes.data?.success) setKpi(sumRes.data.data.kpi);
        if (invRes.data?.success) {
          setCategoryData(invRes.data.data.categoryDistribution);
          setStockHealth(invRes.data.data.stockHealth);
        }
        if (prodRes.data?.success) {
          setSampleProducts(prodRes.data.data);
        }
      } catch (err) {
        console.warn('[Reports Error]', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/products/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_financial_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Failed to export report');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Executive Financial & Inventory Reports
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Valuation distributions, gross profit margins, and turnover risk telemetry
          </p>
        </div>

        <Button size="sm" icon={Download} onClick={handleExportCSV}>
          Export CSV Ledger
        </Button>
      </div>

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Total Inventory Cost Valuation
          </span>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {formatCurrency(kpi.inventoryValuation || 0)}
          </div>
          <span className="text-[11px] text-gray-400">Based on purchase cost prices</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Estimated Retail Asset Value
          </span>
          <div className="text-2xl font-bold text-brand-600 dark:text-brand-400 mt-1">
            {formatCurrency(kpi.retailValuation || 0)}
          </div>
          <span className="text-[11px] text-gray-400">Based on active selling prices</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Projected Catalog Gross Profit
          </span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency((kpi.retailValuation || 0) - (kpi.inventoryValuation || 0))}
          </div>
          <span className="text-[11px] text-emerald-500">
            {kpi.retailValuation > 0
              ? `${Math.round((((kpi.retailValuation || 0) - (kpi.inventoryValuation || 0)) / kpi.retailValuation) * 100)}% overall margin`
              : '0%'}
          </span>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Level vs Threshold Bar Chart */}
        <Card>
          <div className="mb-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              Lowest Stock Items vs. Minimum Alert Threshold
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Visualizing safety margins for items with highest stockout risk
            </p>
          </div>
          <StockLevelBarChart data={sampleProducts} height={280} />
        </Card>

        {/* Category Breakdown Donut */}
        <Card>
          <div className="mb-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              Valuation Share by Category
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Proportionate capital invested per inventory division
            </p>
          </div>
          <CategoryPieChart data={categoryData} height={280} />
        </Card>
      </div>

      {/* Stock Health Breakdown Grid */}
      <Card>
        <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3">
          Inventory Health Status Breakdown
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {stockHealth.map((sh) => (
            <div key={sh.status} className="p-4 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400 block">{sh.status}</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white mt-1 block">
                {sh.count} items
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
