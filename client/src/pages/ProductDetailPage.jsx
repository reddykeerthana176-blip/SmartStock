import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StockMovementModal } from '../components/inventory/StockMovementModal';
import { formatCurrency, formatDateTime, getStockStatus } from '../utils/formatters';
import {
  ArrowLeft,
  Sliders,
  Sparkles,
  Truck,
  MapPin,
  Calendar,
  History,
  TrendingUp,
} from 'lucide-react';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMovementOpen, setIsMovementOpen] = useState(false);

  const fetchDetails = async () => {
    try {
      const [prodRes, predRes] = await Promise.all([
        api.get(`/products/${id}`),
        api.get(`/predictions/${id}`).catch(() => null),
      ]);

      if (prodRes.data?.success) {
        setProduct(prodRes.data.data.product);
        setMovements(prodRes.data.data.recentMovements || []);
      }
      if (predRes?.data?.success) {
        setPrediction(predRes.data.data);
      }
    } catch (err) {
      console.warn('[Product Detail Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  if (loading || !product) {
    return (
      <div className="text-center py-16 text-gray-400 text-xs">
        Loading product telemetry...
      </div>
    );
  }

  const status = getStockStatus(product.currentStock, product.minimumStock, product.maximumStock);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Inventory
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {product.productName}
            </h2>
            <p className="text-xs text-gray-500 font-mono">
              SKU: {product.SKU} {product.barcode ? `&bull; Barcode: ${product.barcode}` : ''}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          icon={Sliders}
          onClick={() => setIsMovementOpen(true)}
        >
          Adjust Stock
        </Button>
      </div>

      {/* Main Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric Overview */}
        <Card className="space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">
            Stock Status & Valuation
          </h3>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {product.currentStock}
            </span>
            <Badge variant={status.color}>{status.label}</Badge>
          </div>
          <div className="pt-2 border-t border-gray-100 dark:border-darkBg-border space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Min Alert Threshold:</span>
              <span className="font-semibold">{product.minimumStock} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Max Capacity:</span>
              <span className="font-semibold">{product.maximumStock || '—'} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Asset Valuation:</span>
              <span className="font-bold text-brand-600 dark:text-brand-400">
                {formatCurrency(product.currentStock * product.purchasePrice)}
              </span>
            </div>
          </div>
        </Card>

        {/* Pricing & Margins */}
        <Card className="space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">
            Unit Pricing & Margin
          </h3>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-gray-500">Selling Price:</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(product.sellingPrice)}
            </span>
          </div>
          <div className="pt-2 border-t border-gray-100 dark:border-darkBg-border space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Cost (Purchase):</span>
              <span className="font-semibold">{formatCurrency(product.purchasePrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Unit Profit:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(product.sellingPrice - product.purchasePrice)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Gross Margin:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {product.sellingPrice > 0
                  ? `${Math.round(((product.sellingPrice - product.purchasePrice) / product.sellingPrice) * 100)}%`
                  : '0%'}
              </span>
            </div>
          </div>
        </Card>

        {/* Supplier & Logistics */}
        <Card className="space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">
            Logistics & Supplier
          </h3>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Truck className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
            <span className="truncate">{product.supplierId?.name || 'No supplier assigned'}</span>
          </div>
          <div className="pt-2 border-t border-gray-100 dark:border-darkBg-border space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Lead Time:</span>
              <span className="font-semibold">{product.supplierId?.leadTimeDays || 5} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Storage Location:</span>
              <span className="font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {product.location || 'Unassigned'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Category:</span>
              <span className="font-semibold">{product.category}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Predictive Restocking Rationale Card */}
      {prediction && (
        <Card className="border border-brand-500/20 bg-gradient-to-r from-brand-50/20 to-indigo-50/10 dark:from-brand-950/20 dark:to-indigo-950/10">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  Intelligent Restock Recommendation
                </h4>
                <Badge
                  variant={
                    prediction.urgency === 'CRITICAL'
                      ? 'red'
                      : prediction.urgency === 'HIGH'
                      ? 'amber'
                      : 'indigo'
                  }
                >
                  Urgency: {prediction.urgency} ({prediction.forecastConfidence}% confidence)
                </Badge>
              </div>

              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {prediction.explanation}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px] border-t border-gray-200/50 dark:border-darkBg-border">
                <div>
                  <span className="text-gray-400 block">Daily Demand:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {prediction.averageDailyDemand} units/day
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Reorder Point:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {prediction.reorderPoint} units
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Suggested Restock:</span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">
                    +{prediction.suggestedRestockQuantity} units
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Depletion Date:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {prediction.predictedStockoutDate ? formatDateTime(prediction.predictedStockoutDate) : 'Adequate'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Stock Movement Audit History */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-darkBg-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              Inventory Movement Audit History
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 dark:bg-darkBg-base/75 text-gray-500 font-semibold uppercase text-[11px] border-b border-gray-100 dark:border-darkBg-border">
              <tr>
                <th className="py-2.5 px-4">Date / Time</th>
                <th className="py-2.5 px-4">Movement Type</th>
                <th className="py-2.5 px-4 text-right">Delta Qty</th>
                <th className="py-2.5 px-4 text-right">Stock Level</th>
                <th className="py-2.5 px-4">Reason / Reference</th>
                <th className="py-2.5 px-4">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-darkBg-border">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400">
                    No movements recorded yet
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m._id} className="hover:bg-gray-50/50 dark:hover:bg-darkBg-hover/50">
                    <td className="py-2.5 px-4 text-gray-500">
                      {formatDateTime(m.createdAt)}
                    </td>
                    <td className="py-2.5 px-4">
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
                        {m.type}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-gray-900 dark:text-white">
                      {m.type === 'STOCK_IN' ? `+${m.quantity}` : `-${m.quantity}`}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-gray-600 dark:text-gray-300">
                      {m.previousStock} &rarr; <strong>{m.newStock}</strong>
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 max-w-xs truncate">
                      {m.reason || m.referenceId || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300">
                      {m.performedBy?.name || 'System'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <StockMovementModal
        isOpen={isMovementOpen}
        onClose={() => setIsMovementOpen(false)}
        product={product}
        onUpdated={fetchDetails}
      />
    </div>
  );
};
