import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { RequestUser } from '../auth/decorators/request-user.decorator';
import { ExtractBusinessContext } from '../business-context/extract-business-context.decorator';
import { EmailService } from './email.service';
import { EmailTemplateService } from './templates/email-template.service';
import { EmailPreferenceService } from './preferences/email-preference.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { UpdateEmailPreferenceDto } from './dto/update-email-preference.dto';

/**
 * P8-2: Email API Controller
 *
 * Endpoints:
 * - POST /emails/templates (create template)
 * - GET /emails/templates (list templates)
 * - GET /emails/templates/:id (get template)
 * - PUT /emails/templates/:id (update template)
 * - DELETE /emails/templates/:id (delete template)
 * - POST /emails/send-test (send test email)
 * - GET /emails/logs (list email logs)
 * - POST /emails/unsubscribe/:token (public unsubscribe)
 * - GET /emails/preferences (get user preferences)
 * - PUT /emails/preferences (update user preferences)
 *
 * TODO: Campaign management endpoints (create, schedule, execute, cancel, stats)
 */
@Controller('emails')
@UseGuards(JwtAuthGuard)
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private emailService: EmailService,
    private templateService: EmailTemplateService,
    private preferenceService: EmailPreferenceService,
  ) {}

  // ============================================================================
  // TEMPLATE MANAGEMENT
  // ============================================================================

  /**
   * POST /emails/templates
   * Create new email template (admin only)
   */
  @Post('templates')
  @HttpCode(201)
  async createTemplate(
    @Body() dto: CreateEmailTemplateDto,
    @ExtractBusinessContext() empresaId: string,
  ) {
    return await this.templateService.create(
      empresaId,
      dto.nombre,
      dto.tipo,
      dto.asunto,
      dto.contenidoHtml,
      dto.variables,
    );
  }

  /**
   * GET /emails/templates
   * List all templates for business
   */
  @Get('templates')
  async listTemplates(@ExtractBusinessContext() empresaId: string) {
    return await this.templateService.list(empresaId);
  }

  /**
   * GET /emails/templates/:id
   * Get template by ID
   */
  @Get('templates/:id')
  async getTemplate(@Param('id') id: string, @ExtractBusinessContext() empresaId: string) {
    return await this.templateService.getById(empresaId, id);
  }

  /**
   * PUT /emails/templates/:id
   * Update template
   */
  @Put('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
    @ExtractBusinessContext() empresaId: string,
  ) {
    return await this.templateService.update(empresaId, id, dto);
  }

  /**
   * DELETE /emails/templates/:id
   * Soft-delete template
   */
  @Delete('templates/:id')
  @HttpCode(204)
  async deleteTemplate(@Param('id') id: string, @ExtractBusinessContext() empresaId: string) {
    await this.templateService.delete(empresaId, id);
  }

  // ============================================================================
  // EMAIL LOGS
  // ============================================================================

  /**
   * GET /emails/logs
   * List email logs (admin only)
   *
   * TODO: Implement pagination, filtering by status/email/date
   */
  @Get('logs')
  async listLogs(@ExtractBusinessContext() empresaId: string) {
    this.logger.debug(`Listing email logs for empresa ${empresaId}`);
    // TODO: Implement EmailLog query with pagination
    return { message: 'TODO: Implement email logs listing' };
  }

  // ============================================================================
  // EMAIL PREFERENCES
  // ============================================================================

  /**
   * GET /emails/preferences
   * Get current user's email preferences
   */
  @Get('preferences')
  async getPreferences(@RequestUser() user: any, @ExtractBusinessContext() empresaId: string) {
    return await this.preferenceService.getByEmail(empresaId, user.email);
  }

  /**
   * PUT /emails/preferences
   * Update current user's email preferences
   */
  @Put('preferences')
  async updatePreferences(
    @RequestUser() user: any,
    @Body() dto: UpdateEmailPreferenceDto,
    @ExtractBusinessContext() empresaId: string,
  ) {
    const pref = await this.preferenceService.getOrCreate(empresaId, user.email);

    if (dto.suscrito !== undefined) {
      if (dto.suscrito) {
        return await this.preferenceService.subscribe(empresaId, user.email);
      } else {
        await this.preferenceService.unsubscribeByToken(pref.unsubscribeToken);
      }
    }

    if (dto.frecuencia) {
      await this.preferenceService.updateFrequency(empresaId, user.email, dto.frecuencia);
    }

    if (dto.categoriasOptIn) {
      await this.preferenceService.updateCategories(empresaId, user.email, dto.categoriasOptIn);
    }

    return await this.preferenceService.getByEmail(empresaId, user.email);
  }

  // ============================================================================
  // PUBLIC ENDPOINTS
  // ============================================================================

  /**
   * POST /emails/unsubscribe/:token
   * Unsubscribe from emails (public, no auth required)
   *
   * Validates token and marks user as unsubscribed.
   * Can include reason as query param or body.
   */
  @Post('unsubscribe/:token')
  @Public()
  @HttpCode(200)
  async unsubscribe(@Param('token') token: string, @Body() body?: { reason?: string }) {
    const result = await this.preferenceService.unsubscribeByToken(token, body?.reason);

    return {
      message: 'Successfully unsubscribed',
      email: result.email,
      timestamp: new Date(),
    };
  }

  /**
   * POST /emails/send-test
   * Send test email (for template debugging)
   *
   * Sends template to user's own email address.
   */
  @Post('send-test')
  async sendTest(
    @Body('templateId') templateId: string,
    @RequestUser() user: any,
    @ExtractBusinessContext() empresaId: string,
    @Body('testData') testData?: Record<string, any>,
  ) {
    const template = await this.templateService.getById(empresaId, templateId);

    const result = await this.emailService.sendTransactional(
      empresaId,
      template.nombre,
      user.email,
      testData || {},
    );

    return {
      message: 'Test email sent',
      logId: result?.id,
      recipient: user.email,
    };
  }
}
