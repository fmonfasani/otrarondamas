import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CanonicalPermission } from '../authorization/canonical-permission.decorator';
import { LIMITS, RateLimit } from '../common/rate-limit/rate-limit';
import { AssignDto, LabelDto, MuteDto } from './dto/inbox.dto';
import { MessagingInboxService } from './inbox.service';
import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';
import { AutoRepliesDto } from './dto/auto-replies.dto';

const MUTE_HOURS: Record<MuteDto['por'], number | null> = { '8h': 8, '1w': 24 * 7, siempre: null };

/**
 * E6a — the team's inbox like WhatsApp Business: pin, archive and mute (each person's own),
 * assign a customer chat (Owner/Admin) and customer labels (Owner/Admin make them, anyone on
 * the team puts them on a customer). Never for customers.
 */
@Controller('messaging')
export class MessagingInboxController {
  constructor(
    private readonly inbox: MessagingInboxService,
    private readonly gateway: MessagingGateway,
    private readonly messaging: MessagingService,
  ) {}

  /** E6b — the greeting, the away message and the opening hours (Ajustes). */
  @CanonicalPermission('MESSAGING_USE')
  @Get('automaticos')
  autoReplies(@CurrentUser() user: AuthenticatedUser) {
    return this.messaging.getAutoReplies(user);
  }

  /** E6b — Owner/Admin save them (also checked in the service). */
  @CanonicalPermission('MESSAGING_MANAGE')
  @RateLimit(LIMITS.react)
  @Put('automaticos')
  saveAutoReplies(@CurrentUser() user: AuthenticatedUser, @Body() dto: AutoRepliesDto) {
    return this.messaging.setAutoReplies(user, {
      bienvenida: dto.bienvenida,
      ausencia: dto.ausencia,
      horario: dto.horario as never,
    });
  }

  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.react)
  @Put('conversations/:id/fijado')
  pin(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.inbox.setPinned(user, id, true);
  }

  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.react)
  @Delete('conversations/:id/fijado')
  unpin(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.inbox.setPinned(user, id, false);
  }

  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.react)
  @Put('conversations/:id/archivado')
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.inbox.setArchived(user, id, true);
  }

  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.react)
  @Delete('conversations/:id/archivado')
  unarchive(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.inbox.setArchived(user, id, false);
  }

  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.react)
  @Put('conversations/:id/silencio')
  mute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MuteDto,
  ) {
    return this.inbox.setMuted(user, id, MUTE_HOURS[dto.por]);
  }

  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.react)
  @Delete('conversations/:id/silencio')
  unmute(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.inbox.setMuted(user, id, false);
  }

  /** Owner/Admin give a customer chat to a team member. */
  @CanonicalPermission('MESSAGING_MANAGE')
  @RateLimit(LIMITS.react)
  @Put('conversations/:id/asignado')
  async assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDto,
  ) {
    const result = await this.inbox.assign(user, id, dto.userId);
    this.tell(id);
    return result;
  }

  @CanonicalPermission('MESSAGING_MANAGE')
  @RateLimit(LIMITS.react)
  @Delete('conversations/:id/asignado')
  async unassign(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.inbox.assign(user, id, null);
    this.tell(id);
    return result;
  }

  /** Who a chat can be given to. */
  @CanonicalPermission('MESSAGING_MANAGE')
  @Get('equipo')
  team(@CurrentUser() user: AuthenticatedUser) {
    return this.inbox.assignableTeam(user);
  }

  @CanonicalPermission('MESSAGING_USE')
  @Get('etiquetas')
  labels(@CurrentUser() user: AuthenticatedUser) {
    return this.inbox.listLabels(user);
  }

  @CanonicalPermission('MESSAGING_MANAGE')
  @RateLimit(LIMITS.react)
  @Post('etiquetas')
  createLabel(@CurrentUser() user: AuthenticatedUser, @Body() dto: LabelDto) {
    return this.inbox.createLabel(user, dto.nombre, dto.color);
  }

  @CanonicalPermission('MESSAGING_MANAGE')
  @RateLimit(LIMITS.react)
  @Patch('etiquetas/:labelId')
  updateLabel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @Body() dto: LabelDto,
  ) {
    return this.inbox.updateLabel(user, labelId, dto.nombre, dto.color);
  }

  @CanonicalPermission('MESSAGING_MANAGE')
  @RateLimit(LIMITS.react)
  @Delete('etiquetas/:labelId')
  @HttpCode(204)
  async deleteLabel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('labelId', ParseUUIDPipe) labelId: string,
  ) {
    await this.inbox.deleteLabel(user, labelId);
  }

  /** Anyone on the team puts a label on a customer, or takes it off. */
  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.react)
  @Put('clientes/:customerId/etiquetas/:labelId')
  label(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
  ) {
    return this.inbox.setCustomerLabel(user, customerId, labelId, true);
  }

  @CanonicalPermission('MESSAGING_USE')
  @RateLimit(LIMITS.react)
  @Delete('clientes/:customerId/etiquetas/:labelId')
  unlabel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
  ) {
    return this.inbox.setCustomerLabel(user, customerId, labelId, false);
  }

  /** The chat's screens reload (a new person joined, or it moved to someone else). */
  private tell(conversationId: string) {
    try {
      this.gateway.publishInboxChanged(conversationId);
    } catch {
      // Best-effort: the HTTP answer is the source of truth.
    }
  }
}
