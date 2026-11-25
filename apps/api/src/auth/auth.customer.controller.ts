import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { AuthCustomerService } from './auth.customer.service';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { BusinessContextService } from '../business-context/business-context.service';
import { CustomerRegistrationDto } from './dto/customer-registration.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { AllowCustomer } from './decorators/allow-customer.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './auth.types';
import { StoreGoogleStartGuard } from './guards/store-google-start.guard';
import {
  CanonicalPermission,
  CUSTOMER_POLICY,
} from '../authorization/canonical-permission.decorator';

/**
 * RF-17: authentication of the customers of each Business's online store. Registration, login and
 * «Continuar con Google» are per Business, resolved by its public slug
 * (`/auth/cliente/negocio/:slug/...`); the single-store routes that read TIENDA_EMPRESA_ID are
 * gone (Owner, 2026-11-25). `GET /auth/cliente/me` returns the signed-in customer's profile.
 */
@ApiTags('auth-cliente')
@Controller('auth/cliente')
export class AuthCustomerController {
  constructor(
    private readonly authCustomerService: AuthCustomerService,
    private readonly prisma: CompanyScopedPrismaService,
    private readonly businessContext: BusinessContextService,
  ) {}

  /**
   * STORE-V1-03 — self-registration in the store of one Business, resolved by its public
   * slug (never by a client-supplied id).
   */
  @Public()
  @Post('negocio/:businessSlug/registro')
  @HttpCode(HttpStatus.CREATED)
  async registerInStore(
    @Param('businessSlug') businessSlug: string,
    @Body() dto: CustomerRegistrationDto,
  ) {
    const { businessId } = await this.businessContext.resolveForAnonymous(businessSlug);
    return this.registerIn(businessId, dto);
  }

  /** STORE-V1-03 — login in the store of one Business (accounts are per Business). */
  @Public()
  @Post('negocio/:businessSlug/login')
  @HttpCode(HttpStatus.OK)
  async loginInStore(@Param('businessSlug') businessSlug: string, @Body() dto: LoginDto) {
    const { businessId } = await this.businessContext.resolveForAnonymous(businessSlug);
    return this.authCustomerService.login(businessId, dto);
  }

  /**
   * ADR-IDN-007 — «Continuar con Google» in the store of one Business. The guard sends the
   * browser to Google; it comes back through the shared /auth/google/callback (AuthController),
   * which recognises the signed store `state`.
   */
  @Public()
  @UseGuards(StoreGoogleStartGuard)
  @Get('negocio/:businessSlug/google')
  @ApiExcludeEndpoint()
  googleInStore() {}

  private async registerIn(companyId: string, dto: CustomerRegistrationDto) {
    try {
      return await this.authCustomerService.register(companyId, dto);
    } catch (error: unknown) {
      // Re-throw BadRequestException (email already exists, etc.)
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Prisma constraint violations or FK failures → 400 BadRequest
      if (error instanceof Error) {
        const message = error.message || '';
        if (
          message.includes('Unique constraint failed') ||
          message.includes('Foreign key constraint failed') ||
          message.includes('empresaId') ||
          message.includes('Empresa')
        ) {
          throw new BadRequestException(
            'No se puede completar el registro. Verifique que el email sea válido y que la configuración de la tienda sea correcta.',
          );
        }
      }
      // Unexpected error → 500
      throw new InternalServerErrorException(
        'Error inesperado durante el registro. Por favor, intente más tarde.',
      );
    }
  }

  /**
   * Fresh profile of the authenticated Cliente — parallel to GET /auth/me
   * for Usuario. Only accessible with a token of type 'cliente'.
   *
   * FS-1a: BusinessContext is the sole tenant authority. The legacy
   * empresaId JWT claim is intentionally ignored; the customer and its
   * Business are resolved from persisted Customer data through
   * BusinessContextService, then the profile query is company-scoped.
   */
  @AllowCustomer()
  @CanonicalPermission(CUSTOMER_POLICY)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    if (user.type !== 'cliente') {
      throw new NotFoundException('Endpoint solo para clientes');
    }
    const context = await this.businessContext.resolveForCustomer(user);
    if (!context.customerId) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const db = this.prisma.forCompany(context.businessId);
    const customer = await db.cliente.findUnique({
      where: { id: context.customerId },
      include: { Empresa: true },
    });
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return {
      id: customer.id,
      nombre: customer.nombre,
      email: customer.email,
      empresaId: customer.empresaId,
      empresaNombre: customer.Empresa.nombre,
      esMayorista: customer.esMayorista,
      estadoLegajo: customer.estadoLegajo,
      metodoLogin: customer.googleId ? 'google' : 'password',
      createdAt: customer.createdAt.toISOString(),
    };
  }
}
