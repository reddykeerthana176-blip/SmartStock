import React from 'react';
import { Card } from '../ui/Card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'indigo',
  changePercent,
  changeLabel = 'vs yesterday',
  onClick,
}) => {
  const iconColors = {
    indigo: 'bg-indigo-50 text-brand-600 dark:bg-indigo-950/50 dark:text-brand-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
  };

  const isPositive = changePercent !== undefined && changePercent >= 0;

  return (
    <Card
      hover={!!onClick}
      onClick={onClick}
      className={onClick ? 'cursor-pointer' : ''}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconColors[iconColor] || iconColors.indigo}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          {value}
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs">
          {changePercent !== undefined && changePercent !== 0 && (
            <span
              className={`inline-flex items-center font-semibold ${
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
              )}
              {isPositive ? `+${changePercent}%` : `${changePercent}%`}
            </span>
          )}

          {subtitle && (
            <span className="text-gray-500 dark:text-gray-400 truncate">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
