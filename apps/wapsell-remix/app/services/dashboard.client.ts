import { z } from 'zod';

// --- Schema definitions for dashboard API responses ---

export const MetricValueSchema = z.object({
  value: z.number(),
  change: z.number(),
  trend: z.enum(['up', 'down', 'stable']).optional(),
  currency: z.string().optional(),
});

export const DashboardKPISchema = z.object({
  period: z.string(),
  businessId: z.string(),
  kpis: z.object({
    totalRevenue: MetricValueSchema,
    totalOrders: MetricValueSchema,
    totalCustomers: MetricValueSchema,
    totalProducts: z.object({
      value: z.number(),
      active: z.number(),
      inactive: z.number(),
    }),
  }),
  asOf: z.coerce.date(),
});

export const TrendChartDataPointSchema = z.object({
  date: z.coerce.date(),
  revenue: z.number().optional(),
  orders: z.number().optional(),
});

export const TrendChartSchema = z.object({
  period: z.string(),
  businessId: z.string(),
  metric: z.enum(['revenue', 'orders']),
  data: z.array(TrendChartDataPointSchema),
  asOf: z.coerce.date(),
});

export const TopProductSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  revenue: z.number(),
  quantity: z.number(),
  rank: z.number(),
});

export const TopProductsSchema = z.object({
  businessId: z.string(),
  period: z.string(),
  metric: z.enum(['revenue', 'quantity']),
  products: z.array(TopProductSchema),
  asOf: z.coerce.date(),
});

export const ChannelBreakdownSchema = z.object({
  channel: z.string(),
  revenue: z.number(),
  orders: z.number(),
  percentage: z.number(),
});

export const ChannelBreakdownResponseSchema = z.object({
  businessId: z.string(),
  period: z.string(),
  data: z.array(ChannelBreakdownSchema),
  totalRevenue: z.number(),
  totalOrders: z.number(),
  asOf: z.coerce.date(),
});

export const GeographicBreakdownSchema = z.object({
  city: z.string(),
  revenue: z.number(),
  orders: z.number(),
  customers: z.number(),
  percentage: z.number(),
});

export const GeographicBreakdownResponseSchema = z.object({
  businessId: z.string(),
  period: z.string(),
  data: z.array(GeographicBreakdownSchema),
  totalRevenue: z.number(),
  asOf: z.coerce.date(),
});

// --- Type exports for use in loaders and components ---

export type MetricValue = z.infer<typeof MetricValueSchema>;
export type DashboardKPI = z.infer<typeof DashboardKPISchema>;
export type TrendChartDataPoint = z.infer<typeof TrendChartDataPointSchema>;
export type TrendChart = z.infer<typeof TrendChartSchema>;
export type TopProduct = z.infer<typeof TopProductSchema>;
export type TopProducts = z.infer<typeof TopProductsSchema>;
export type ChannelBreakdown = z.infer<typeof ChannelBreakdownSchema>;
export type ChannelBreakdownResponse = z.infer<typeof ChannelBreakdownResponseSchema>;
export type GeographicBreakdown = z.infer<typeof GeographicBreakdownSchema>;
export type GeographicBreakdownResponse = z.infer<typeof GeographicBreakdownResponseSchema>;

// --- Configuration ---

const API_URL = process.env.VITE_API_URL || 'http://localhost:8600';
const API_TIMEOUT = parseInt(process.env.VITE_API_TIMEOUT || '30000');

// --- Error handling utilities ---

export class DashboardAPIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DashboardAPIError';
  }
}

async function handleAPIError(response: Response): Promise<never> {
  let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

  try {
    const errorData = await response.json().catch(() => ({}));
    if (errorData.message) {
      errorMessage = errorData.message;
    }
  } catch {
    // Error parsing response body, use default message
  }

  throw new DashboardAPIError(response.status, errorMessage);
}

// --- API client functions ---

/**
 * Fetch dashboard KPIs with optional period filter
 * @param jwt - JWT token for authorization
 * @param period - Time period: '7d', '30d', '90d' (default: '30d')
 * @throws {DashboardAPIError} on API error or timeout
 */
export async function getDashboardKPIs(
  jwt: string,
  period: '7d' | '30d' | '90d' = '30d'
): Promise<DashboardKPI> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(
      `${API_URL}/admin/dashboard/kpis?period=${period}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    return DashboardKPISchema.parse(data);
  } catch (error) {
    if (error instanceof DashboardAPIError) {
      throw error;
    }
    if (error instanceof TypeError && error.name === 'AbortError') {
      throw new DashboardAPIError(
        408,
        'Dashboard KPI request timeout',
        error as Error
      );
    }
    throw new DashboardAPIError(
      500,
      'Failed to fetch dashboard KPIs',
      error instanceof Error ? error : new Error(String(error))
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch trend chart data
 * @param jwt - JWT token for authorization
 * @param metric - Metric to chart: 'revenue' or 'orders'
 * @param period - Time period: '7d', '30d', '90d' (default: '30d')
 * @throws {DashboardAPIError} on API error or timeout
 */
export async function getTrendChart(
  jwt: string,
  metric: 'revenue' | 'orders' = 'revenue',
  period: '7d' | '30d' | '90d' = '30d'
): Promise<TrendChart> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(
      `${API_URL}/admin/dashboard/trends?metric=${metric}&period=${period}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    return TrendChartSchema.parse(data);
  } catch (error) {
    if (error instanceof DashboardAPIError) {
      throw error;
    }
    if (error instanceof TypeError && error.name === 'AbortError') {
      throw new DashboardAPIError(
        408,
        'Trend chart request timeout',
        error as Error
      );
    }
    throw new DashboardAPIError(
      500,
      'Failed to fetch trend chart',
      error instanceof Error ? error : new Error(String(error))
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch top products
 * @param jwt - JWT token for authorization
 * @param limit - Number of products to return (default: 10, max: 100)
 * @param metric - Sort by: 'revenue' or 'quantity' (default: 'revenue')
 * @throws {DashboardAPIError} on API error or timeout
 */
export async function getTopProducts(
  jwt: string,
  limit: number = 10,
  metric: 'revenue' | 'quantity' = 'revenue'
): Promise<TopProducts> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(
      `${API_URL}/admin/dashboard/top-products?limit=${Math.min(limit, 100)}&metric=${metric}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    return TopProductsSchema.parse(data);
  } catch (error) {
    if (error instanceof DashboardAPIError) {
      throw error;
    }
    if (error instanceof TypeError && error.name === 'AbortError') {
      throw new DashboardAPIError(
        408,
        'Top products request timeout',
        error as Error
      );
    }
    throw new DashboardAPIError(
      500,
      'Failed to fetch top products',
      error instanceof Error ? error : new Error(String(error))
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch channel breakdown (online vs retail)
 * @param jwt - JWT token for authorization
 * @param period - Time period: '7d', '30d', '90d' (default: '30d')
 * @throws {DashboardAPIError} on API error or timeout
 */
export async function getChannelBreakdown(
  jwt: string,
  period: '7d' | '30d' | '90d' = '30d'
): Promise<ChannelBreakdownResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(
      `${API_URL}/admin/dashboard/channel-breakdown?period=${period}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    return ChannelBreakdownResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof DashboardAPIError) {
      throw error;
    }
    if (error instanceof TypeError && error.name === 'AbortError') {
      throw new DashboardAPIError(
        408,
        'Channel breakdown request timeout',
        error as Error
      );
    }
    throw new DashboardAPIError(
      500,
      'Failed to fetch channel breakdown',
      error instanceof Error ? error : new Error(String(error))
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch geographic breakdown by city
 * @param jwt - JWT token for authorization
 * @param period - Time period: '7d', '30d', '90d' (default: '30d')
 * @throws {DashboardAPIError} on API error or timeout
 */
export async function getGeographicBreakdown(
  jwt: string,
  period: '7d' | '30d' | '90d' = '30d'
): Promise<GeographicBreakdownResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(
      `${API_URL}/admin/dashboard/geographic-breakdown?period=${period}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    return GeographicBreakdownResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof DashboardAPIError) {
      throw error;
    }
    if (error instanceof TypeError && error.name === 'AbortError') {
      throw new DashboardAPIError(
        408,
        'Geographic breakdown request timeout',
        error as Error
      );
    }
    throw new DashboardAPIError(
      500,
      'Failed to fetch geographic breakdown',
      error instanceof Error ? error : new Error(String(error))
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
