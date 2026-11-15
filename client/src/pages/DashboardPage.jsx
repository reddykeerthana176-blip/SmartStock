import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { SalesTrendChart } from '../charts/SalesTrendChart';
import { CategoryPieChart } from '../charts/CategoryPieChart';
import { formatCurrency, formatNumber, formatDateTime } from '../utils/formatters';
import {
  Package,
  Layers,
  AlertTriangle,
  XCircle,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Boxes,
} from 'lucide-react';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { lastSaleEvent, lastStockUpdate } = useSocket();

  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({
    totalProducts: 0,
    totalStockUnits: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    todayRevenue: 0,
    inventoryValuation: 0,
    retailValuation: 0,
    revenueChangePercent: 0,
  });

  const [dailyTrend, setDailyTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [urgentPredictions, setUrgentPredictions] = useState([]);
  const [trendDays, setTrendDays] = useState(14);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, salesRes, invRes, actRes, predRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get(`/dashboard/sales?days=${trendDays}`),
        api.get('/dashboard/inventory'),
        api.get('/dashboard/activity'),
        api.get('/predictions?urgency=CRITICAL&limit=4'),
      ]);

      if (summaryRes.data?.success) setKpi(summaryRes.data.data.kpi);
      if (salesRes.data?.success) {
        setDailyTrend(salesRes.data.data.dailyTrend);
        setTopProducts(salesRes.data.data.topProducts);
      }
      if (invRes.data?.success) {
        setCategoryData(invRes.data.data.categoryDistribution);
      }
      if (actRes.data?.success) {
        setRecentMovements(actRes.data.data.recentMovements);
      }
      if (predRes.data?.success) {
        setUrgentPredictions(predRes.data.data.predictions || []);
      }
    } catch (err) {
      console.warn('[Dashboard Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [trendDays, lastSaleEvent, lastStockUpdate]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Inventory & Sales Command Center
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Real-time multi-tenant monitoring with predictive restocking alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate('/scanner')}
            icon={Boxes}
          >
            Scan Barcode
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/sales/new')}
            icon={ShoppingBag}
          >
            New POS Sale
          </Button>
        </div>
      </div>

      {/* 6 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Products"
          value={formatNumber(kpi.totalProducts)}
          subtitle="Catalog capacity"
          icon={Package}
          iconColor="indigo"
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          title="Stock Units"
          value={formatNumber(kpi.totalStockUnits)}
          subtitle="Physical inventory"
          icon={Layers}
          iconColor="blue"
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          title="Low Stock"
          value={formatNumber(kpi.lowStockItems)}
          subtitle="Needs reordering"
          icon={AlertTriangle}
          iconColor="amber"
          onClick={() => navigate('/inventory?stockStatus=LOW_STOCK')}
        />
        <StatCard
          title="Out of Stock"
          value={formatNumber(kpi.outOfStockItems)}
          subtitle="Depleted items"
          icon={XCircle}
          iconColor="red"
          onClick={() => navigate('/inventory?stockStatus=OUT_OF_STOCK')}
        />
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(kpi.todayRevenue)}
          subtitle="Gross sales volume"
          changePercent={kpi.revenueChangePercent}
          icon={DollarSign}
          iconColor="emerald"
          onClick={() => navigate('/sales')}
        />
        <StatCard
          title="Inventory Valuation"
          value={formatCurrency(kpi.inventoryValuation)}
          subtitle={`Retail: ${formatCurrency(kpi.retailValuation)}`}
          icon={TrendingUp}
          iconColor="indigo"
          onClick={() => navigate('/reports')}
        />
      </div>

      {/* Urgent Predictive Restock Callout Banner (if items have critical urgency) */}
      {urgentPredictions.length > 0 && (
        <Card className="border-l-4 border-l-red-500 bg-red-50/40 dark:bg-red-950/20 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Predictive Engine Warning: {urgentPredictions.length} Items Require Immediate Restock
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Stock depletion predicted before standard supplier delivery window expires.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/predictions')}
              className="shrink-0"
            >
              Review Restock Plan <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart (Area) */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Revenue Trend & Daily Sales
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Interactive daily breakdown of completed transactions
              </p>
            </div>

            <div className="flex rounded-lg border border-gray-200 dark:border-darkBg-border p-0.5 text-xs">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setTrendDays(d)}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    trendDays === d
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <SalesTrendChart data={dailyTrend} height={280} />
        </Card>

        {/* Category Breakdown Donut */}
        <Card>
          <div className="mb-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              Inventory by Category
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Valuation share across catalog segments
            </p>
          </div>
          <CategoryPieChart data={categoryData} height={260} />
        </Card>
      </div>

      {/* Bottom Grid: Top Selling Products & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              Top Selling Products (Last {trendDays} Days)
            </h3>
            <span className="text-xs text-gray-400">By Revenue</span>
          </div>

          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No sales recorded yet</p>
            ) : (
              topProducts.map((p, idx) => (
                <div
                  key={p._id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-100 dark:border-gray-800 text-xs"
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="w-5 h-5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {p.productName}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {p.totalUnitsSold} units sold &middot; SKU: {p.SKU}
                      </p>
                    </div>
                  </div>

                  <span className="font-bold text-gray-900 dark:text-white shrink-0">
                    {formatCurrency(p.totalRevenue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Real-time Activity Feed */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              Live Inventory Movements
            </h3>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Feed
            </span>
          </div>

          <div className="space-y-2.5 max-h-[290px] overflow-y-auto">
            {recentMovements.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No recent stock movements</p>
            ) : (
              recentMovements.map((m) => (
                <div
                  key={m._id}
                  className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-100 dark:border-gray-800 text-xs"
                >
                  <div className="truncate pr-2">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {m.productId?.productName || 'Inventory Item'}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {formatDateTime(m.createdAt)} &middot; By {m.performedBy?.name || 'System'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <Badge
                      variant={
                        m.type === 'STOCK_IN'
                          ? 'emerald'
                          : m.type === 'SALE'
                          ? 'indigo'
                          : m.type === 'DAMAGED'
                          ? 'red'
                          : 'amber'
                      }
                    >
                      {m.type === 'STOCK_IN' ? `+${m.quantity}` : `-${m.quantity}`} ({m.type})
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
