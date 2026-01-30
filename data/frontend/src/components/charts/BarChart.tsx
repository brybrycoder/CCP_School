import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
  Cell,
} from 'recharts';

// Color palette for bars
const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#a855f7', // purple
  '#22c55e', // green-500
  '#eab308', // yellow
  '#64748b', // slate
  '#78716c', // stone
  '#0ea5e9', // sky
];

export interface BarChartSeries {
  dataKey: string;
  name: string;
  color?: string;
  stackId?: string;
}

interface BarChartProps {
  data: Record<string, any>[];
  xAxisKey: string;
  series: BarChartSeries[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  layout?: 'horizontal' | 'vertical';
  barSize?: number;
  useColorPerBar?: boolean;
  formatTooltip?: (value: number) => string;
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: number) => string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  xAxisKey,
  series,
  xAxisLabel,
  yAxisLabel,
  height = 400,
  showGrid = true,
  showLegend = true,
  layout = 'horizontal',
  barSize,
  useColorPerBar = false,
  formatTooltip,
  formatXAxis,
  formatYAxis,
}) => {
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-medium text-gray-900 mb-2">
          {formatXAxis ? formatXAxis(label) : label}
        </p>
        {payload.map((entry, index) => (
          <div
            key={index}
            className="flex items-center gap-2 text-sm"
            style={{ color: entry.color }}
          >
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-medium">
              {formatTooltip
                ? formatTooltip(entry.value as number)
                : entry.value?.toLocaleString() ?? 'N/A'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const isVertical = layout === 'vertical';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={layout}
        margin={{ top: 20, right: 30, left: isVertical ? 100 : 20, bottom: 20 }}
      >
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        )}
        {isVertical ? (
          <>
            <XAxis
              type="number"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={formatYAxis || ((v) => v.toLocaleString())}
              label={
                yAxisLabel
                  ? {
                      value: yAxisLabel,
                      position: 'insideBottom',
                      offset: -10,
                      style: { fill: '#374151', fontSize: 14 },
                    }
                  : undefined
              }
            />
            <YAxis
              type="category"
              dataKey={xAxisKey}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={formatXAxis}
              width={90}
              label={
                xAxisLabel
                  ? {
                      value: xAxisLabel,
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: '#374151', fontSize: 14, textAnchor: 'middle' },
                    }
                  : undefined
              }
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xAxisKey}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={formatXAxis}
              label={
                xAxisLabel
                  ? {
                      value: xAxisLabel,
                      position: 'insideBottom',
                      offset: -10,
                      style: { fill: '#374151', fontSize: 14 },
                    }
                  : undefined
              }
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={formatYAxis || ((v) => v.toLocaleString())}
              label={
                yAxisLabel
                  ? {
                      value: yAxisLabel,
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: '#374151', fontSize: 14, textAnchor: 'middle' },
                    }
                  : undefined
              }
            />
          </>
        )}
        <Tooltip content={<CustomTooltip />} />
        {showLegend && series.length > 1 && (
          <Legend
            wrapperStyle={{ paddingTop: 20 }}
            formatter={(value) => (
              <span className="text-gray-700 text-sm">{value}</span>
            )}
          />
        )}
        {series.map((s, index) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.name}
            fill={useColorPerBar ? undefined : s.color || COLORS[index % COLORS.length]}
            stackId={s.stackId}
            barSize={barSize}
            radius={[4, 4, 0, 0]}
          >
            {useColorPerBar &&
              data.map((_, i) => (
                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
              ))}
          </Bar>
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;
