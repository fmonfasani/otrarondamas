import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { MetricsService } from './metrics.service';

describe('MetricsService tenant isolation', () => {
  it('filters product metrics by the authenticated company through Venta', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prismaFactory = {
      forCompany: jest.fn().mockReturnValue({
        ventaItem: { findMany },
      }),
    } as unknown as CompanyScopedPrismaService;
    const service = new MetricsService(prismaFactory);
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-01-31T23:59:59.999Z');

    await service.getProductMetrics('empresa-a', startDate, endDate);

    expect(prismaFactory.forCompany).toHaveBeenCalledWith('empresa-a');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          Venta: {
            empresaId: 'empresa-a',
            createdAt: { gte: startDate, lte: endDate },
            estado: 'CONFIRMADA',
          },
        },
      }),
    );
  });
});
