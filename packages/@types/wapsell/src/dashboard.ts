/**
 * Dashboard and Analytics types
 * Types for KPIs, metrics, dashboards, and business intelligence
 */

import { z } from 'zod';
import { Id, Timestamps, Decimal, DecimalSchema } from './common';

/**
 * Time period for analytics
 */
export enum TimePeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

/**
 * Metric type
 */
export enum MetricType {
  // Sales metrics
  TOTAL_SALES = 'TOTAL_SALES',
  AVERAGE_SALE = 'AVERAGE_SALE',
  SALES_COUNT = 'SALES_COUNT',
  SALES_BY_CHANNEL = 'SALES_BY_CHANNEL',
  SALES_BY_PRODUCT = 'SALES_BY_PRODUCT',

  // Customer metrics
  TOTAL_CUSTOMERS = 'TOTAL_CUSTOMERS',
  NEW_CUSTOMERS = 'NEW_CUSTOMERS',
  REPEAT_CUSTOMERS = 'REPEAT_CUSTOMERS',
  CUSTOMER_LIFETIME_VALUE = 'CUSTOMER_LIFETIME_VALUE',
  CUSTOMER_ACQUISITION_COST = 'CUSTOMER_ACQUISITION_COST',

  // Inventory metrics
  TOTAL_STOCK_VALUE = 'TOTAL_STOCK_VALUE',
  LOW_STOCK_PRODUCTS = 'LOW_STOCK_PRODUCTS',
  INVENTORY_TURNOVER = 'INVENTORY_TURNOVER',
  STOCK_OUT_PRODUCTS = 'STOCK_OUT_PRODUCTS',

  // Payment metrics
  TOTAL_REVENUE = 'TOTAL_REVENUE',
  PENDING_PAYMENTS = 'PENDING_PAYMENTS',
  PAYMENT_SUCCESS_RATE = 'PAYMENT_SUCCESS_RATE',

  // Order metrics
  TOTAL_ORDERS = 'TOTAL_ORDERS',
  PENDING_ORDERS = 'PENDING_ORDERS',
  COMPLETED_ORDERS = 'COMPLETED_ORDERS',
  CANCELLED_ORDERS = 'CANCELLED_ORDERS',
  AVERAGE_ORDER_VALUE = 'AVERAGE_ORDER_VALUE',

  // Performance metrics
  CONVERSION_RATE = 'CONVERSION_RATE',
  BOUNCE_RATE = 'BOUNCE_RATE',
  AVG_SESSION_DURATION = 'AVG_SESSION_DURATION',
  PAGES_PER_SESSION = 'PAGES_PER_SESSION',
}

/**
 * Analytics event
 */
export interface AnalyticsEvent extends Timestamps {
  id: Id;
  empresaId: Id;
  userId?: Id;
  eventType: string;
  eventName: string;
  category?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  sessionId?: string;
}

/**
 * Analytics aggregation (pre-calculated metrics)
 */
export interface AnalyticsAggregation extends Timestamps {
  id: Id;
  empresaId: Id;
  period: TimePeriod;
  periodStart: Date;
  periodEnd: Date;
  eventType: string;
  eventName?: string;
  count: number;
  uniqueUsers: number;
  avgValue?: Decimal;
  metadata?: Record<string, unknown>;
}

/**
 * KPI (Key Performance Indicator)
 */
export interface KPI {
  id: Id;
  nombre: string;
  metricType: MetricType;
  valor: Decimal;
  comparacion?: {
    anterior: Decimal;
    cambio: Decimal;
    porcentaje: Decimal;
  };
  tendencia?: 'UP' | 'DOWN' | 'STABLE';
  unidad?: string;
  formatoMuestra?: 'currency' | 'percentage' | 'number' | 'count';
}

/**
 * Dashboard widget
 */
export enum WidgetType {
  METRIC = 'METRIC',
  CHART = 'CHART',
  TABLE = 'TABLE',
  GAUGE = 'GAUGE',
  TREND = 'TREND',
  MAP = 'MAP',
}

/**
 * Chart type
 */
export enum ChartType {
  LINE = 'LINE',
  BAR = 'BAR',
  AREA = 'AREA',
  PIE = 'PIE',
  DOUGHNUT = 'DOUGHNUT',
  BUBBLE = 'BUBBLE',
  SCATTER = 'SCATTER',
  HEATMAP = 'HEATMAP',
}

/**
 * Dashboard widget
 */
export interface DashboardWidget extends Timestamps {
  id: Id;
  dashboardId: Id;
  titulo: string;
  tipo: WidgetType;
  metricType?: MetricType;
  chartType?: ChartType;
  orden: number;
  configuracion: WidgetConfig;
  datos?: unknown[];
}

/**
 * Widget configuration
 */
export interface WidgetConfig {
  periodo: TimePeriod;
  fechaInicio?: Date;
  fechaFin?: Date;
  filtros?: Record<string, unknown>;
  agruparPor?: string;
  ordenar?: {
    campo: string;
    orden: 'ASC' | 'DESC';
  };
  colores?: string[];
  mostrarLeyenda?: boolean;
  mostrarEtiquetas?: boolean;
  altura?: number;
  ancho?: number;
}

/**
 * Dashboard
 */
export interface Dashboard extends Timestamps {
  id: Id;
  empresaId: Id;
  nombre: string;
  descripcion?: string;
  configuracion: DashboardConfig;
  widgets: DashboardWidget[];
  favorito: boolean;
  publico: boolean;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  columnas: number; // Grid layout columns
  autoRefresco?: number; // Auto-refresh interval in seconds
  tema?: 'light' | 'dark';
  filtrosGlobales?: {
    periodo?: TimePeriod;
    fechaInicio?: Date;
    fechaFin?: Date;
    empresaId?: Id;
    usuarioId?: Id;
  };
}

/**
 * Report
 */
export enum ReportType {
  SALES_REPORT = 'SALES_REPORT',
  INVENTORY_REPORT = 'INVENTORY_REPORT',
  CUSTOMER_REPORT = 'CUSTOMER_REPORT',
  PAYMENT_REPORT = 'PAYMENT_REPORT',
  PERFORMANCE_REPORT = 'PERFORMANCE_REPORT',
}

/**
 * Business report
 */
export interface Report extends Timestamps {
  id: Id;
  empresaId: Id;
  tipo: ReportType;
  titulo: string;
  descripcion?: string;
  periodo: {
    inicio: Date;
    fin: Date;
  };
  datos: ReportData;
  generadoPor: Id;
  generadoEn: Date;
  url?: string; // Link to PDF or downloadable report
}

/**
 * Report data structure
 */
export interface ReportData {
  resumen: Record<string, unknown>;
  detalles: Record<string, unknown>[];
  graficos?: Array<{
    titulo: string;
    tipo: ChartType;
    datos: unknown[];
  }>;
}

/**
 * Sales report specific
 */
export interface SalesReport extends Report {
  tipo: ReportType.SALES_REPORT;
  datos: SalesReportData;
}

export interface SalesReportData extends ReportData {
  resumen: {
    totalVentas: Decimal;
    cantidadVentas: number;
    ventaPromedio: Decimal;
    descuentoTotal: Decimal;
    pagosProcesados: Decimal;
    pagosPendientes: Decimal;
  };
  detalles: Array<{
    fecha: Date;
    cliente: string;
    monto: Decimal;
    canal: string;
    usuario: string;
  }>;
}

/**
 * Inventory report specific
 */
export interface InventoryReport extends Report {
  tipo: ReportType.INVENTORY_REPORT;
  datos: InventoryReportData;
}

export interface InventoryReportData extends ReportData {
  resumen: {
    productosTotales: number;
    productosActivos: number;
    productosBajoStock: number;
    productosAgotados: number;
    valorInventario: Decimal;
  };
  detalles: Array<{
    codigo: string;
    nombre: string;
    stock: Decimal;
    stockMinimo: Decimal;
    valor: Decimal;
    estado: string;
  }>;
}

/**
 * Analytics query
 */
export interface AnalyticsQuery {
  empresaId: Id;
  periodo: TimePeriod;
  fechaInicio?: Date;
  fechaFin?: Date;
  metricas: MetricType[];
  agruparPor?: string;
  filtros?: Record<string, unknown>;
  ordernarPor?: string;
  limit?: number;
  offset?: number;
}

/**
 * Analytics response
 */
export interface AnalyticsResponse {
  query: AnalyticsQuery;
  datos: Array<{
    metrica: MetricType;
    valor: Decimal;
    comparacion?: {
      anterior: Decimal;
      cambio: Decimal;
      porcentaje: Decimal;
    };
    series?: Array<{
      label: string;
      valor: Decimal;
      fecha?: Date;
    }>;
  }>;
  generadoEn: Date;
}

/**
 * Zod validation schemas
 */
export const TimePeriodSchema = z.nativeEnum(TimePeriod);
export const MetricTypeSchema = z.nativeEnum(MetricType);
export const WidgetTypeSchema = z.nativeEnum(WidgetType);
export const ChartTypeSchema = z.nativeEnum(ChartType);
export const ReportTypeSchema = z.nativeEnum(ReportType);

export const KPISchema = z.object({
  id: z.string(),
  nombre: z.string(),
  metricType: MetricTypeSchema,
  valor: DecimalSchema,
  comparacion: z
    .object({
      anterior: DecimalSchema,
      cambio: DecimalSchema,
      porcentaje: DecimalSchema,
    })
    .optional(),
  tendencia: z.enum(['UP', 'DOWN', 'STABLE']).optional(),
  unidad: z.string().optional(),
  formatoMuestra: z.enum(['currency', 'percentage', 'number', 'count']).optional(),
});

export const WidgetConfigSchema = z.object({
  periodo: TimePeriodSchema,
  fechaInicio: z.coerce.date().optional(),
  fechaFin: z.coerce.date().optional(),
  filtros: z.record(z.unknown()).optional(),
  agruparPor: z.string().optional(),
  ordenar: z
    .object({
      campo: z.string(),
      orden: z.enum(['ASC', 'DESC']),
    })
    .optional(),
  colores: z.array(z.string()).optional(),
  mostrarLeyenda: z.boolean().optional(),
  mostrarEtiquetas: z.boolean().optional(),
  altura: z.number().optional(),
  ancho: z.number().optional(),
});

export const DashboardConfigSchema = z.object({
  columnas: z.number().int().positive(),
  autoRefresco: z.number().optional(),
  tema: z.enum(['light', 'dark']).optional(),
  filtrosGlobales: z
    .object({
      periodo: TimePeriodSchema.optional(),
      fechaInicio: z.coerce.date().optional(),
      fechaFin: z.coerce.date().optional(),
      empresaId: z.string().optional(),
      usuarioId: z.string().optional(),
    })
    .optional(),
});

/**
 * Type inference helpers
 */
export type KPIType = z.infer<typeof KPISchema>;
export type WidgetConfigType = z.infer<typeof WidgetConfigSchema>;
export type DashboardConfigType = z.infer<typeof DashboardConfigSchema>;
