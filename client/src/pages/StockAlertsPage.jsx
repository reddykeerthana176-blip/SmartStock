import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatDateTime } from '../utils/formatters';
import {
  BellRing,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Eye,
  Sliders,
  CheckCheck,
} from 'lucide-react';

export const StockAlertsPage = () => {
  const navigate = useNavigate();
  const { lastAlertEvent } = useSocket();
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severityFilter !== 'ALL') params.append('severity', severityFilter);

      const res = await api.get(`/alerts?${params.toString()}`);
      if (res.data?.success) {
        setAlerts(res.data.data.alerts);
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch (err) {
      console.warn('[Fetch Alerts Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, lastAlertEvent]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/alerts/${id}/read`);
      setAlerts((prev) =>
        prev.map((a) => (a._id === id ? { ...a, isRead: true } : a))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.warn('Failed to mark read', err);
    }
  };

  const handleDismiss = async (id) => {
    try {
      await api.put(`/alerts/${id}/dismiss`);
      setAlerts((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      console.warn('Failed to dismiss alert', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/alerts/mark-all-read');
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all read', err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Stock Threshold Notifications
            {unreadCount > 0 && (
              <Badge variant="red">{unreadCount} New</Badge>
            )}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Automated alerts when inventory breaches configured minimum or maximum thresholds
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="secondary"
            icon={CheckCheck}
            onClick={handleMarkAllRead}
          >
            Mark All Read
          </Button>
        )}
      </div>

      {/* Severity Filter Tabs */}
      <div className="flex gap-2 text-xs">
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(s)}
            className={`px-3 py-1.5 rounded-xl font-medium border transition ${
              severityFilter === s
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white dark:bg-darkBg-card border-gray-200 dark:border-darkBg-border text-gray-600 dark:text-gray-400'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <Card className="py-12 text-center text-gray-400 text-xs">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-gray-700 dark:text-gray-300">All inventory thresholds optimal</p>
            <p className="mt-1">No active stock alerts detected.</p>
          </Card>
        ) : (
          alerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL' || alert.alertType === 'OUT_OF_STOCK';
            return (
              <Card
                key={alert._id}
                className={`p-4 border transition-all ${
                  !alert.isRead
                    ? 'border-l-4 border-l-brand-600 dark:border-l-brand-500 bg-brand-50/10 dark:bg-brand-950/10'
                    : 'border-gray-200 dark:border-darkBg-border'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isCritical
                          ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isCritical ? <XCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            alert.severity === 'CRITICAL'
                              ? 'red'
                              : alert.severity === 'HIGH'
                              ? 'amber'
                              : 'indigo'
                          }
                        >
                          {alert.severity}
                        </Badge>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">
                          {alert.productName}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">
                          (SKU: {alert.SKU})
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        {alert.message}
                      </p>

                      <p className="text-[10px] text-gray-400 mt-2">
                        {formatDateTime(alert.createdAt)} &middot; Stock: <strong>{alert.currentStock}</strong> / Min Threshold: <strong>{alert.thresholdStock}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!alert.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(alert._id)}
                        className="px-2 py-1 rounded-lg text-[11px] font-medium text-gray-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(alert._id)}
                      className="px-2 py-1 rounded-lg text-[11px] font-medium text-gray-400 hover:text-red-500 transition"
                    >
                      Dismiss
                    </button>
                    {alert.productId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/products/${alert.productId._id || alert.productId}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
