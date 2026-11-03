import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformAdminGuard } from './platform-admin.guard';

@Controller('platform-admin')
@UseGuards(PlatformAdminGuard)
export class PlatformAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('overview')
  async getOverview() {
    const [businesses, users, customers, orders, recentBusinesses] = await Promise.all([
      this.prisma.empresa.count(),
      this.prisma.usuario.count(),
      this.prisma.cliente.count(),
      this.prisma.pedido.count(),
      this.prisma.empresa.findMany({
        select: { id: true, nombre: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      metrics: { businesses, users, customers, orders },
      recentBusinesses,
    };
  }
}
