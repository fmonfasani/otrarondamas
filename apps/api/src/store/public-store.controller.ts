import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { BusinessContextService } from '../business-context/business-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';
import { AllowCustomer } from '../auth/decorators/allow-customer.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  CanonicalPermission,
  CUSTOMER_POLICY,
} from '../authorization/canonical-permission.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { CustomerOrderDto } from './dto/customer-order.dto';
import { BrowseCatalogDto } from './dto/browse-catalog.dto';
import { StoreService } from './store.service';
import { StoreCatalogService } from './store-catalog.service';
import { ProductPhotosService, sendPhoto } from '../catalog/product-photos.service';
import { MercadoPagoAccountService } from '../payments/mercadopago/mercadopago-account.service';
import { MercadoPagoCheckoutService } from '../payments/mercadopago/mercadopago-checkout.service';
import { DevolucionesService } from '../devoluciones/devoluciones.service';
import { contactOf, storeSettingsOf } from '../negocio/negocio.service';
import { CustomerReturnDto } from '../devoluciones/dto';

/**
 * STORE-V1-02 — slug-scoped public Store surface.
 * The Business is resolved through the canonical BusinessContext. The
 * controller never accepts a raw tenant id and never creates StoreTenantContext.
 * Legacy /tienda/* routes remain available during TRANSITION.
 *
 * STORE-V1-03 — the signed-in customer of this store: their orders. The Customer comes
 * from the session (resolveForCustomer), never from the body, and must belong to the
 * Business of the slug; a customer of another Business is refused.
 */
@ApiTags('tienda')
@Controller(':businessSlug/tienda')
export class PublicStoreController {
  constructor(
    private readonly businessContext: BusinessContextService,
    private readonly storeService: StoreService,
    private readonly storeCatalog: StoreCatalogService,
    private readonly photos: ProductPhotosService,
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoAccountService,
    private readonly checkout: MercadoPagoCheckoutService,
    private readonly returns: DevolucionesService,
  ) {}

  private async companyId(businessSlug: string): Promise<string> {
    return (await this.businessContext.resolveForAnonymous(businessSlug)).businessId;
  }

  /** OR-B4-046 rule 3: whether the Business hides published products without stock. */
  private async storeSettings(businessId: string) {
    const business = await this.prisma.empresa.findUnique({
      where: { id: businessId },
      select: { configuracion: true },
    });
    return { hideOutOfStock: storeSettingsOf(business?.configuracion ?? null).ocultarSinStock };
  }

  /** The signed-in customer, checked against the store's Business. */
  private async customerOf(user: AuthenticatedUser, businessSlug: string) {
    const businessId = await this.companyId(businessSlug);
    const context = await this.businessContext.resolveForCustomer(user);
    if (context.businessId !== businessId) {
      throw new ForbiddenException('Tu cuenta es de otra tienda');
    }
    return { businessId, customerId: context.customerId as string };
  }

  /** GET /:slug/tienda — the store's public name and contact details (Ajustes), for its header. */
  @Public()
  @Get()
  async info(@Param('businessSlug') businessSlug: string) {
    const businessId = await this.companyId(businessSlug);
    const business = await this.prisma.empresa.findUnique({
      where: { id: businessId },
      select: { nombre: true, slug: true, configuracion: true },
    });
    if (!business) throw new NotFoundException('Business no encontrado');
    // OR-B4-032: whether customers can pay confirmed orders online in this store.
    const mp = await this.mercadoPago.status(businessId);
    const pagosOnline =
      mp.available && mp.connected && Boolean(process.env.MERCADOPAGO_NOTIFICATION_URL);
    return {
      nombre: business.nombre,
      slug: business.slug,
      contacto: contactOf(business.configuracion),
      pagosOnline,
    };
  }

  @Public()
  @Get('productos')
  async catalog(
    @Param('businessSlug') businessSlug: string,
    @Query('search') search?: string,
    @Query('familiaId') familyId?: string,
    @Query('subfamiliaId') subfamilyId?: string,
  ) {
    const businessId = await this.companyId(businessSlug);
    return this.storeService.catalog(
      search,
      familyId,
      subfamilyId,
      businessId,
      await this.storeSettings(businessId),
    );
  }

  /**
   * GET /:slug/tienda/catalogo — OR-B4-047: the practical store. Search without accents,
   * categories with counts, brand, price and stock filters, order (featured, best sellers, price,
   * newest) and pages of 24, with the facets the customer can still pick from.
   */
  @Public()
  @Get('catalogo')
  async browse(@Param('businessSlug') businessSlug: string, @Query() query: BrowseCatalogDto) {
    const businessId = await this.companyId(businessSlug);
    return this.storeCatalog.browse(
      businessId,
      {
        q: query.q,
        cat: query.cat,
        sub: query.sub,
        marcas: query.marca,
        min: query.min,
        max: query.max,
        conStock: Boolean(query.stock),
        enOferta: Boolean(query.oferta),
        orden: query.orden,
        pagina: query.pagina,
      },
      await this.storeSettings(businessId),
    );
  }

  /** GET /:slug/tienda/sugerencias?q= — a few products and categories while the customer types. */
  @Public()
  @Get('sugerencias')
  async suggestions(@Param('businessSlug') businessSlug: string, @Query('q') q?: string) {
    const businessId = await this.companyId(businessSlug);
    return this.storeCatalog.suggestions(
      businessId,
      String(q ?? '').slice(0, 100),
      await this.storeSettings(businessId),
    );
  }

  /**
   * GET /:slug/tienda/productos/:productoId/fotos/:fotoId — a photo of a published product
   * (OR-B4-046 rule 12). A photo never changes, so browsers and proxies may keep it.
   */
  @Public()
  @Get('productos/:productoId/fotos/:fotoId')
  async photo(
    @Param('businessSlug') businessSlug: string,
    @Param('productoId') productId: string,
    @Param('fotoId') photoId: string,
    @Res() res: Response,
  ) {
    const businessId = await this.companyId(businessSlug);
    const file = await this.photos.file(businessId, productId, photoId, { publishedOnly: true });
    sendPhoto(res, file, 'public');
  }

  /** GET /:slug/tienda/productos/:productoId — the product page of a published product. */
  @Public()
  @Get('productos/:productoId')
  async product(
    @Param('businessSlug') businessSlug: string,
    @Param('productoId') productId: string,
  ) {
    return this.storeCatalog.product(await this.companyId(businessSlug), productId);
  }

  @Public()
  @Get('jerarquia')
  async hierarchy(@Param('businessSlug') businessSlug: string) {
    return this.storeService.hierarchy(await this.companyId(businessSlug));
  }

  @Public()
  @Post('pedidos')
  async createOrder(@Param('businessSlug') businessSlug: string, @Body() dto: CreateOrderDto) {
    return this.storeService.createOrder(dto, await this.companyId(businessSlug));
  }

  @Public()
  @Get('pedidos/:id')
  async tracking(@Param('businessSlug') businessSlug: string, @Param('id') id: string) {
    return this.storeService.tracking(id, await this.companyId(businessSlug));
  }

  /** POST /:slug/tienda/mis-pedidos — order as the signed-in customer (name/email from the account). */
  @AllowCustomer()
  @CanonicalPermission(CUSTOMER_POLICY)
  @Post('mis-pedidos')
  async placeCustomerOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
    @Body() dto: CustomerOrderDto,
  ) {
    const { businessId, customerId } = await this.customerOf(user, businessSlug);
    return this.storeService.createCustomerOrder(customerId, dto.items, businessId);
  }

  /** GET /:slug/tienda/mis-pedidos — the signed-in customer's orders in this store. */
  @AllowCustomer()
  @CanonicalPermission(CUSTOMER_POLICY)
  @Get('mis-pedidos')
  async customerOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
  ) {
    const { businessId, customerId } = await this.customerOf(user, businessSlug);
    return this.storeService.customerOrders(customerId, businessId);
  }

  /** POST /:slug/tienda/mis-pedidos/:id/pagar — Mercado Pago checkout for a confirmed order. */
  @AllowCustomer()
  @CanonicalPermission(CUSTOMER_POLICY)
  @Post('mis-pedidos/:id/pagar')
  @HttpCode(200)
  async payOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
    @Param('id') orderId: string,
  ) {
    const { businessId, customerId } = await this.customerOf(user, businessSlug);
    return this.checkout.checkoutUrl({ businessId, customerId, orderId, storeSlug: businessSlug });
  }

  /** GET /:slug/tienda/mis-compras — OR-B4-035 rule 1: the customer's purchases and their returns. */
  @AllowCustomer()
  @CanonicalPermission(CUSTOMER_POLICY)
  @Get('mis-compras')
  async customerPurchases(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
  ) {
    const { businessId, customerId } = await this.customerOf(user, businessSlug);
    return this.returns.customerPurchases(businessId, customerId);
  }

  /** POST /:slug/tienda/mis-compras/:ventaId/devolucion — the customer asks for a return. */
  @AllowCustomer()
  @CanonicalPermission(CUSTOMER_POLICY)
  @Post('mis-compras/:ventaId/devolucion')
  async requestReturn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
    @Param('ventaId') ventaId: string,
    @Body() dto: CustomerReturnDto,
  ) {
    const { businessId, customerId } = await this.customerOf(user, businessSlug);
    return this.returns.createForCustomer(businessId, customerId, { ...dto, ventaId });
  }
}
