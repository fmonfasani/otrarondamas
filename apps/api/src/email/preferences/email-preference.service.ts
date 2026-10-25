import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

/**
 * P8-2: Email Preference Service
 *
 * Manages email subscription & preference settings:
 * - Subscribe/unsubscribe users
 * - Update frequency (TODAS, SEMANAL, MENSUAL, NUNCA)
 * - Category opt-in/opt-out (transactional, marketing, etc.)
 * - Check if recipient can receive (respects unsubscribe, frequency, category)
 * - Generate anonymous unsubscribe tokens for email links
 */
@Injectable()
export class EmailPreferenceService {
  private readonly logger = new Logger(EmailPreferenceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get or create preference for email
   *
   * Creates with defaults if not exists:
   * - suscrito: true
   * - frecuencia: "TODAS"
   * - categoriasOptIn: {transaccional: true, marketing: true}
   */
  async getOrCreate(
    empresaId: string,
    email: string,
    usuarioId?: string,
    clienteId?: string,
  ): Promise<any> {
    const existing = await this.prisma.emailPreference.findUnique({
      where: {
        empresaId_email: {
          empresaId,
          email,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Generate unsubscribe token
    const unsubscribeToken = randomBytes(64).toString('hex');

    return await this.prisma.emailPreference.create({
      data: {
        empresaId,
        email,
        usuarioId,
        clienteId,
        unsubscribeToken,
        suscrito: true,
        frecuencia: 'TODAS',
        categoriasOptIn: {
          transaccional: true,
          marketing: true,
          alertas: true,
        },
      },
    });
  }

  /**
   * Subscribe user to emails
   */
  async subscribe(empresaId: string, email: string): Promise<any> {
    const pref = await this.getOrCreate(empresaId, email);

    return await this.prisma.emailPreference.update({
      where: { id: pref.id },
      data: {
        suscrito: true,
        desuscritaEn: null,
        motivoDesuscripcion: null,
      },
    });
  }

  /**
   * Unsubscribe using anonymous token (from email link)
   *
   * @Public() endpoint - no auth required.
   * Validates token and marks user as unsubscribed.
   */
  async unsubscribeByToken(token: string, reason?: string): Promise<any> {
    const pref = await this.prisma.emailPreference.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!pref) {
      throw new NotFoundException('Unsubscribe token not found or expired');
    }

    return await this.prisma.emailPreference.update({
      where: { id: pref.id },
      data: {
        suscrito: false,
        desuscritaEn: new Date(),
        motivoDesuscripcion: reason || 'User clicked unsubscribe link',
      },
    });
  }

  /**
   * Update email frequency (TODAS, SEMANAL, MENSUAL, NUNCA)
   *
   * NUNCA is equivalent to unsubscribed but allows re-subscription.
   */
  async updateFrequency(
    empresaId: string,
    email: string,
    frequency: 'TODAS' | 'SEMANAL' | 'MENSUAL' | 'NUNCA',
  ): Promise<any> {
    if (!['TODAS', 'SEMANAL', 'MENSUAL', 'NUNCA'].includes(frequency)) {
      throw new BadRequestException(`Invalid frequency: ${frequency}`);
    }

    const pref = await this.getOrCreate(empresaId, email);

    return await this.prisma.emailPreference.update({
      where: { id: pref.id },
      data: { frecuencia: frequency },
    });
  }

  /**
   * Update category opt-in/out
   *
   * Example: {transaccional: true, marketing: false, alertas: true}
   */
  async updateCategories(
    empresaId: string,
    email: string,
    categories: Record<string, boolean>,
  ): Promise<any> {
    const pref = await this.getOrCreate(empresaId, email);

    // Merge with existing categories
    const merged = {
      ...pref.categoriasOptIn,
      ...categories,
    };

    return await this.prisma.emailPreference.update({
      where: { id: pref.id },
      data: { categoriasOptIn: merged },
    });
  }

  /**
   * Check if recipient can receive email of given type
   *
   * Returns false if:
   * - Not subscribed (suscrito: false)
   * - Frequency set to NUNCA
   * - Category opt-out for this email type
   * - Bounced/complained email (future check)
   */
  async canReceive(
    empresaId: string,
    email: string,
    tipoEmail: 'TRANSACCIONAL' | 'MARKETING' | 'ALERTAS',
  ): Promise<boolean> {
    try {
      const pref = await this.getOrCreate(empresaId, email);

      // Check subscription status
      if (!pref.suscrito) {
        this.logger.debug(`${email} unsubscribed, cannot receive`);
        return false;
      }

      // Check frequency setting
      if (pref.frecuencia === 'NUNCA') {
        this.logger.debug(`${email} frequency set to NUNCA, cannot receive`);
        return false;
      }

      // Check category opt-in
      const categoryKey = tipoEmail.toLowerCase();
      if (pref.categoriasOptIn && pref.categoriasOptIn[categoryKey] === false) {
        this.logger.debug(`${email} opted out of ${categoryKey}, cannot receive`);
        return false;
      }

      // TRANSACCIONAL emails always go through (legal/compliance requirement)
      // unless explicitly unsubscribed
      if (tipoEmail === 'TRANSACCIONAL') {
        return true;
      }

      return true;
    } catch (err) {
      this.logger.error('canReceive check failed', err);
      return true; // Fail open: send the email
    }
  }

  /**
   * Get user preference (requires auth)
   */
  async getByEmail(empresaId: string, email: string): Promise<any> {
    return await this.getOrCreate(empresaId, email);
  }

  /**
   * Delete preference (hard delete)
   */
  async delete(empresaId: string, email: string): Promise<void> {
    const pref = await this.getOrCreate(empresaId, email);

    await this.prisma.emailPreference.delete({
      where: { id: pref.id },
    });
  }

  /**
   * List all preferences for a business
   */
  async listForBusiness(empresaId: string): Promise<any[]> {
    return await this.prisma.emailPreference.findMany({
      where: { empresaId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
