import { Injectable, NotImplementedException } from '@nestjs/common';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import {
  CreateDevolucionDto,
  AuthorizeDevolucionDto,
  ReceiveDevolucionDto,
  ProcessRefundDto,
  DevolucionDto,
  RefundDto,
} from './dto';
import type { AuthenticatedUser } from '../auth/auth.types';

/* eslint-disable indent, @typescript-eslint/no-unused-vars -- known false positive of the base `indent` rule
   with decorators on class properties; stub methods declared but not yet implemented (P3-2) */

@Injectable()
export class DevolucionesService {
  constructor(private readonly prismaFactory: CompanyScopedPrismaService) {}

  async createDevolucione(
    businessId: string,
    userId: string,
    dto: CreateDevolucionDto,
  ): Promise<DevolucionDto> {
    throw new NotImplementedException('P3-2');
  }

  async listDevoluciones(
    businessId: string,
    user: AuthenticatedUser,
    query?: { estado?: string; limit?: number; offset?: number },
  ): Promise<{ items: DevolucionDto[]; total: number }> {
    throw new NotImplementedException('P3-2');
  }

  async getDevolucione(
    businessId: string,
    user: AuthenticatedUser,
    id: string,
  ): Promise<DevolucionDto> {
    throw new NotImplementedException('P3-2');
  }

  async authorizeDevolucione(
    businessId: string,
    id: string,
    userId: string,
    dto: AuthorizeDevolucionDto,
  ): Promise<DevolucionDto> {
    throw new NotImplementedException('P3-2');
  }

  async receiveDevolucione(
    businessId: string,
    id: string,
    userId: string,
    dto: ReceiveDevolucionDto,
  ): Promise<DevolucionDto> {
    throw new NotImplementedException('P3-2');
  }

  async processRefund(
    businessId: string,
    id: string,
    userId: string,
    dto: ProcessRefundDto,
  ): Promise<{ devoluccion: DevolucionDto; refund: RefundDto }> {
    throw new NotImplementedException('P3-2');
  }

  // Validation helper methods

  async validateVentaExists(ventaId: string, empresaId: string): Promise<void> {
    throw new NotImplementedException('P3-2');
  }

  async validateVentaIsRealizada(ventaId: string): Promise<void> {
    throw new NotImplementedException('P3-2');
  }

  async validateWithin30Days(ventaId: string): Promise<void> {
    throw new NotImplementedException('P3-2');
  }

  async validateVentaItemBelongsToVenta(ventaItemId: string, ventaId: string): Promise<void> {
    throw new NotImplementedException('P3-2');
  }

  async validateQuantityAvailable(ventaItemId: string, requestedQty: number): Promise<void> {
    throw new NotImplementedException('P3-2');
  }

  validateStateTransition(currentState: string, targetState: string): void {
    throw new NotImplementedException('P3-2');
  }

  async validateTenantAccess(devolucionId: string, empresaId: string): Promise<void> {
    throw new NotImplementedException('P3-2');
  }

  validateCustomerCanSeeReturn(
    userId: string,
    devoluccion: Record<string, unknown>,
    userRoles: string[],
  ): boolean {
    throw new NotImplementedException('P3-2');
  }
}
