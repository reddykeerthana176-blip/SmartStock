import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '../utils/formatters';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-darkBg-card p-2.5 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 text-xs">
        <p className="font-semibold text-gray-900 dark:text-white">{data.category}</p>
        <p className="text-gray-600 dark:text-gray-300">Valuation: {formatCurrency(data.valuation)}</p>
        <p className="text-gray-400">Products: {data.count}</p>
      </div>
    );
  }
  return null;
};

export const CategoryPieChart = ({ data = [], height = 280 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-sm text-gray-400">
        No category distribution data
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={data}
              dataKey="valuation"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-600 dark:text-gray-400 mt-2">
        {data.map((item, idx) => (
          <div key={item.category} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            <span className="truncate max-w-[120px]">{item.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
