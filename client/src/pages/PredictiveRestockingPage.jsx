import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatDateTime, formatDate } from '../utils/formatters';
import {
  TrendingUp,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PackageCheck,
  Calendar,
} from 'lucide-react';

export const PredictiveRestockingPage = () => {
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [metrics, setMetrics] = useState({
    totalItemsAnalyzed: 0,
    totalRecommendedRestockUnits: 0,
    criticalCount: 0,
    highCount: 0,
    lastCalculated: null,
  });
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const fetchPredictions = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (forceRefresh) params.append('refresh', 'true');
      if (urgencyFilter !== 'ALL') params.append('urgency', urgencyFilter);

      const res = await api.get(`/predictions?${params.toString()}`);
      if (res.data?.success) {
        setPredictions(res.data.data.predictions || []);
        setMetrics(res.data.data.metrics || {});
      }
    } catch (err) {
      console.warn('[Fetch Predictions Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [urgencyFilter]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await api.post('/predictions/recalculate');
      await fetchPredictions(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to recalculate forecasts');
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Recalculate */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Predictive Restocking & Demand Intelligence
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <Sparkles className="w-3 h-3" /> Aggregation AI
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Real-time daily demand analysis, supplier lead time tracking, safety stocks, and stockout date modeling
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleRecalculate}
          loading={recalculating}
          icon={RefreshCw}
        >
          Recalculate Models
        </Button>
      </div>

      {/* Top Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Total Analyzed Products
          </span>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {metrics.totalItemsAnalyzed} items
          </div>
          <span className="text-[11px] text-gray-400">30-day historical window</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Recommended Restock Units
          </span>
          <div className="text-2xl font-bold text-brand-600 dark:text-brand-400 mt-1">
            +{metrics.totalRecommendedRestockUnits} units
          </div>
          <span className="text-[11px] text-gray-400">Total replenishment backlog</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Critical Risk (Imminent Stockout)
          </span>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {metrics.criticalCount} products
          </div>
          <span className="text-[11px] text-red-500">Stockout &lt; Lead Time</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Reorder Threshold Items
          </span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {metrics.highCount} products
          </div>
          <span className="text-[11px] text-gray-400">Stock &le; Reorder Point</span>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 text-xs">
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'].map((u) => (
          <button
            key={u}
            onClick={() => setUrgencyFilter(u)}
            className={`px-3 py-1.5 rounded-xl font-medium border transition ${
              urgencyFilter === u
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white dark:bg-darkBg-card border-gray-200 dark:border-darkBg-border text-gray-600 dark:text-gray-400'
            }`}
          >
            {u} Urgency
          </button>
        ))}
      </div>

      {/* Recommendations Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 dark:bg-darkBg-base/75 text-gray-500 font-semibold uppercase text-[11px] border-b border-gray-100 dark:border-darkBg-border">
              <tr>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4 text-center">Current Stock</th>
                <th className="py-3 px-4 text-center">Daily Demand</th>
                <th className="py-3 px-4 text-center">Lead Time</th>
                <th className="py-3 px-4 text-center">Reorder Point</th>
                <th className="py-3 px-4 text-center">Suggested Restock</th>
                <th className="py-3 px-4 text-center">Stockout Date</th>
                <th className="py-3 px-4 text-center">Confidence</th>
                <th className="py-3 px-4 text-center">Urgency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-darkBg-border">
              {predictions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400">
                    No recommendations matching current urgency level
                  </td>
                </tr>
              ) : (
                predictions.map((p) => {
                  return (
                    <tr
                      key={p._id}
                      onClick={() => navigate(`/products/${p.productId?._id || p.productId}`)}
                      className="hover:bg-gray-50/60 dark:hover:bg-darkBg-hover/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {p.productName}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          {p.SKU}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {p.currentStock}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">
                        {p.averageDailyDemand} /day
                      </td>

                      <td className="py-3 px-4 text-center text-gray-500">
                        {p.supplierLeadTimeDays}d
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-gray-800 dark:text-gray-200">
                        {p.reorderPoint}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {p.suggestedRestockQuantity > 0 ? (
                          <span className="font-bold text-brand-600 dark:text-brand-400">
                            +{p.suggestedRestockQuantity} units
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {p.predictedStockoutDate ? (
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {formatDate(p.predictedStockoutDate)}
                            <span className="block text-[10px] text-gray-400">
                              ({p.predictedStockoutDays} days remaining)
                            </span>
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-[11px] font-medium">Adequate</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div
                              className="h-full bg-brand-600 rounded-full"
                              style={{ width: `${p.forecastConfidence}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500">{p.forecastConfidence}%</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            p.urgency === 'CRITICAL'
                              ? 'red'
                              : p.urgency === 'HIGH'
                              ? 'amber'
                              : p.urgency === 'MEDIUM'
                              ? 'indigo'
                              : 'gray'
                          }
                        >
                          {p.urgency}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
