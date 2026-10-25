export class MetricValueDto {
  value: number;
  change: number; // percentage change
  trend?: 'up' | 'down' | 'stable';
  currency?: string;
}

export class DashboardKPIDto {
  period: string; // '7d', '30d', '90d'
  businessId: string;
  kpis: {
    totalRevenue: MetricValueDto;
    totalOrders: MetricValueDto;
    totalCustomers: MetricValueDto;
    totalProducts: {
      value: number;
      active: number;
      inactive: number;
    };
  };
  asOf: Date;
}

export class TrendChartDataPointDto {
  date: Date;
  revenue?: number;
  orders?: number;
}

export class TrendChartDto {
  period: string; // '7d', '30d', '90d'
  businessId: string;
  metric: 'revenue' | 'orders';
  data: TrendChartDataPointDto[];
  asOf: Date;
}

export class TopProductDto {
  id: string;
  nombre: string;
  revenue: number;
  quantity: number;
  rank: number;
}

export class TopProductsDto {
  businessId: string;
  period: string;
  metric: 'revenue' | 'quantity';
  products: TopProductDto[];
  asOf: Date;
}

export class ChannelBreakdownDto {
  channel: string;
  revenue: number;
  orders: number;
  percentage: number;
}

export class ChannelBreakdownResponseDto {
  businessId: string;
  period: string;
  data: ChannelBreakdownDto[];
  totalRevenue: number;
  totalOrders: number;
  asOf: Date;
}

export class GeographicBreakdownDto {
  city: string;
  revenue: number;
  orders: number;
  customers: number;
  percentage: number;
}

export class GeographicBreakdownResponseDto {
  businessId: string;
  period: string;
  data: GeographicBreakdownDto[];
  totalRevenue: number;
  asOf: Date;
}
