import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * P9-2: Revenue metric response for a single time period.
 * Includes optional comparison to prior/year-ago period.
 */
export class PeriodMetricDto {
  @ApiProperty({ description: 'Period identifier (YYYY-MM-DD, YYYY-WXX, or YYYY-MM)' })
  period: string;

  @ApiProperty({ description: 'Revenue total in this period' })
  revenue: number;

  @ApiProperty({ description: 'Number of transactions in this period' })
  count: number;

  @ApiProperty({ description: 'Average revenue per transaction' })
  average: number;

  @ApiPropertyOptional({ description: 'Comparison to prior/year-ago period' })
  comparison?: {
    period: string;
    revenue: number;
    percentageChange: number; // (current - prior) / prior * 100
  };
}

/**
 * Aggregated revenue metrics response.
 */
export class RevenueMetricDto {
  @ApiProperty({ description: 'Total revenue for the period' })
  totalRevenue: number;

  @ApiProperty({ description: 'Total transaction count' })
  transactionCount: number;

  @ApiProperty({ description: 'Average revenue per transaction' })
  averageRevenue: number;

  @ApiProperty({ description: 'Revenue breakdown by period (daily, weekly, or monthly)' })
  periods: PeriodMetricDto[];

  @ApiPropertyOptional({ description: 'Comparison metrics to prior period' })
  comparison?: {
    totalRevenue: number;
    percentageChange: number;
  };
}

/**
 * Gross Merchandise Value (GMV) = SUM(total) without adjustments.
 */
export class GMVMetricDto {
  @ApiProperty({ description: 'Total GMV for the period' })
  totalGMV: number;

  @ApiProperty({ description: 'Number of orders' })
  orderCount: number;

  @ApiProperty({ description: 'Average GMV per order' })
  averageGMV: number;

  @ApiProperty({ description: 'GMV by period' })
  periods: PeriodMetricDto[];
}

/**
 * Order metrics: count, AOV, fulfillment rate.
 */
export class OrderMetricDto {
  @ApiProperty({ description: 'Total number of orders' })
  totalOrders: number;

  @ApiProperty({ description: 'Average order value (AOV)' })
  averageOrderValue: number;

  @ApiProperty({ description: 'Total gross value of all orders' })
  totalOrderValue: number;

  @ApiProperty({ description: 'Number of confirmed orders' })
  confirmedOrders: number;

  @ApiProperty({ description: 'Number of delivered orders' })
  deliveredOrders: number;

  @ApiProperty({ description: 'Fulfillment rate: delivered / total' })
  fulfillmentRate: number;

  @ApiProperty({ description: 'Orders by state' })
  ordersByStatus: {
    [status: string]: number;
  };

  @ApiPropertyOptional({ description: 'Period-over-period comparison' })
  comparison?: {
    totalOrders: number;
    percentageChange: number;
  };
}

/**
 * Average Order Value (AOV) metrics.
 */
export class AOVMetricDto {
  @ApiProperty({ description: 'Average order value' })
  aov: number;

  @ApiProperty({ description: 'Median order value' })
  medianOrderValue: number;

  @ApiProperty({ description: 'Min order value' })
  minOrderValue: number;

  @ApiProperty({ description: 'Max order value' })
  maxOrderValue: number;

  @ApiProperty({ description: 'Total number of orders' })
  totalOrders: number;

  @ApiProperty({ description: 'AOV by period' })
  periods: Array<{
    period: string;
    aov: number;
    orderCount: number;
    trend: 'up' | 'down' | 'stable';
  }>;

  @ApiPropertyOptional({ description: 'AOV growth vs. prior period' })
  growth?: {
    currentAOV: number;
    priorAOV: number;
    percentageChange: number;
  };
}

/**
 * Customer retention cohort matrix.
 * Rows = signup cohorts, Columns = months since signup.
 */
export class RetentionMatrixDto {
  @ApiProperty({ description: 'List of signup cohorts' })
  cohorts: Array<{
    cohortPeriod: string; // '2026-01' or '2026-W01'
    customerCount: number; // Customers who signed up in this period
    firstPurchaseCount: number; // How many made a purchase
  }>;

  @ApiProperty({
    description:
      'Retention matrix: [cohort_index][offset] = retention % at that offset period',
  })
  retention: number[][]; // [cohort][month_offset]

  @ApiProperty({ description: 'Churn rate per cohort (inverse of retention)' })
  churn: number[][];

  @ApiProperty({ description: 'Cohort period granularity (weekly or monthly)' })
  cohortPeriod: 'weekly' | 'monthly';

  @ApiProperty({ description: 'Total customers tracked' })
  totalCustomers: number;
}

/**
 * Customer Acquisition Cost (CAC) metrics.
 * Note: Requires external marketing spend data.
 */
export class CACMetricDto {
  @ApiProperty({
    description: 'CAC = total marketing spend / new customers acquired',
  })
  cac: number | null; // null if spend data not available

  @ApiProperty({ description: 'Number of new customers acquired' })
  newCustomers: number;

  @ApiProperty({ description: 'Total marketing spend (requires external data)' })
  marketingSpend: number | null;

  @ApiProperty({ description: 'CAC by marketing channel' })
  byChannel: Array<{
    channel: string;
    newCustomers: number;
    spend: number | null;
    cac: number | null;
  }>;

  @ApiProperty({ description: 'Note on data availability' })
  note: string; // e.g., "Marketing spend data not available; CAC requires external data source"
}

/**
 * Lifetime Value (LTV) per customer cohort.
 */
export class LTVMetricDto {
  @ApiProperty({ description: 'Average LTV per customer in cohort' })
  ltv: number;

  @ApiProperty({ description: 'Total revenue from cohort' })
  totalRevenue: number;

  @ApiProperty({ description: 'Number of customers in cohort' })
  customerCount: number;

  @ApiProperty({ description: 'Median LTV' })
  medianLTV: number;

  @ApiProperty({ description: 'Min LTV (lowest customer)' })
  minLTV: number;

  @ApiProperty({ description: 'Max LTV (highest customer)' })
  maxLTV: number;

  @ApiProperty({ description: 'Signup cohort period (e.g., 2026-01)' })
  cohortPeriod: string;

  @ApiProperty({ description: 'LTV by age (months since signup)' })
  ltvByAge: Array<{
    ageMonths: number;
    ltv: number;
    activeCustomers: number;
  }>;
}

/**
 * Channel breakdown (e.g., WhatsApp, Web, In-Person).
 */
export class ChannelMetricDto {
  @ApiProperty({ description: 'Sales channel name' })
  channel: string;

  @ApiProperty({ description: 'Revenue from this channel' })
  revenue: number;

  @ApiProperty({ description: 'Number of orders from this channel' })
  orderCount: number;

  @ApiProperty({ description: 'Average order value for this channel' })
  averageOrderValue: number;

  @ApiProperty({ description: 'Percentage of total revenue' })
  percentageOfTotal: number;

  @ApiProperty({ description: 'Number of unique customers for this channel' })
  uniqueCustomers: number;

  @ApiProperty({ description: 'Channel growth vs. prior period' })
  growth?: {
    previousRevenue: number;
    percentageChange: number;
  };
}

/**
 * Product performance metrics (revenue, units sold, etc.).
 */
export class ProductMetricDto {
  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Product name' })
  productName: string;

  @ApiProperty({ description: 'Total revenue from this product' })
  revenue: number;

  @ApiProperty({ description: 'Total units sold' })
  unitsSold: number;

  @ApiProperty({ description: 'Average unit price' })
  averagePrice: number;

  @ApiProperty({ description: 'Number of unique customers who bought this product' })
  uniqueCustomers: number;

  @ApiProperty({ description: 'Percentage of total revenue' })
  revenuePercentage: number;

  @ApiProperty({ description: 'Rank among all products' })
  rank: number;

  @ApiPropertyOptional({ description: 'Estimated profit margin (if cost data available)' })
  profitMargin?: number;

  @ApiPropertyOptional({ description: 'Sales trend: up, down, or stable' })
  trend?: 'up' | 'down' | 'stable';
}

/**
 * Top products summary (shorthand version).
 */
export class TopProductsDto {
  @ApiProperty({ description: 'List of top N products' })
  products: ProductMetricDto[];

  @ApiProperty({ description: 'Total revenue from top products' })
  totalRevenue: number;

  @ApiProperty({ description: 'Percentage of overall revenue' })
  percentageOfTotal: number;
}

/**
 * Summary dashboard: key KPIs at a glance.
 */
export class DashboardKPIDto {
  @ApiProperty({ description: 'Current period revenue' })
  revenue: number;

  @ApiProperty({ description: 'Current period order count' })
  orders: number;

  @ApiProperty({ description: 'Average order value' })
  aov: number;

  @ApiProperty({ description: 'Number of active customers' })
  activeCustomers: number;

  @ApiProperty({ description: 'Customer retention (D7, D30)' })
  retention: {
    d7: number; // % of customers who purchased again within 7 days
    d30: number; // % of customers who purchased again within 30 days
  };

  @ApiProperty({ description: 'Estimated customer LTV' })
  ltv: number;

  @ApiProperty({ description: 'Estimated CAC' })
  cac: number | null;

  @ApiProperty({ description: 'Top revenue channel' })
  topChannel: string;

  @ApiProperty({ description: 'Top revenue product' })
  topProduct: string;
}
