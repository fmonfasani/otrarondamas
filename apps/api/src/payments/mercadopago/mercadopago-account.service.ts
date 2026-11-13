import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hasCanonicalPermission } from '../../authorization/canonical-permissions';
import {
  decryptSecret,
  encryptSecret,
  signState,
  tokenKeyFrom,
  verifyState,
} from './mercadopago-crypto';

/** What is kept in Empresa.configuracion.mercadoPago (tokens encrypted). */
export type StoredConnection = {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  publicKey: string | null;
  liveMode: boolean;
  expiresAt: string;
  connectedAt: string;
  connectedBy: string;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  public_key?: string;
  user_id: number | string;
  live_mode?: boolean;
  expires_in?: number;
};

const STATE_TTL_MS = 10 * 60 * 1000;
const REFRESH_MARGIN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * OR-B4-032 — each Business connects its own Mercado Pago account through Mercado Pago's
 * OAuth; the money of its store goes there. Wapsell never sees the Owner's MP password and
 * keeps only the tokens, encrypted. Connecting needs PAYMENTS_CONFIGURE (Owner, OR-B4-033),
 * checked when the connection starts and again when Mercado Pago calls back.
 *
 * Platform configuration (env): MERCADOPAGO_CLIENT_ID / MERCADOPAGO_CLIENT_SECRET (the
 * Wapsell application in Mercado Pago Developers), MERCADOPAGO_OAUTH_REDIRECT_URI and
 * MERCADOPAGO_TOKEN_KEY. MERCADOPAGO_API_URL / MERCADOPAGO_AUTH_URL exist for tests.
 */
@Injectable()
export class MercadoPagoAccountService {
  private readonly logger = new Logger(MercadoPagoAccountService.name);

  constructor(private readonly prisma: PrismaService) {}

  private config() {
    return {
      clientId: process.env.MERCADOPAGO_CLIENT_ID ?? '',
      clientSecret: process.env.MERCADOPAGO_CLIENT_SECRET ?? '',
      redirectUri: process.env.MERCADOPAGO_OAUTH_REDIRECT_URI ?? '',
      key: tokenKeyFrom(process.env.MERCADOPAGO_TOKEN_KEY),
      apiUrl: (process.env.MERCADOPAGO_API_URL || 'https://api.mercadopago.com').replace(
        /\/+$/,
        '',
      ),
      authUrl: (process.env.MERCADOPAGO_AUTH_URL || 'https://auth.mercadopago.com').replace(
        /\/+$/,
        '',
      ),
    };
  }

  isConfigured(): boolean {
    const c = this.config();
    return Boolean(c.clientId && c.clientSecret && c.redirectUri && c.key);
  }

  private requireConfig() {
    const c = this.config();
    if (!c.clientId || !c.clientSecret || !c.redirectUri || !c.key) {
      throw new ServiceUnavailableException(
        'Los cobros con Mercado Pago todavía no están habilitados en Wapsell',
      );
    }
    return { ...c, key: c.key };
  }

  /** Connection status for the panel. Never returns tokens. */
  async status(businessId: string) {
    const stored = await this.stored(businessId);
    return {
      available: this.isConfigured(),
      connected: Boolean(stored),
      mercadoPagoUserId: stored?.userId ?? null,
      liveMode: stored?.liveMode ?? null,
      connectedAt: stored?.connectedAt ?? null,
    };
  }

  /** Where to send the Owner to authorize Wapsell in their Mercado Pago account. */
  authorizationUrl(businessId: string, userId: string): string {
    const c = this.requireConfig();
    const state = signState({ businessId, userId, exp: Date.now() + STATE_TTL_MS }, c.key);
    const url = new URL(`${c.authUrl}/authorization`);
    url.searchParams.set('client_id', c.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('platform_id', 'mp');
    url.searchParams.set('state', state);
    url.searchParams.set('redirect_uri', c.redirectUri);
    return url.toString();
  }

  /**
   * Mercado Pago's redirect after the Owner authorized: checks the signed state, that the
   * person who started it may still configure payments in that Business, exchanges the
   * code and stores the connection. Returns the Business id.
   */
  async completeAuthorization(code: string | undefined, rawState: string | undefined) {
    const c = this.requireConfig();
    const state = rawState ? verifyState(rawState, c.key) : null;
    if (!state || !code)
      throw new BadRequestException('La autorización de Mercado Pago no es válida o venció');

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: state.userId,
        businessId: state.businessId,
        status: MembershipStatus.ACTIVE,
      },
      select: { role: true },
    });
    if (!membership || !hasCanonicalPermission(membership.role, 'PAYMENTS_CONFIGURE')) {
      throw new ForbiddenException('Solo el Owner del negocio puede conectar Mercado Pago');
    }

    const token = await this.tokenRequest({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: c.redirectUri,
    });
    const mpUserId = String(token.user_id);
    const other = await this.prisma.empresa.findFirst({
      where: {
        id: { not: state.businessId },
        configuracion: { path: ['mercadoPago', 'userId'], equals: mpUserId },
      },
      select: { id: true },
    });
    if (other)
      throw new ConflictException('Esa cuenta de Mercado Pago ya está conectada a otro negocio');

    await this.save(state.businessId, this.toStored(token, state.userId, c.key));
    this.logger.log(
      JSON.stringify({ event: 'mercadopago.connected', businessId: state.businessId, mpUserId }),
    );
    return state.businessId;
  }

  async disconnect(businessId: string) {
    await this.save(businessId, null);
    this.logger.log(JSON.stringify({ event: 'mercadopago.disconnected', businessId }));
  }

  /** A valid access token of the Business's account (refreshed when about to expire). */
  async accessTokenFor(businessId: string): Promise<string> {
    const c = this.requireConfig();
    const stored = await this.stored(businessId);
    if (!stored)
      throw new ConflictException('El negocio todavía no conectó su cuenta de Mercado Pago');
    if (Date.parse(stored.expiresAt) - Date.now() > REFRESH_MARGIN_MS || !stored.refreshToken) {
      return decryptSecret(stored.accessToken, c.key);
    }
    const token = await this.tokenRequest({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: decryptSecret(stored.refreshToken, c.key),
    });
    await this.save(
      businessId,
      this.toStored(token, stored.connectedBy, c.key, stored.connectedAt),
    );
    return token.access_token;
  }

  /** The Business whose connected Mercado Pago account has this user id (webhooks). */
  async businessForMercadoPagoUser(mpUserId: string): Promise<string | null> {
    const business = await this.prisma.empresa.findFirst({
      where: { configuracion: { path: ['mercadoPago', 'userId'], equals: mpUserId } },
      select: { id: true },
    });
    return business?.id ?? null;
  }

  private toStored(
    token: TokenResponse,
    connectedBy: string,
    key: Buffer,
    connectedAt?: string,
  ): StoredConnection {
    return {
      userId: String(token.user_id),
      accessToken: encryptSecret(token.access_token, key),
      refreshToken: token.refresh_token ? encryptSecret(token.refresh_token, key) : null,
      publicKey: token.public_key ?? null,
      liveMode: token.live_mode ?? true,
      expiresAt: new Date(Date.now() + (token.expires_in ?? 15552000) * 1000).toISOString(),
      connectedAt: connectedAt ?? new Date().toISOString(),
      connectedBy,
    };
  }

  private async tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
    const { apiUrl } = this.config();
    let response: Response;
    try {
      response = await fetch(`${apiUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new ServiceUnavailableException('No pudimos comunicarnos con Mercado Pago');
    }
    const payload = (await response.json().catch(() => ({}))) as Partial<TokenResponse> & {
      message?: string;
    };
    if (!response.ok || !payload.access_token || payload.user_id === undefined) {
      // Only the status: Mercado Pago's error bodies can echo request data.
      this.logger.warn(
        JSON.stringify({
          event: 'mercadopago.oauth.failed',
          status: response.status,
          grant: body.grant_type,
        }),
      );
      throw new BadRequestException(
        'Mercado Pago rechazó la autorización. Probá conectar de nuevo.',
      );
    }
    return payload as TokenResponse;
  }

  private async stored(businessId: string): Promise<StoredConnection | null> {
    const business = await this.prisma.empresa.findUnique({
      where: { id: businessId },
      select: { configuracion: true },
    });
    const config = (business?.configuracion ?? {}) as Record<string, unknown>;
    const mp = config.mercadoPago as StoredConnection | undefined;
    return mp?.userId && mp.accessToken ? mp : null;
  }

  private async save(businessId: string, connection: StoredConnection | null) {
    await this.prisma.$transaction(async (tx) => {
      const business = await tx.empresa.findUnique({
        where: { id: businessId },
        select: { configuracion: true },
      });
      const config = { ...((business?.configuracion ?? {}) as Record<string, unknown>) };
      if (connection) config.mercadoPago = connection;
      else delete config.mercadoPago;
      await tx.empresa.update({
        where: { id: businessId },
        data: { configuracion: config as Prisma.InputJsonValue },
      });
    });
  }
}
