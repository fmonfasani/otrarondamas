import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import {
  RevenueMetricDto,
  GMVMetricDto,
  OrderMetricDto,
  AOVMetricDto,
  ChannelMetricDto,
  ProductMetricDto,
  TopProductsDto,
  PeriodMetricDto,
} from './dto/responses';

/**
 * P9-2 Business Metrics Service
 *
 * Aggregates and calculates KPIs for revenue, orders, customers, and products.
 * All queries are company-scoped via CompanyScopedPrismaService.
 *
 * Metric Definitions:
 * - Revenue: SUM(Venta.total - Venta.descuento) WHERE estado='CONFIRMADA'
 * - GMV: SUM(Venta.total) WHERE estado='CONFIRMADA' (gross, no discount)
 * - Order Count: COUNT(DISTINCT Pedido.id)
 * - AOV: Total order value / order count
 * - Channel: GROUP BY Pedido.canalOrigen
 * - Product: GROUP BY VentaItem.productoId
 */
@Injectable()
export class MetricsService {
  constructor(private readonly prismaFactory: CompanyScopedPrismaService) {}

  /**
   * Get revenue metrics for a given date range with optional period breakdown
   * and period-over-period comparison.
   */
  async getRevenueMetrics(
    companyId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'daily' | 'weekly' | 'monthly' = 'daily',
    compareTo: 'previous_period' | 'year_ago' | 'none' = 'none',
  ): Promise<RevenueMetricDto> {
    const db = this.prismaFactory.forCompany(companyId);

    // Fetch main period
    const ventas = await db.venta.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        estado: 'CONFIRMADA',
      },
      select: {
        id: true,
        total: true,
        descuento: true,
        createdAt: true,
      },
    });

    // Calculate metrics for main period
    const totalRevenue = this.sumDecimal(
      ventas.map((v) => this.toDecimal(v.total).minus(this.toDecimal(v.descuento || 0))),
    );
    const averageRevenue =
      ventas.length > 0
        ? Number(totalRevenue) / ventas.length
        : 0;

    // Group by period
    const periods = this.groupByPeriod(ventas, groupBy);

    // Comparison metrics
    let comparison: { totalRevenue: number; percentageChange: number } | undefined;
    if (compareTo !== 'none') {
      const priorPeriod = this.calculatePriorPeriod(startDate, endDate, compareTo);
      const priorVentas = await db.venta.findMany({
        where: {
          createdAt: { gte: priorPeriod.start, lte: priorPeriod.end },
          estado: 'CONFIRMADA',
        },
        select: {
          total: true,
          descuento: true,
        },
      });

      const priorRevenue = this.sumDecimal(
        priorVentas.map((v) => this.toDecimal(v.total).minus(this.toDecimal(v.descuento || 0))),
      );
      const percentageChange =
        Number(priorRevenue) > 0
          ? ((Number(totalRevenue) - Number(priorRevenue)) / Number(priorRevenue)) * 100
          : 0;

      comparison = {
        totalRevenue: Number(priorRevenue),
        percentageChange,
      };
    }

    return {
      totalRevenue: Number(totalRevenue),
      transactionCount: ventas.length,
      averageRevenue,
      periods: periods.map((p) => ({
        ...p,
        average: p.count > 0 ? p.revenue / p.count : 0,
      })),
      comparison,
    };
  }

  /**
   * Get Gross Merchandise Value (GMV) metrics.
   * GMV = SUM(total) without discount adjustments.
   */
  async getGMVMetrics(
    companyId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'daily' | 'weekly' | 'monthly' = 'daily',
  ): Promise<GMVMetricDto> {
    const db = this.prismaFactory.forCompany(companyId);

    const ventas = await db.venta.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        estado: 'CONFIRMADA',
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
      },
    });

    const totalGMV = this.sumDecimal(ventas.map((v) => this.toDecimal(v.total)));
    const averageGMV = ventas.length > 0 ? Number(totalGMV) / ventas.length : 0;

    const periods = this.groupByPeriod(
      ventas.map((v) => ({
        ...v,
        descuento: null,
      })),
      groupBy,
    );

    return {
      totalGMV: Number(totalGMV),
      orderCount: ventas.length,
      averageGMV,
      periods: periods.map((p) => ({
        ...p,
        average: p.count > 0 ? p.revenue / p.count : 0,
      })),
    };
  }

  /**
   * Get order metrics: count, AOV, fulfillment rate, and breakdown by status.
   */
  async getOrderMetrics(
    companyId: string,
    startDate: Date,
    endDate: Date,
    compareTo: 'previous_period' | 'year_ago' | 'none' = 'none',
  ): Promise<OrderMetricDto> {
    const db = this.prismaFactory.forCompany(companyId);

    const pedidos = await db.pedido.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        total: true,
        estado: true,
      },
    });

    const totalOrderValue = this.sumDecimal(pedidos.map((p) => this.toDecimal(p.total)));
    const totalOrders = pedidos.length;
    const averageOrderValue = totalOrders > 0 ? Number(totalOrderValue) / totalOrders : 0;

    // Count by status
    const ordersByStatus: { [key: string]: number } = {};
    let confirmedOrders = 0;
    let deliveredOrders = 0;

    for (const pedido of pedidos) {
      ordersByStatus[pedido.estado] = (ordersByStatus[pedido.estado] || 0) + 1;
      if (pedido.estado === 'CONFIRMADO') confirmedOrders++;
      if (pedido.estado === 'ENTREGADO') deliveredOrders++;
    }

    const fulfillmentRate = totalOrders > 0 ? deliveredOrders / totalOrders : 0;

    // Comparison
    let comparison: { totalOrders: number; percentageChange: number } | undefined;
    if (compareTo !== 'none') {
      const priorPeriod = this.calculatePriorPeriod(startDate, endDate, compareTo);
      const priorPedidos = await db.pedido.findMany({
        where: {
          createdAt: { gte: priorPeriod.start, lte: priorPeriod.end },
        },
        select: { id: true },
      });

      const percentageChange =
        priorPedidos.length > 0
          ? ((totalOrders - priorPedidos.length) / priorPedidos.length) * 100
          : 0;

      comparison = {
        totalOrders: priorPedidos.length,
        percentageChange,
      };
    }

    return {
      totalOrders,
      averageOrderValue,
      totalOrderValue: Number(totalOrderValue),
      confirmedOrders,
      deliveredOrders,
      fulfillmentRate: Number((fulfillmentRate * 100).toFixed(2)),
      ordersByStatus,
      comparison,
    };
  }

  /**
   * Get AOV (Average Order Value) metrics with trend analysis.
   */
  async getAOVMetrics(
    companyId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'daily' | 'weekly' | 'monthly' = 'daily',
    compareTo: 'previous_period' | 'year_ago' | 'none' = 'none',
  ): Promise<AOVMetricDto> {
    const db = this.prismaFactory.forCompany(companyId);

    const pedidos = await db.pedido.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
      },
    });

    if (pedidos.length === 0) {
      return {
        aov: 0,
        medianOrderValue: 0,
        minOrderValue: 0,
        maxOrderValue: 0,
        totalOrders: 0,
        periods: [],
      };
    }

    const values = pedidos.map((p) => Number(this.toDecimal(p.total)));
    const aov = values.reduce((a, b) => a + b, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const medianOrderValue =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    const minOrderValue = Math.min(...values);
    const maxOrderValue = Math.max(...values);

    // By period
    const groupedPedidos = pedidos.map((p) => ({
      ...p,
      descuento: null,
    }));
    const periods = this.groupByPeriod(groupedPedidos, groupBy).map((p) => {
      const periodValues = groupedPedidos
        .filter((v) => this.formatPeriod(v.createdAt, groupBy) === p.period)
        .map((v) => Number(this.toDecimal(v.total)));
      const periodAov = periodValues.length > 0 ? periodValues.reduce((a, b) => a + b) / periodValues.length : 0;
      return {
        period: p.period,
        aov: Number(periodAov.toFixed(2)),
        orderCount: p.count,
        trend: 'stable' as const,
      };
    });

    // Comparison
    let growth: { currentAOV: number; priorAOV: number; percentageChange: number } | undefined;
    if (compareTo !== 'none') {
      const priorPeriod = this.calculatePriorPeriod(startDate, endDate, compareTo);
      const priorPedidos = await db.pedido.findMany({
        where: {
          createdAt: { gte: priorPeriod.start, lte: priorPeriod.end },
        },
        select: { total: true },
      });

      if (priorPedidos.length > 0) {
        const priorValues = priorPedidos.map((p) => Number(this.toDecimal(p.total)));
        const priorAov = priorValues.reduce((a, b) => a + b, 0) / priorValues.length;
        const percentageChange = ((aov - priorAov) / priorAov) * 100;

        growth = {
          currentAOV: Number(aov.toFixed(2)),
          priorAOV: Number(priorAov.toFixed(2)),
          percentageChange: Number(percentageChange.toFixed(2)),
        };
      }
    }

    return {
      aov: Number(aov.toFixed(2)),
      medianOrderValue: Number(medianOrderValue.toFixed(2)),
      minOrderValue: Number(minOrderValue.toFixed(2)),
      maxOrderValue: Number(maxOrderValue.toFixed(2)),
      totalOrders: pedidos.length,
      periods,
      growth,
    };
  }

  /**
   * Get channel breakdown (by Pedido.canalOrigen).
   */
  async getChannelMetrics(
    companyId: string,
    startDate: Date,
    endDate: Date,
    compareTo: 'previous_period' | 'year_ago' | 'none' = 'none',
  ): Promise<ChannelMetricDto[]> {
    const db = this.prismaFactory.forCompany(companyId);

    const pedidos = await db.pedido.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        canalOrigen: true,
        total: true,
        clienteId: true,
      },
    });

    const channels = new Map<string, { revenue: number; orders: number; customers: Set<string> }>();

    for (const pedido of pedidos) {
      const channel = pedido.canalOrigen || 'unknown';
      if (!channels.has(channel)) {
        channels.set(channel, { revenue: 0, orders: 0, customers: new Set() });
      }
      const data = channels.get(channel)!;
      data.revenue += Number(this.toDecimal(pedido.total));
      data.orders += 1;
      if (pedido.clienteId) {
        data.customers.add(pedido.clienteId);
      }
    }

    const totalRevenue = Array.from(channels.values()).reduce((sum, c) => sum + c.revenue, 0);

    const metrics: ChannelMetricDto[] = [];
    for (const [channel, data] of channels) {
      metrics.push({
        channel,
        revenue: Number(data.revenue.toFixed(2)),
        orderCount: data.orders,
        averageOrderValue: Number((data.revenue / data.orders).toFixed(2)),
        percentageOfTotal: Number(((data.revenue / totalRevenue) * 100).toFixed(2)),
        uniqueCustomers: data.customers.size,
      });
    }

    // Sort by revenue descending
    metrics.sort((a, b) => b.revenue - a.revenue);

    return metrics;
  }

  /**
   * Get product performance metrics (top N products).
   */
  async getProductMetrics(
    companyId: string,
    startDate: Date,
    endDate: Date,
    topN: number = 10,
  ): Promise<TopProductsDto> {
    const db = this.prismaFactory.forCompany(companyId);

    const ventaItems = await db.ventaItem.findMany({
      where: {
        Venta: {
          createdAt: { gte: startDate, lte: endDate },
          estado: 'CONFIRMADA',
        },
      },
      select: {
        id: true,
        productoId: true,
        cantidad: true,
        precioUnitario: true,
        Producto: {
          select: {
            id: true,
            nombre: true,
          },
        },
        Venta: {
          select: {
            clienteId: true,
          },
        },
      },
    });

    const productMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        revenue: number;
        unitsSold: number;
        customers: Set<string>;
      }
    >();

    for (const item of ventaItems) {
      const key = item.productoId;
      if (!productMap.has(key)) {
        productMap.set(key, {
          productId: item.productoId,
          productName: item.Producto?.nombre || 'Unknown',
          revenue: 0,
          unitsSold: 0,
          customers: new Set(),
        });
      }

      const product = productMap.get(key)!;
      const itemRevenue = Number(this.toDecimal(item.precioUnitario).times(this.toDecimal(item.cantidad)));
      product.revenue += itemRevenue;
      product.unitsSold += Number(this.toDecimal(item.cantidad));
      if (item.Venta?.clienteId) {
        product.customers.add(item.Venta.clienteId);
      }
    }

    const products: ProductMetricDto[] = Array.from(productMap.values())
      .map((p, idx) => ({
        productId: p.productId,
        productName: p.productName,
        revenue: Number(p.revenue.toFixed(2)),
        unitsSold: Number(p.unitsSold.toFixed(2)),
        averagePrice: Number((p.revenue / p.unitsSold).toFixed(2)),
        uniqueCustomers: p.customers.size,
        revenuePercentage: 0, // Will calculate after sorting
        rank: idx + 1,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, topN);

    const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
    for (const product of products) {
      product.revenuePercentage = Number(((product.revenue / totalRevenue) * 100).toFixed(2));
    }

    return {
      products,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      percentageOfTotal: 100, // Top N products as % of total (will vary based on topN)
    };
  }

  /**
   * Helper: Convert Prisma Decimal to Decimal for calculations.
   */
  private toDecimal(value: any): Prisma.Decimal {
    if (value instanceof Prisma.Decimal) {
      return value;
    }
    return new Prisma.Decimal(String(value || 0));
  }

  /**
   * Helper: Sum an array of Decimals.
   */
  private sumDecimal(values: Prisma.Decimal[]): Prisma.Decimal {
    return values.reduce((sum, val) => sum.plus(val), new Prisma.Decimal(0));
  }

  /**
   * Helper: Format date to period string (YYYY-MM-DD, YYYY-WXX, YYYY-MM).
   */
  private formatPeriod(date: Date, period: 'daily' | 'weekly' | 'monthly'): string {
    const d = new Date(date);
    if (period === 'daily') {
      return d.toISOString().split('T')[0];
    }

    if (period === 'weekly') {
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const days = Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
    }

    // monthly
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Helper: Group items by period.
   */
  private groupByPeriod(
    items: Array<{ createdAt: Date; total: any; descuento: any }>,
    period: 'daily' | 'weekly' | 'monthly',
  ): PeriodMetricDto[] {
    const grouped = new Map<string, { revenue: number; count: number }>();

    for (const item of items) {
      const periodKey = this.formatPeriod(item.createdAt, period);
      if (!grouped.has(periodKey)) {
        grouped.set(periodKey, { revenue: 0, count: 0 });
      }
      const data = grouped.get(periodKey)!;
      const itemRevenue = Number(
        this.toDecimal(item.total).minus(this.toDecimal(item.descuento || 0)),
      );
      data.revenue += itemRevenue;
      data.count += 1;
    }

    return Array.from(grouped.entries())
      .map(([period, data]) => ({
        period,
        revenue: Number(data.revenue.toFixed(2)),
        count: data.count,
        average: 0, // Will be calculated by caller
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Helper: Calculate prior period dates.
   */
  private calculatePriorPeriod(
    startDate: Date,
    endDate: Date,
    compareTo: 'previous_period' | 'year_ago',
  ): { start: Date; end: Date } {
    const duration = endDate.getTime() - startDate.getTime();

    if (compareTo === 'previous_period') {
      const priorEnd = new Date(startDate.getTime() - 1);
      const priorStart = new Date(priorEnd.getTime() - duration);
      return { start: priorStart, end: priorEnd };
    }

    // year_ago
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    return {
      start: new Date(startDate.getTime() - oneYearMs),
      end: new Date(endDate.getTime() - oneYearMs),
    };
  }
}
