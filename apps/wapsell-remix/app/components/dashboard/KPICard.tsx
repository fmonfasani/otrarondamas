import { ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'alert';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

const colorMap = {
  primary: 'kpi-primary',
  secondary: 'kpi-secondary',
  success: 'kpi-success',
  alert: 'kpi-alert',
};

export function KPICard({ title, value, icon, color = 'primary', trend }: KPICardProps) {
  return (
    <div className="kpi-card">
      <div className="kpi-content">
        <p className="kpi-title">{title}</p>
        <p className="kpi-value">{value}</p>
        {trend && (
          <p className={`kpi-trend ${trend.direction === 'up' ? 'kpi-trend-up' : 'kpi-trend-down'}`}>
            {trend.direction === 'up' ? '↑' : '↓'} {trend.value}% vs último mes
          </p>
        )}
      </div>
      <div className={`kpi-icon ${colorMap[color]}`}>
        {icon}
      </div>
    </div>
  );
}
