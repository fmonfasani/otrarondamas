/**
 * SimpleLineChart - Line chart component without recharts dependency
 * Uses native SVG for rendering line charts with responsive design
 */

import React from 'react';
import { ChartWrapper } from './ChartWrapper';

export interface LineChartData {
  name: string;
  value: number;
}

export interface LineChartDataset {
  label: string;
  data: LineChartData[];
  color?: string;
  strokeDasharray?: string;
}

export interface SimpleLineChartProps {
  title: string;
  subtitle?: string;
  datasets: LineChartDataset[];
  loading?: boolean;
  error?: string | null;
  yAxisLabel?: string;
  xAxisLabel?: string;
  height?: number;
  showGrid?: boolean;
  showValue?: boolean;
  ariaLabel?: string;
}

export const SimpleLineChart = React.forwardRef<HTMLDivElement, SimpleLineChartProps>(
  (
    {
      title,
      subtitle,
      datasets = [],
      loading = false,
      error = null,
      yAxisLabel,
      xAxisLabel,
      height = 300,
      showGrid = true,
      showValue = true,
      ariaLabel,
    },
    ref
  ) => {
    const isEmpty = datasets.length === 0 || datasets.every((d) => d.data.length === 0);

    // Flatten all data to find max value
    const allValues = datasets.flatMap((d) => d.data.map((v) => v.value));
    const maxValue = Math.max(...allValues, 0) || 1;
    const yScale = maxValue / 100;

    // Get data points count
    const dataPoints = datasets[0]?.data.length || 0;

    // Default colors
    const defaultColors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
    ];

    const chartWidth = 900;
    const chartHeight = height - 80;
    const padding = { top: 20, right: 20, bottom: 60, left: 80 };
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;

    const getX = (index: number) => padding.left + (index / Math.max(dataPoints - 1, 1)) * plotWidth;
    const getY = (value: number) => padding.top + plotHeight - (value / maxValue) * plotHeight;

    const generatePathD = (data: LineChartData[]): string => {
      return data
        .map((item, index) => {
          const x = getX(index);
          const y = getY(item.value);
          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
    };

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
          {datasets.length > 0 && (
            <div className="flex flex-wrap gap-4 text-xs">
              {datasets.map((dataset, idx) => (
                <div key={dataset.label} className="flex items-center gap-2">
                  <div
                    className="w-3 h-1 rounded"
                    style={{
                      backgroundColor: dataset.color || defaultColors[idx % defaultColors.length],
                    }}
                  />
                  <span className="text-gray-600">{dataset.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Chart Container */}
          <div className="w-full overflow-x-auto">
            <svg
              width="100%"
              height={height}
              viewBox={`0 0 ${chartWidth} ${height}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={`Line chart: ${title}`}
            >
              {/* Grid lines */}
              {showGrid && (
                <>
                  {[0, 25, 50, 75, 100].map((tick) => (
                    <line
                      key={`grid-${tick}`}
                      x1={padding.left}
                      y1={padding.top + ((100 - tick) / 100) * plotHeight}
                      x2={chartWidth - padding.right}
                      y2={padding.top + ((100 - tick) / 100) * plotHeight}
                      stroke="#E5E7EB"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                  ))}
                </>
              )}

              {/* Y-axis */}
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={chartHeight - padding.bottom}
                stroke="#D1D5DB"
                strokeWidth="2"
              />

              {/* X-axis */}
              <line
                x1={padding.left}
                y1={chartHeight - padding.bottom}
                x2={chartWidth - padding.right}
                y2={chartHeight - padding.bottom}
                stroke="#D1D5DB"
                strokeWidth="2"
              />

              {/* Y-axis ticks and labels */}
              {[0, 25, 50, 75, 100].map((tick) => (
                <g key={`tick-${tick}`}>
                  <line
                    x1={padding.left - 5}
                    y1={padding.top + ((100 - tick) / 100) * plotHeight}
                    x2={padding.left}
                    y2={padding.top + ((100 - tick) / 100) * plotHeight}
                    stroke="#D1D5DB"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={padding.top + ((100 - tick) / 100) * plotHeight + 4}
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
                  y="15"
                  textAnchor="middle"
                  fontSize="12"
                  fill="#6B7280"
                  transform="rotate(-90)"
                >
                  {yAxisLabel}
                </text>
              )}

              {/* Lines and data points */}
              {datasets.map((dataset, datasetIdx) => (
                <g key={dataset.label}>
                  {/* Line path */}
                  <path
                    d={generatePathD(dataset.data)}
                    fill="none"
                    stroke={dataset.color || defaultColors[datasetIdx % defaultColors.length]}
                    strokeWidth="2"
                    strokeDasharray={dataset.strokeDasharray}
                    role="path"
                  />

                  {/* Data points */}
                  {dataset.data.map((item, idx) => (
                    <g key={`${dataset.label}-${idx}`}>
                      <circle
                        cx={getX(idx)}
                        cy={getY(item.value)}
                        r="4"
                        fill={dataset.color || defaultColors[datasetIdx % defaultColors.length]}
                        className="hover:r-6 transition-all cursor-pointer"
                        role="point"
                        aria-label={`${item.name}: ${item.value}`}
                      />

                      {/* Value label */}
                      {showValue && (
                        <text
                          x={getX(idx)}
                          y={getY(item.value) - 12}
                          textAnchor="middle"
                          fontSize="11"
                          fill="#1F2937"
                          fontWeight="600"
                          className="pointer-events-none"
                        >
                          {item.value.toLocaleString('es-AR')}
                        </text>
                      )}
                    </g>
                  ))}
                </g>
              ))}

              {/* X-axis labels */}
              {datasets[0]?.data.map((item, idx) => (
                <text
                  key={`label-${idx}`}
                  x={getX(idx)}
                  y={chartHeight - padding.bottom + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#6B7280"
                >
                  {item.name.length > 8
                    ? item.name.substring(0, 8) + '...'
                    : item.name}
                </text>
              ))}

              {/* X-axis label */}
              {xAxisLabel && (
                <text
                  x={chartWidth / 2}
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

          {/* Summary stats */}
          {datasets.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {datasets.map((dataset) => {
                const values = dataset.data.map((d) => d.value);
                const sum = values.reduce((a, b) => a + b, 0);
                const avg = sum / values.length;
                const max = Math.max(...values);
                const min = Math.min(...values);

                return (
                  <div key={dataset.label} className="p-2 rounded bg-gray-50">
                    <p className="text-gray-600 truncate">{dataset.label}</p>
                    <p className="text-gray-900">
                      <span className="text-xs">Prom:</span>{' '}
                      <span className="font-semibold">
                        {avg.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ChartWrapper>
    );
  }
);

SimpleLineChart.displayName = 'SimpleLineChart';
