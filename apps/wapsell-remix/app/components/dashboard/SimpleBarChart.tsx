/**
 * SimpleBarChart - Bar chart component without recharts dependency
 * Uses native SVG for rendering bar charts with responsive design
 */

import React from 'react';
import { ChartWrapper } from './ChartWrapper';

export interface BarChartData {
  name: string;
  value: number;
  color?: string;
}

export interface SimpleBarChartProps {
  title: string;
  subtitle?: string;
  data: BarChartData[];
  loading?: boolean;
  error?: string | null;
  yAxisLabel?: string;
  xAxisLabel?: string;
  height?: number;
  showValue?: boolean;
  ariaLabel?: string;
}

export const SimpleBarChart = React.forwardRef<HTMLDivElement, SimpleBarChartProps>(
  (
    {
      title,
      subtitle,
      data = [],
      loading = false,
      error = null,
      yAxisLabel,
      xAxisLabel,
      height = 300,
      showValue = true,
      ariaLabel,
    },
    ref
  ) => {
    const isEmpty = data.length === 0;

    const maxValue = Math.max(...data.map((d) => d.value), 0) || 1;
    const yScale = maxValue / 100;

    // Default colors for bars
    const defaultColors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
    ];

    const barWidth = 100 / (data.length * 1.2 + 0.2);
    const barGap = (100 / (data.length * 1.2 + 0.2)) * 0.2;

    return (
      <ChartWrapper
        ref={ref}
        title={title}
        subtitle={subtitle}
        loading={loading}
        error={error}
        empty={isEmpty}
        ariaLabel={ariaLabel || title}
      >
        <div className="space-y-4">
          {/* Legend */}
          {data.length > 0 && (
            <div className="flex flex-wrap gap-4 text-xs">
              {data.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{
                      backgroundColor: item.color || defaultColors[idx % defaultColors.length],
                    }}
                  />
                  <span className="text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Chart Container */}
          <div className="w-full overflow-x-auto">
            <svg
              width="100%"
              height={height}
              viewBox={`0 0 1000 ${height}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={`Bar chart: ${title}`}
            >
              {/* Y-axis */}
              <line
                x1="80"
                y1="20"
                x2="80"
                y2={height - 60}
                stroke="#D1D5DB"
                strokeWidth="2"
              />

              {/* X-axis */}
              <line
                x1="80"
                y1={height - 60}
                x2="980"
                y2={height - 60}
                stroke="#D1D5DB"
                strokeWidth="2"
              />

              {/* Y-axis ticks and labels */}
              {[0, 25, 50, 75, 100].map((tick) => (
                <g key={`tick-${tick}`}>
                  <line
                    x1="75"
                    y1={height - 60 - (tick / 100) * (height - 80)}
                    x2="80"
                    y2={height - 60 - (tick / 100) * (height - 80)}
                    stroke="#D1D5DB"
                    strokeWidth="1"
                  />
                  <text
                    x="70"
                    y={height - 60 - (tick / 100) * (height - 80) + 4}
                    textAnchor="end"
                    fontSize="12"
                    fill="#6B7280"
                  >
                    {(tick * yScale).toLocaleString('es-AR', {
                      maximumFractionDigits: 0,
                    })}
                  </text>
                </g>
              ))}

              {/* Y-axis label */}
              {yAxisLabel && (
                <text
                  x={-height / 2}
                  y="20"
                  textAnchor="middle"
                  fontSize="12"
                  fill="#6B7280"
                  transform={`rotate(-90)`}
                >
                  {yAxisLabel}
                </text>
              )}

              {/* Bars */}
              {data.map((item, idx) => {
                const barHeight = (item.value / maxValue) * (height - 80);
                const xPosition = 100 + (idx + 1) * (barWidth + barGap);
                const yPosition = height - 60 - barHeight;

                return (
                  <g key={item.name}>
                    {/* Bar */}
                    <rect
                      x={xPosition}
                      y={yPosition}
                      width={barWidth}
                      height={barHeight}
                      fill={item.color || defaultColors[idx % defaultColors.length]}
                      className="hover:opacity-80 transition-opacity"
                      role="bar"
                      aria-valuenow={item.value}
                      aria-valuemin={0}
                      aria-valuemax={maxValue}
                      aria-label={`${item.name}: ${item.value}`}
                    />

                    {/* Value label above bar */}
                    {showValue && (
                      <text
                        x={xPosition + barWidth / 2}
                        y={yPosition - 5}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#1F2937"
                        fontWeight="600"
                      >
                        {item.value.toLocaleString('es-AR')}
                      </text>
                    )}

                    {/* Category label */}
                    <text
                      x={xPosition + barWidth / 2}
                      y={height - 60 + 20}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#6B7280"
                    >
                      {item.name.length > 10
                        ? item.name.substring(0, 10) + '...'
                        : item.name}
                    </text>
                  </g>
                );
              })}

              {/* X-axis label */}
              {xAxisLabel && (
                <text
                  x="500"
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#6B7280"
                >
                  {xAxisLabel}
                </text>
              )}
            </svg>
          </div>

          {/* Data Table */}
          {data.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                {data.map((item) => (
                  <div
                    key={item.name}
                    className="p-2 rounded bg-gray-50"
                  >
                    <p className="text-gray-600">{item.name}</p>
                    <p className="font-semibold text-gray-900">
                      {item.value.toLocaleString('es-AR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ChartWrapper>
    );
  }
);

SimpleBarChart.displayName = 'SimpleBarChart';
