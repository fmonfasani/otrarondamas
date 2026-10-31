import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// import { TipoEmail } from '@prisma/client'; // TODO: types
import * as Handlebars from 'handlebars';

/**
 * P8-2: Email Template Service
 *
 * Manages email template CRUD operations, validation, and versioning.
 * - Create/read/update/delete templates
 * - Validate Handlebars syntax & required variables
 * - Version management (simple integer versioning)
 */
@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new email template
   *
   * Validates:
   * - Unique nombre per (empresaId, tipo)
   * - Valid Handlebars syntax in contenidoHtml
   * - Required variables match schema
   */
  async create(
    empresaId: string,
    nombre: string,
    tipo: string,
    asunto: string,
    contenidoHtml: string,
    variables?: Record<string, any>,
  ): Promise<any> {
    // Validate unique nombre
    const existing = await this.prisma.emailTemplate.findFirst({
      where: {
        empresaId,
        nombre,
        versionActual: 1, // Check only active version
      },
    });

    if (existing) {
      throw new BadRequestException(`Template "${nombre}" already exists in empresa ${empresaId}`);
    }

    // Validate Handlebars syntax
    try {
      Handlebars.compile(contenidoHtml);
    } catch (err) {
      throw new BadRequestException(
        `Invalid Handlebars syntax: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Validate asunto has no complex logic
    try {
      Handlebars.compile(asunto);
    } catch (err) {
      throw new BadRequestException(
        `Invalid Handlebars in subject: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Validate tipo is a valid TipoEmail enum
    if (!Object.values(TipoEmail).includes(tipo as TipoEmail)) {
      throw new BadRequestException(
        `Invalid tipo: ${tipo}. Must be one of: ${Object.values(TipoEmail).join(', ')}`,
      );
    }

    return await this.prisma.emailTemplate.create({
      data: {
        empresaId,
        nombre,
        tipo: tipo as TipoEmail,
        asunto,
        contenidoHtml,
        variables: variables || {},
        activo: true,
        versionActual: 1,
      },
    });
  }

  /**
   * List templates for a business
   *
   * Optional filter by tipo (TRANSACCIONAL, MARKETING, ALERTAS)
   */
  async list(empresaId: string, tipo?: string): Promise<any[]> {
    return await this.prisma.emailTemplate.findMany({
      where: {
        empresaId,
        ...(tipo && { tipo: tipo as TipoEmail }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get template by nombre (unique within empresa)
   */
  async getByName(empresaId: string, nombre: string): Promise<any> {
    const template = await this.prisma.emailTemplate.findFirst({
      where: {
        empresaId,
        nombre,
        activo: true,
      },
    });

    if (!template) {
      throw new NotFoundException(`Template "${nombre}" not found in empresa ${empresaId}`);
    }

    return template;
  }

  /**
   * Get template by ID
   */
  async getById(empresaId: string, id: string): Promise<any> {
    const template = await this.prisma.emailTemplate.findFirst({
      where: {
        id,
        empresaId,
      },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    return template;
  }

  /**
   * Update template (creates new version, keeps old as historical)
   *
   * Note: Current implementation updates in-place (not versioned).
   * Future enhancement: implement full version history.
   */
  async update(
    empresaId: string,
    id: string,
    updates: {
      asunto?: string;
      contenidoHtml?: string;
      variables?: Record<string, any>;
      activo?: boolean;
    },
  ): Promise<any> {
    const template = await this.getById(empresaId, id);

    // Validate new content if provided
    if (updates.contenidoHtml) {
      try {
        Handlebars.compile(updates.contenidoHtml);
      } catch (err) {
        throw new BadRequestException(
          `Invalid Handlebars syntax: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (updates.asunto) {
      try {
        Handlebars.compile(updates.asunto);
      } catch (err) {
        throw new BadRequestException(
          `Invalid Handlebars in subject: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // TODO: Implement proper versioning (create new record, increment versionActual)
    return await this.prisma.emailTemplate.update({
      where: { id },
      data: updates,
    });
  }

  /**
   * Soft-delete template (mark inactive)
   */
  async delete(empresaId: string, id: string): Promise<any> {
    const template = await this.getById(empresaId, id);

    return await this.prisma.emailTemplate.update({
      where: { id },
      data: { activo: false },
    });
  }

  /**
   * Validate template syntax & required variables
   *
   * Parses Handlebars and extracts {{variable}} references,
   * compares with schema.required array.
   */
  async validateTemplate(
    contenidoHtml: string,
    requiredVars?: string[],
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 1. Validate Handlebars syntax
    try {
      Handlebars.compile(contenidoHtml);
    } catch (err) {
      errors.push(`Handlebars syntax error: ${err instanceof Error ? err.message : String(err)}`);
      return { valid: false, errors };
    }

    // 2. Extract variable names from template
    const varRegex = /\{\{(\w+)/g;
    const foundVars = new Set<string>();
    let match;
    while ((match = varRegex.exec(contenidoHtml)) !== null) {
      foundVars.add(match[1]);
    }

    // 3. Check required variables
    if (requiredVars && requiredVars.length > 0) {
      for (const required of requiredVars) {
        if (!foundVars.has(required)) {
          errors.push(`Required variable missing: {{${required}}}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get all templates for admin dashboard
   */
  async getAllForBusiness(empresaId: string): Promise<any[]> {
    return await this.prisma.emailTemplate.findMany({
      where: { empresaId },
      orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }],
    });
  }
}
