import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
import { CustomerOrderDto, DeliveryChoiceDto, SaveAddressDto } from './dto/customer-order.dto';
import { BrowseCatalogDto } from './dto/browse-catalog.dto';
import { StoreService, type OrderDelivery } from './store.service';
import { AddressesService } from './addresses.service';
import { StoreCatalogService } from './store-catalog.service';
import { ProductPhotosService, sendPhoto } from '../catalog/product-photos.service';
import { MercadoPagoAccountService } from '../payments/mercadopago/mercadopago-account.service';
import { MercadoPagoCheckoutService } from '../payments/mercadopago/mercadopago-checkout.service';
import { DevolucionesService } from '../devoluciones/devoluciones.service';
import { contactOf, storeSettingsOf } from '../negocio/negocio.service';
import { deliveryOf, deliveryQuote } from '../negocio/envio';
import { insideArgentina, locationOf, publicLocation } from '../negocio/ubicacion';
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
    private readonly addresses: AddressesService,
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
      // OR-B4-054, fase 2b: how customers can receive orders (delivery needs the store's pin).
      entrega: {
        envio:
          deliveryOf(business.configuracion).envio && locationOf(business.configuracion) !== null,
        retiro: deliveryOf(business.configuracion).retiro,
      },
      // Where the map opens: the same point Wapsell's map shows (a zone stays rounded).
      centro: publicLocation(locationOf(business.configuracion)),
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

  /**
   * GET /:slug/tienda/envio?lat=&lng= — OR-B4-054: what a delivery to that point costs (or why
   * there is none), and whether the store offers pickup. Only the fee and the kilometres leave:
   * never the store's point (a store that shows only its zone is measured from that zone).
   */
  @Public()
  @Get('envio')
  async deliveryQuote(
    @Param('businessSlug') businessSlug: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const point = { lat: Number(lat), lng: Number(lng) };
    if (!insideArgentina(point.lat, point.lng)) {
      throw new BadRequestException('Ese punto no está en Argentina.');
    }
    const business = await this.prisma.empresa.findUnique({
      where: { id: await this.companyId(businessSlug) },
      select: { configuracion: true },
    });
    const configuracion = business?.configuracion ?? null;
    const settings = deliveryOf(configuracion);
    return {
      retiro: settings.retiro,
      envio: deliveryQuote(locationOf(configuracion), settings, point),
    };
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

  /**
   * OR-B4-054, fase 2b — the customer's choice checked against the store: pickup must be offered;
   * a delivery must fall inside the radius, and its fee is computed here (never taken from the
   * request).
   */
  private async deliveryFor(businessId: string, choice: DeliveryChoiceDto): Promise<OrderDelivery> {
    const business = await this.prisma.empresa.findUnique({
      where: { id: businessId },
      select: { configuracion: true },
    });
    const configuracion = business?.configuracion ?? null;
    const settings = deliveryOf(configuracion);
    if (choice.tipo === 'RETIRO') {
      if (!settings.retiro) {
        throw new BadRequestException('Este negocio no ofrece retiro en el local: elegí envío.');
      }
      return {
        tipoEntrega: 'RETIRO',
        direccionEntrega: null,
        indicacionesEntrega: null,
        latEntrega: null,
        lngEntrega: null,
        kmEntrega: null,
        costoEnvio: 0,
      };
    }
    const point = { lat: Number(choice.lat), lng: Number(choice.lng) };
    if (!insideArgentina(point.lat, point.lng)) {
      throw new BadRequestException('Ese punto no está en Argentina. Mové el pin a tu dirección.');
    }
    const quote = deliveryQuote(locationOf(configuracion), settings, point);
    if ('motivo' in quote) throw new BadRequestException(quote.motivo);
    const indicaciones = choice.indicaciones?.trim();
    return {
      tipoEntrega: 'ENVIO',
      direccionEntrega: (choice.direccion ?? '').trim(),
      indicacionesEntrega: indicaciones || null,
      latEntrega: point.lat,
      lngEntrega: point.lng,
      kmEntrega: quote.km,
      costoEnvio: quote.costo,
    };
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
    const delivery = dto.entrega ? await this.deliveryFor(businessId, dto.entrega) : undefined;
    return this.storeService.createCustomerOrder(customerId, dto.items, businessId, delivery);
  }

  /**
   * GET /:slug/tienda/mis-direcciones — OR-B4-054, fase 2b: the addresses saved in the customer's
   * Wapsell account. An account of this store alone has none, and cannot save them.
   */
  @AllowCustomer()
  @CanonicalPermission(CUSTOMER_POLICY)
  @Get('mis-direcciones')
  async savedAddresses(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
  ) {
    const buyerId = await this.buyerOf(user, businessSlug);
    return {
      direcciones: buyerId ? await this.addresses.list(buyerId) : [],
      puedeGuardar: buyerId !== null,
    };
  }

  /** POST /:slug/tienda/mis-direcciones — save an address in the customer's Wapsell account. */
  @AllowCustomer()
  @CanonicalPermission(CUSTOMER_POLICY)
  @Post('mis-direcciones')
  async saveAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
    @Body() dto: SaveAddressDto,
  ) {
    return this.addresses.create(await this.ownBuyer(user, businessSlug), dto);
  }

  /** PUT /:slug/tienda/mis-direcciones/:id — change one of the customer's saved addresses. */
  @AllowCustomer()
  @CanonicalPermission(CUSTOMER_POLICY)
  @Put('mis-direcciones/:id')
  async updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SaveAddressDto,
  ) {
    return this.addresses.update(await this.ownBuyer(user, businessSlug), id, dto);
  }

  /** DELETE /:slug/tienda/mis-direcciones/:id — forget one of the customer's saved addresses. */
  @AllowCustomer()
  @CanonicalPermission(CUSTOMER_POLICY)
  @Delete('mis-direcciones/:id')
  async removeAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('businessSlug') businessSlug: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.addresses.remove(await this.ownBuyer(user, businessSlug), id);
  }

  private async buyerOf(user: AuthenticatedUser, businessSlug: string) {
    const { businessId, customerId } = await this.customerOf(user, businessSlug);
    return this.addresses.buyerOf(businessId, customerId);
  }

  private async ownBuyer(user: AuthenticatedUser, businessSlug: string) {
    const buyerId = await this.buyerOf(user, businessSlug);
    if (!buyerId) {
      throw new ForbiddenException(
        'Para guardar direcciones, entrá con tu cuenta de Wapsell. Igual podés escribirla para este pedido.',
      );
    }
    return buyerId;
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
