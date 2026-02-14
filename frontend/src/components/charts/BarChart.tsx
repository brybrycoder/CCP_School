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
  LabelList,
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
  showLabels?: boolean;
  formatTooltip?: (value: number) => string;
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: number) => string;
}

/** Abbreviate large numbers for bar labels */
const abbreviateNumber = (v: number): string => {
  if (v == null || isNaN(v)) return '';
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(Math.round(v));
};

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
  showLabels = false,
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
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-xl shadow-xl p-3 min-w-[180px]">
        <p className="font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-100 text-sm">
          {formatXAxis ? formatXAxis(label) : label}
        </p>
        {payload.map((entry, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-3 text-sm py-0.5"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded ring-2 ring-white shadow-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600 text-xs">{entry.name}</span>
            </div>
            <span className="font-semibold text-gray-900 tabular-nums text-xs">
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
        margin={{ top: showLabels ? 30 : 20, right: 30, left: isVertical ? 100 : 20, bottom: 20 }}
      >
        {/* Gradient definitions for bars */}
        <defs>
          {useColorPerBar
            ? data.map((_, i) => {
                const color = COLORS[i % COLORS.length];
                return (
                  <linearGradient key={`cell-grad-${i}`} id={`cell-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                  </linearGradient>
                );
              })
            : series.map((s, i) => {
                const color = s.color || COLORS[i % COLORS.length];
                return (
                  <linearGradient key={`bar-grad-${i}`} id={`bar-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.75} />
                  </linearGradient>
                );
              })}
        </defs>

        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        )}
        {isVertical ? (
          <>
            <XAxis
              type="number"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={formatYAxis || ((v) => v.toLocaleString())}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              label={
                yAxisLabel
                  ? {
                      value: yAxisLabel,
                      position: 'insideBottom',
                      offset: -10,
                      style: { fill: '#374151', fontSize: 13, fontWeight: 500 },
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
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              label={
                xAxisLabel
                  ? {
                      value: xAxisLabel,
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: '#374151', fontSize: 13, fontWeight: 500, textAnchor: 'middle' },
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
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              label={
                xAxisLabel
                  ? {
                      value: xAxisLabel,
                      position: 'insideBottom',
                      offset: -10,
                      style: { fill: '#374151', fontSize: 13, fontWeight: 500 },
                    }
                  : undefined
              }
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={formatYAxis || ((v) => v.toLocaleString())}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              label={
                yAxisLabel
                  ? {
                      value: yAxisLabel,
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: '#374151', fontSize: 13, fontWeight: 500, textAnchor: 'middle' },
                    }
                  : undefined
              }
            />
          </>
        )}
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(59, 130, 246, 0.04)' }}
        />
        {showLegend && series.length > 1 && (
          <Legend
            wrapperStyle={{ paddingTop: 20 }}
            formatter={(value) => (
              <span className="text-gray-600 text-xs font-medium">{value}</span>
            )}
          />
        )}
        {series.map((s, index) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.name}
            fill={useColorPerBar ? undefined : `url(#bar-grad-${index})`}
            stackId={s.stackId}
            barSize={barSize}
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={600}
            animationBegin={index * 100}
            animationEasing="ease-out"
          >
            {showLabels && (
              <LabelList
                dataKey={s.dataKey}
                position={isVertical ? 'right' : 'top'}
                formatter={abbreviateNumber}
                style={{ fill: '#374151', fontSize: 11, fontWeight: 600 }}
              />
            )}
            {useColorPerBar &&
              data.map((_, i) => (
                <Cell key={`cell-${i}`} fill={`url(#cell-grad-${i})`} />
              ))}
          </Bar>
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;
