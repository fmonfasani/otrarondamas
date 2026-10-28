import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DashboardKPIDto,
  TrendChartDto,
  TopProductsDto,
  ChannelBreakdownResponseDto,
  GeographicBreakdownResponseDto,
} from '../dto/dashboard-kpi.dto';

@Injectable()
export class AnalyticsDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardKPIs(businessId: string, period: string = '30d'): Promise<DashboardKPIDto> {
    const dateRange = this.getDateRangeFromPeriod(period);
    const today = new Date();

    // Get current period data
    const currentVentas = await this.prisma.venta.findMany({
      where: {
        empresaId: businessId,
        createdAt: { gte: dateRange.gte },
        estado: 'CONFIRMADA',
      },
      include: { Cliente: true },
    });

    const currentPedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId: businessId,
        createdAt: { gte: dateRange.gte },
        estado: 'CONFIRMADO',
      },
    });

    // Get previous period data for comparison
    const previousPeriodDays = Math.ceil(
      (dateRange.gt.getTime() - dateRange.gte.getTime()) / (1000 * 60 * 60 * 24),
    );
    const previousStart = new Date(dateRange.gte);
    previousStart.setDate(previousStart.getDate() - previousPeriodDays);
    const previousEnd = new Date(dateRange.gte);

    const previousVentas = await this.prisma.venta.findMany({
      where: {
        empresaId: businessId,
        createdAt: { gte: previousStart, lt: previousEnd },
        estado: 'CONFIRMADA',
      },
    });

    const previousPedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId: businessId,
        createdAt: { gte: previousStart, lt: previousEnd },
        estado: 'CONFIRMADO',
      },
    });

    // Get distinct customers
    const currentCustomers = new Set(currentVentas.map((v) => v.clienteId).filter(Boolean));

    const previousCustomersCount = new Set(previousVentas.map((v) => v.clienteId).filter(Boolean))
      .size;

    // Get product count
    const totalProducts = await this.prisma.producto.count({
      where: { empresaId: businessId },
    });

    const activeProducts = await this.prisma.producto.count({
      where: { empresaId: businessId, activo: true },
    });

    // Calculate metrics
    const currentRevenue =
      currentVentas.reduce((sum, v) => sum + Number(v.total), 0) +
      currentPedidos.reduce((sum, p) => sum + Number(p.total), 0);

    const previousRevenue =
      previousVentas.reduce((sum, v) => sum + Number(v.total), 0) +
      previousPedidos.reduce((sum, p) => sum + Number(p.total), 0);

    const currentOrders = currentVentas.length + currentPedidos.length;
    const previousOrders = previousVentas.length + previousPedidos.length;

    const revenueChange =
      previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    const ordersChange =
      previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0;

    const customersChange =
      previousCustomersCount > 0
        ? ((currentCustomers.size - previousCustomersCount) / previousCustomersCount) * 100
        : 0;

    return {
      period,
      businessId,
      kpis: {
        totalRevenue: {
          value: Math.round(currentRevenue * 100) / 100,
          change: Math.round(revenueChange * 100) / 100,
          currency: 'ARS',
          trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'stable',
        },
        totalOrders: {
          value: currentOrders,
          change: Math.round(ordersChange * 100) / 100,
          trend: ordersChange > 0 ? 'up' : ordersChange < 0 ? 'down' : 'stable',
        },
        totalCustomers: {
          value: currentCustomers.size,
          change: Math.round(customersChange * 100) / 100,
          trend: customersChange > 0 ? 'up' : customersChange < 0 ? 'down' : 'stable',
        },
        totalProducts: {
          value: totalProducts,
          active: activeProducts,
          inactive: totalProducts - activeProducts,
        },
      },
      asOf: today,
    };
  }

  async getTrendChart(
    businessId: string,
    metric: 'revenue' | 'orders',
    period: string = '30d',
  ): Promise<TrendChartDto> {
    const dateRange = this.getDateRangeFromPeriod(period);

    const ventas = await this.prisma.venta.findMany({
      where: {
        empresaId: businessId,
        createdAt: { gte: dateRange.gte },
        estado: 'CONFIRMADA',
      },
    });

    const pedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId: businessId,
        createdAt: { gte: dateRange.gte },
        estado: 'CONFIRMADO',
      },
    });

    // Group by date
    const dataByDate: Record<string, { revenue: number; orders: number }> = {};

    const allTransactions = [...ventas, ...pedidos];

    for (const tx of allTransactions) {
      const dateKey = new Date(tx.createdAt).toISOString().split('T')[0];
      if (!dataByDate[dateKey]) {
        dataByDate[dateKey] = { revenue: 0, orders: 0 };
      }
      dataByDate[dateKey].revenue += Number(tx.total || 0);
      dataByDate[dateKey].orders += 1;
    }

    // Fill gaps with zero
    const data = [];
    for (
      let i = 0;
      i <= Math.ceil((dateRange.gt.getTime() - dateRange.gte.getTime()) / (1000 * 60 * 60 * 24));
      i++
    ) {
      const date = new Date(dateRange.gte);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];

      data.push({
        date: new Date(dateKey),
        revenue: dataByDate[dateKey]?.revenue || 0,
        orders: dataByDate[dateKey]?.orders || 0,
      });
    }

    return {
      period,
      businessId,
      metric,
      data,
      asOf: new Date(),
    };
  }

  async getTopProducts(
    businessId: string,
    limit: number = 10,
    metric: 'revenue' | 'quantity' = 'revenue',
  ): Promise<TopProductsDto> {
    const period = '30d';
    const dateRange = this.getDateRangeFromPeriod(period);

    const ventaItems = await this.prisma.ventaItem.findMany({
      where: {
        Venta: {
          empresaId: businessId,
          createdAt: { gte: dateRange.gte },
          estado: 'CONFIRMADA',
        },
      },
      include: { Producto: true },
    });

    const pedidoItems = await this.prisma.pedidoItem.findMany({
      where: {
        Pedido: {
          empresaId: businessId,
          createdAt: { gte: dateRange.gte },
          estado: 'CONFIRMADO',
        },
      },
      include: { Producto: true },
    });

    // Aggregate by product
    const productMap: Record<string, { product: any; revenue: number; quantity: number }> = {};

    for (const item of ventaItems) {
      if (!productMap[item.productoId]) {
        productMap[item.productoId] = {
          product: item.Producto,
          revenue: 0,
          quantity: 0,
        };
      }
      productMap[item.productoId].revenue +=
        Number(item.precioUnitario || 0) * Number(item.cantidad || 0);
      productMap[item.productoId].quantity += Number(item.cantidad || 0);
    }

    for (const item of pedidoItems) {
      if (!productMap[item.productoId]) {
        productMap[item.productoId] = {
          product: item.Producto,
          revenue: 0,
          quantity: 0,
        };
      }
      productMap[item.productoId].revenue +=
        Number(item.precioUnitario || 0) * Number(item.cantidad || 0);
      productMap[item.productoId].quantity += Number(item.cantidad || 0);
    }

    // Sort and limit
    const sorted = Object.values(productMap)
      .sort((a, b) => {
        if (metric === 'revenue') {
          return b.revenue - a.revenue;
        } else {
          return b.quantity - a.quantity;
        }
      })
      .slice(0, limit);

    return {
      businessId,
      period,
      metric,
      products: sorted.map((p, idx) => ({
        id: p.product.id,
        nombre: p.product.nombre,
        revenue: Math.round(p.revenue * 100) / 100,
        quantity: Math.round(p.quantity * 100) / 100,
        rank: idx + 1,
      })),
      asOf: new Date(),
    };
  }

  async getChannelBreakdown(
    businessId: string,
    period: string = '30d',
  ): Promise<ChannelBreakdownResponseDto> {
    const dateRange = this.getDateRangeFromPeriod(period);

    // Online sales (Pedido)
    const pedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId: businessId,
        createdAt: { gte: dateRange.gte },
        estado: 'CONFIRMADO',
      },
    });

    // Retail sales (Venta)
    const ventas = await this.prisma.venta.findMany({
      where: {
        empresaId: businessId,
        createdAt: { gte: dateRange.gte },
        estado: 'CONFIRMADA',
      },
    });

    const onlineRevenue = pedidos.reduce((sum, p) => sum + Number(p.total || 0), 0);
    const retailRevenue = ventas.reduce((sum, v) => sum + Number(v.total || 0), 0);
    const totalRevenue = onlineRevenue + retailRevenue;

    const onlineOrders = pedidos.length;
    const retailOrders = ventas.length;
    const totalOrders = onlineOrders + retailOrders;

    return {
      businessId,
      period,
      data: [
        {
          channel: 'Online',
          revenue: Math.round(onlineRevenue * 100) / 100,
          orders: onlineOrders,
          percentage: totalRevenue > 0 ? (onlineRevenue / totalRevenue) * 100 : 0,
        },
        {
          channel: 'Retail',
          revenue: Math.round(retailRevenue * 100) / 100,
          orders: retailOrders,
          percentage: totalRevenue > 0 ? (retailRevenue / totalRevenue) * 100 : 0,
        },
      ],
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      asOf: new Date(),
    };
  }

  async getGeographicBreakdown(
    businessId: string,
    period: string = '30d',
  ): Promise<GeographicBreakdownResponseDto> {
    const dateRange = this.getDateRangeFromPeriod(period);

    // Aggregate sales by customer location
    const ventas = await this.prisma.venta.findMany({
      where: {
        empresaId: businessId,
        createdAt: { gte: dateRange.gte },
        estado: 'CONFIRMADA',
      },
      include: { Cliente: true },
    });

    const pedidos = await this.prisma.pedido.findMany({
      where: {
        empresaId: businessId,
        createdAt: { gte: dateRange.gte },
        estado: 'CONFIRMADO',
      },
      include: { Cliente: true },
    });

    const cityMap: Record<string, { revenue: number; orders: number; customers: Set<string> }> = {};

    for (const v of ventas) {
      const city = v.Cliente?.nombre || 'Unknown';
      if (!cityMap[city]) {
        cityMap[city] = { revenue: 0, orders: 0, customers: new Set() };
      }
      cityMap[city].revenue += Number(v.total || 0);
      cityMap[city].orders += 1;
      if (v.clienteId) {
        cityMap[city].customers.add(v.clienteId);
      }
    }

    for (const p of pedidos) {
      const city = p.Cliente?.nombre || 'Unknown';
      if (!cityMap[city]) {
        cityMap[city] = { revenue: 0, orders: 0, customers: new Set() };
      }
      cityMap[city].revenue += Number(p.total || 0);
      cityMap[city].orders += 1;
      if (p.clienteId) {
        cityMap[city].customers.add(p.clienteId);
      }
    }

    const totalRevenue = Object.values(cityMap).reduce((sum, c) => sum + c.revenue, 0);

    const data = Object.entries(cityMap)
      .map(([city, data]) => ({
        city,
        revenue: Math.round(data.revenue * 100) / 100,
        orders: data.orders,
        customers: data.customers.size,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      businessId,
      period,
      data,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      asOf: new Date(),
    };
  }

  private getDateRangeFromPeriod(period: string): { gte: Date; gt: Date } {
    const today = new Date();
    const gte = new Date(today);

    if (period === '7d') {
      gte.setDate(gte.getDate() - 7);
    } else if (period === '30d') {
      gte.setDate(gte.getDate() - 30);
    } else if (period === '90d') {
      gte.setDate(gte.getDate() - 90);
    } else {
      throw new BadRequestException('Invalid period. Must be 7d, 30d, or 90d');
    }

    const gt = new Date(today);

    return { gte, gt };
  }
}
