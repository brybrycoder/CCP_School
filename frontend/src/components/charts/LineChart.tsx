import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
  Brush,
  ReferenceLine as RechartsReferenceLine,
} from 'recharts';

// Color palette for multiple series
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

export interface LineChartSeries {
  dataKey: string;
  name: string;
  color?: string;
  strokeWidth?: number;
  dot?: boolean;
  strokeDasharray?: string;
}

export interface ReferenceLineConfig {
  y: number;
  label?: string;
  color?: string;
  strokeDasharray?: string;
}

interface LineChartProps {
  data: Record<string, any>[];
  xAxisKey: string;
  series: LineChartSeries[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showBrush?: boolean;
  areaFill?: boolean;
  referenceLines?: ReferenceLineConfig[];
  formatTooltip?: (value: number) => string;
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: number) => string;
}

/** Custom active dot with outer glow ring for better hover visibility */
const ActiveDot = (props: any) => {
  const { cx, cy, stroke } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill={stroke} fillOpacity={0.15} />
      <circle cx={cx} cy={cy} r={5} fill="#fff" stroke={stroke} strokeWidth={2.5} />
    </g>
  );
};

export const LineChart: React.FC<LineChartProps> = ({
  data,
  xAxisKey,
  series,
  xAxisLabel,
  yAxisLabel,
  height = 400,
  showGrid = true,
  showLegend = true,
  showBrush = false,
  areaFill = false,
  referenceLines = [],
  formatTooltip,
  formatXAxis,
  formatYAxis,
}) => {
  // Series eligible for gradient area fill (exclude dashed/forecast series)
  const fillSeries = areaFill ? series.filter(s => !s.strokeDasharray) : [];
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null;

    // Deduplicate entries sharing the same dataKey (Area + Line overlap)
    const seenMap = new Map<string, typeof payload[0]>();
    payload.forEach(entry => seenMap.set(String(entry.dataKey), entry));
    const dedupedPayload = Array.from(seenMap.values());

    // Sort by value descending for readability
    const sortedPayload = [...dedupedPayload].sort((a, b) => 
      ((b.value as number) || 0) - ((a.value as number) || 0)
    );

    const hasForecast = sortedPayload.some(entry => 
      String(entry.dataKey).includes('_forecast')
    );

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-xl shadow-xl p-3 min-w-[200px]">
        <p className="font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-100 text-sm">
          {formatXAxis ? formatXAxis(label) : `Year ${label}`}
        </p>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {sortedPayload.map((entry, index) => {
            const isForecast = String(entry.dataKey).includes('_forecast');
            return (
              <div
                key={index}
                className={`flex items-center justify-between gap-3 text-sm ${
                  isForecast ? 'opacity-70' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm ${
                      isForecast ? 'border-2 border-current bg-white' : ''
                    }`}
                    style={{ 
                      backgroundColor: isForecast ? 'white' : entry.color,
                      borderColor: isForecast ? entry.color : 'transparent',
                    }}
                  />
                  <span className="text-gray-600 truncate max-w-[130px] text-xs">
                    {entry.name}
                  </span>
                </div>
                <span className="font-semibold text-gray-900 tabular-nums text-xs">
                  {formatTooltip
                    ? formatTooltip(entry.value as number)
                    : entry.value?.toLocaleString() ?? 'N/A'}
                </span>
              </div>
            );
          })}
        </div>
        {hasForecast && (
          <p className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400 italic">
            ○ Projected forecast values
          </p>
        )}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: showBrush && data.length > 8 ? 45 : 20 }}
      >
        {/* Gradient definitions for area fills */}
        {areaFill && fillSeries.length > 0 && (
          <defs>
            {fillSeries.map((s) => {
              const color = s.color || COLORS[series.indexOf(s) % COLORS.length];
              const gradientId = `area-grad-${s.dataKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
              return (
                <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
        )}

        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        )}

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

        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: '#d1d5db', strokeDasharray: '4 4' }}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ paddingTop: 20 }}
            formatter={(value) => (
              <span className="text-gray-600 text-xs font-medium">{value}</span>
            )}
          />
        )}

        {/* Reference lines for context */}
        {referenceLines.map((ref, i) => (
          <RechartsReferenceLine
            key={`ref-${i}`}
            y={ref.y}
            stroke={ref.color || '#94a3b8'}
            strokeDasharray={ref.strokeDasharray || '8 4'}
            strokeWidth={1.5}
            label={{
              value: ref.label || '',
              position: 'insideTopLeft',
              style: { fill: ref.color || '#94a3b8', fontSize: 11, fontWeight: 600 },
            }}
          />
        ))}

        {/* Gradient area fills (rendered behind lines for depth) */}
        {fillSeries.map((s) => {
          const gradientId = `area-grad-${s.dataKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
          return (
            <Area
              key={`area-${s.dataKey}`}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              fill={`url(#${gradientId})`}
              stroke="none"
              connectNulls={false}
              legendType="none"
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
            />
          );
        })}

        {/* Lines rendered on top of areas */}
        {series.map((s, index) => (
          <Line
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.name}
            stroke={s.color || COLORS[index % COLORS.length]}
            strokeWidth={s.strokeWidth || 2}
            strokeDasharray={s.strokeDasharray}
            dot={s.dot !== false ? {
              r: 3,
              strokeWidth: 2,
              fill: '#fff',
              stroke: s.color || COLORS[index % COLORS.length],
            } : false}
            activeDot={<ActiveDot />}
            connectNulls={false}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />
        ))}

        {/* Brush for interactive zoom and pan */}
        {showBrush && data.length > 8 && (
          <Brush
            dataKey={xAxisKey}
            height={28}
            stroke="#93c5fd"
            fill="#f8fafc"
            tickFormatter={formatXAxis}
            travellerWidth={10}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default LineChart;
