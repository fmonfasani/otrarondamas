import { PrismaService } from '../../src/prisma/prisma.service';
import { CartService } from '../../src/cart/cart.service';
import { InventoryService } from '../../src/inventory/inventory.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';

describe('P6 — Cart Integration (real PostgreSQL)', () => {
  let prisma: PrismaService;
  let prismaFactory: CompanyScopedPrismaService;
  let cartService: CartService;
  let inventoryService: InventoryService;

  let suffix: number;
  let counter = 0;

  let companyA: { id: string };
  let companyB: { id: string };
  let customerA: { id: string };
  let customerB: { id: string };
  let productA: { id: string };
  let productB: { id: string };
  let loteA: { id: string };

  const mkHierarchy = async (companyId: string, tag: string) => {
    const family = await prisma.familia.create({
      data: { empresaId: companyId, nombre: `P6 Fam ${tag} ${suffix}`, prefijo: `F${tag}` },
      select: { id: true },
    });
    const subfamily = await prisma.subfamilia.create({
      data: {
        empresaId: companyId,
        familiaId: family.id,
        nombre: `P6 Sub ${tag} ${suffix}`,
        prefijo: `S${tag}`,
      },
      select: { id: true },
    });
    const type = await prisma.tipo.create({
      data: {
        empresaId: companyId,
        subfamiliaId: subfamily.id,
        nombre: `P6 Tipo ${tag} ${suffix}`,
        prefijo: `T${tag}`,
      },
      select: { id: true },
    });
    const subtype = await prisma.subtipo.create({
      data: {
        empresaId: companyId,
        tipoId: type.id,
        nombre: `P6 Subtipo ${tag} ${suffix}`,
        prefijo: `U${tag}`,
      },
      select: { id: true },
    });
    return { family, subfamily, type, subtype };
  };

  const mkProduct = async (companyId: string, hier: Awaited<ReturnType<typeof mkHierarchy>>) => {
    counter += 1;
    return prisma.producto.create({
      data: {
        empresaId: companyId,
        nombre: `P6 Prod ${counter} ${suffix}`,
        codigoInterno: `P6-${counter}-${suffix}`,
        familiaId: hier.family.id,
        subfamiliaId: hier.subfamily.id,
        tipoId: hier.type.id,
        subtipoId: hier.subtype.id,
        unidadBase: 'UNIDAD',
        costo: 5,
        precioMinorista: 100,
      },
      select: { id: true },
    });
  };

  const mkBatch = async (companyId: string, productId: string, quantity: number) => {
    counter += 1;
    return prisma.lote.create({
      data: {
        empresaId: companyId,
        productoId: productId,
        numeroLote: `P6-LOTE-${counter}-${suffix}`,
        vencimiento: new Date('2030-01-01T00:00:00.000Z'),
        cantidad: quantity,
      },
      select: { id: true },
    });
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    prismaFactory = new CompanyScopedPrismaService(prisma);
    inventoryService = new InventoryService(prismaFactory);
    cartService = new CartService(prismaFactory, prisma, inventoryService);
    suffix = Date.now();

    // Create two companies
    companyA = await prisma.empresa.create({
      data: {
        nombre: `P6 Company A ${suffix}`,
        slug: `p6-company-a-${suffix}`,
        configuracion: {},
      },
      select: { id: true },
    });

    companyB = await prisma.empresa.create({
      data: {
        nombre: `P6 Company B ${suffix}`,
        slug: `p6-company-b-${suffix}`,
        configuracion: {},
      },
      select: { id: true },
    });

    // Create customers
    customerA = await prisma.cliente.create({
      data: {
        empresaId: companyA.id,
        nombre: `P6 Customer A ${suffix}`,
        email: `p6-customer-a-${suffix}@example.test`,
        activo: true,
      },
      select: { id: true },
    });

    customerB = await prisma.cliente.create({
      data: {
        empresaId: companyB.id,
        nombre: `P6 Customer B ${suffix}`,
        email: `p6-customer-b-${suffix}@example.test`,
        activo: true,
      },
      select: { id: true },
    });

    // Create product hierarchy and products for company A
    const hierA = await mkHierarchy(companyA.id, 'A');
    productA = await mkProduct(companyA.id, hierA);
    productB = await mkProduct(companyA.id, hierA);

    // Create batches with stock for both products
    loteA = await mkBatch(companyA.id, productA.id, 10);
    await mkBatch(companyA.id, productB.id, 10);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('P6-01: getOrCreateCart — Create and retrieve cart', () => {
    it('creates a new cart for customer in company A', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);
      expect(cart).toBeDefined();
      expect(cart.customerId).toBe(customerA.id);
      expect(cart.businessId).toBe(companyA.id);
      expect(cart.items).toEqual([]);
    });

    it('returns existing cart on second call (idempotent)', async () => {
      const cart1 = await cartService.getOrCreateCart(customerA.id, companyA.id);
      const cart2 = await cartService.getOrCreateCart(customerA.id, companyA.id);
      expect(cart1.id).toBe(cart2.id);
    });

    it('throws NotFoundException for inactive customer', async () => {
      const inactiveCustomer = await prisma.cliente.create({
        data: {
          empresaId: companyA.id,
          nombre: `P6 Inactive ${suffix}`,
          email: `p6-inactive-${suffix}@example.test`,
          activo: false,
        },
        select: { id: true },
      });

      await expect(cartService.getOrCreateCart(inactiveCustomer.id, companyA.id)).rejects.toThrow(
        'Cliente no encontrado o inactivo',
      );
    });

    it('throws NotFoundException for customer from different company', async () => {
      await expect(cartService.getOrCreateCart(customerA.id, companyB.id)).rejects.toThrow(
        'Cliente no encontrado o inactivo',
      );
    });
  });

  describe('P6-02: addItem — Add product to cart with stock validation', () => {
    it('adds item to cart successfully', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);
      const item = await cartService.addItem(cart.id, productA.id, 2, companyA.id);

      expect(item).toBeDefined();
      expect(item.cartId).toBe(cart.id);
      expect(item.productoId).toBe(productA.id);
      expect(Number(item.cantidad)).toBe(2);
    });

    it('rejects quantity <= 0', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);
      await expect(cartService.addItem(cart.id, productA.id, 0, companyA.id)).rejects.toThrow(
        'Cantidad debe ser mayor a 0',
      );
    });

    it('rejects insufficient stock', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);
      await expect(cartService.addItem(cart.id, productA.id, 100, companyA.id)).rejects.toThrow(
        'Stock insuficiente',
      );
    });

    it('rejects non-existent product', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);
      await expect(cartService.addItem(cart.id, 'nonexistent-id', 1, companyA.id)).rejects.toThrow(
        'Producto no encontrado',
      );
    });

    it('updates quantity when adding same product twice (idempotent)', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);
      await cartService.addItem(cart.id, productB.id, 3, companyA.id);
      const item2 = await cartService.addItem(cart.id, productB.id, 2, companyA.id);

      expect(Number(item2.cantidad)).toBe(5); // 3 + 2
    });
  });

  describe('P6-03: updateItemQuantity — Update quantity with stock validation', () => {
    it('updates item quantity', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);
      const item = await cartService.addItem(cart.id, productA.id, 1, companyA.id);

      const updated = await cartService.updateItemQuantity(item.id, 5, companyA.id);
      expect(Number(updated.cantidad)).toBe(5);
    });

    it('rejects quantity <= 0', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);
      const item = await cartService.addItem(cart.id, productA.id, 1, companyA.id);

      await expect(cartService.updateItemQuantity(item.id, 0, companyA.id)).rejects.toThrow(
        'Cantidad debe ser mayor a 0',
      );
    });

    it('rejects insufficient stock when updating', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);
      const item = await cartService.addItem(cart.id, productA.id, 1, companyA.id);

      await expect(cartService.updateItemQuantity(item.id, 100, companyA.id)).rejects.toThrow(
        'Stock insuficiente',
      );
    });

    it('throws NotFoundException for non-existent item', async () => {
      await expect(
        cartService.updateItemQuantity('nonexistent-id', 5, companyA.id),
      ).rejects.toThrow('Item del carrito no encontrado');
    });
  });

  describe('P6-04: removeItem — Remove item from cart', () => {
    it('removes item from cart', async () => {
      // Create a new customer to avoid interference from prior tests
      const customerNew = await prisma.cliente.create({
        data: {
          empresaId: companyA.id,
          nombre: `P6 Customer removeItem ${suffix}`,
          email: `p6-customer-removeitem-${suffix}@example.test`,
          activo: true,
        },
        select: { id: true },
      });
      const cart = await cartService.getOrCreateCart(customerNew.id, companyA.id);
      const item = await cartService.addItem(cart.id, productA.id, 1, companyA.id);

      await cartService.removeItem(item.id, companyA.id);

      const updated = await cartService.getCart(cart.id, companyA.id);
      expect(updated.items).toHaveLength(0);
    });

    it('throws NotFoundException for non-existent item', async () => {
      await expect(cartService.removeItem('nonexistent-id', companyA.id)).rejects.toThrow(
        'Item del carrito no encontrado',
      );
    });
  });

  describe('P6-05: getCart — Retrieve cart with items', () => {
    it('returns cart with all items and details', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);
      await cartService.addItem(cart.id, productA.id, 2, companyA.id);
      await cartService.addItem(cart.id, productB.id, 3, companyA.id);

      const retrieved = await cartService.getCart(cart.id, companyA.id);

      expect(retrieved.items).toHaveLength(2);
      expect(retrieved.items[0].producto.nombre).toBeDefined();
      expect(retrieved.items[0].producto.precioMinorista).toBeDefined();
    });

    it('throws NotFoundException for non-existent cart', async () => {
      await expect(cartService.getCart('nonexistent-id', companyA.id)).rejects.toThrow(
        'Carrito no encontrado',
      );
    });
  });

  describe('P6-06: clearCart — Empty cart', () => {
    it('removes all items from cart', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);
      await cartService.addItem(cart.id, productA.id, 1, companyA.id);
      await cartService.addItem(cart.id, productB.id, 1, companyA.id);

      await cartService.clearCart(cart.id, companyA.id);

      const cleared = await cartService.getCart(cart.id, companyA.id);
      expect(cleared.items).toHaveLength(0);
    });

    it('throws NotFoundException for non-existent cart', async () => {
      await expect(cartService.clearCart('nonexistent-id', companyA.id)).rejects.toThrow(
        'Carrito no encontrado',
      );
    });
  });

  describe('P6-07: Business isolation — Cross-company access prevention', () => {
    it('prevents accessing cart from different company', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);

      await expect(cartService.getCart(cart.id, companyB.id)).rejects.toThrow(
        'Carrito no encontrado',
      );
    });

    it('prevents adding item to cart from different company', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);

      await expect(cartService.addItem(cart.id, productA.id, 1, companyB.id)).rejects.toThrow(
        'Carrito no encontrado',
      );
    });

    it('prevents accessing product from different company', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);
      const hierB = await mkHierarchy(companyB.id, 'B');
      const productB_B = await mkProduct(companyB.id, hierB);

      await expect(cartService.addItem(cart.id, productB_B.id, 1, companyA.id)).rejects.toThrow(
        'Producto no encontrado',
      );
    });
  });

  describe('P6-08: getCartForCustomer — Retrieve customer cart', () => {
    it('returns cart for customer', async () => {
      await cartService.getOrCreateCart(customerA.id, companyA.id);
      const cart = await cartService.getCartForCustomer(customerA.id, companyA.id);

      expect(cart).toBeDefined();
      expect(cart?.customerId).toBe(customerA.id);
    });

    it('returns null for customer without cart', async () => {
      const newCustomer = await prisma.cliente.create({
        data: {
          empresaId: companyA.id,
          nombre: `P6 New Customer ${suffix}`,
          email: `p6-new-customer-${suffix}@example.test`,
          activo: true,
        },
        select: { id: true },
      });

      const cart = await cartService.getCartForCustomer(newCustomer.id, companyA.id);
      expect(cart).toBeNull();
    });
  });

  describe('P6-09: assertCartBelongsToCustomer — Customer authorization check', () => {
    it('allows access to own cart', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);
      await expect(
        cartService.assertCartBelongsToCustomer(cart.id, customerA.id, companyA.id),
      ).resolves.toBeUndefined();
    });

    it('denies access to other customer cart', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);
      await expect(
        cartService.assertCartBelongsToCustomer(cart.id, customerB.id, companyA.id),
      ).rejects.toThrow('El carrito no pertenece a este cliente');
    });
  });

  describe('P6-10: Stock availability — Informative validation (no reservation)', () => {
    it('allows adding items when stock exists', async () => {
      const cart = await cartService.getOrCreateCart(customerA.id, companyA.id);
      const item = await cartService.addItem(cart.id, productA.id, 3, companyA.id);

      expect(item.cantidad).toBeDefined();
    });

    it('tracks stock without reservation (cart does not reserve)', async () => {
      const cart1 = await cartService.getOrCreateCart(customerA.id, companyA.id);
      // Create a new customer in companyA for the second cart
      const customerA2 = await prisma.cliente.create({
        data: {
          empresaId: companyA.id,
          nombre: `P6 Customer A2 ${suffix}`,
          email: `p6-customer-a2-${suffix}@example.test`,
          activo: true,
        },
        select: { id: true },
      });
      const cart2 = await cartService.getOrCreateCart(customerA2.id, companyA.id);

      // Both customers can add items (stock validation is informative)
      const item1 = await cartService.addItem(cart1.id, productA.id, 5, companyA.id);
      const item2 = await cartService.addItem(cart2.id, productA.id, 5, companyA.id);

      expect(item1).toBeDefined();
      expect(item2).toBeDefined();
      // Both added successfully; stock reservation happens at order confirmation, not cart
    });
  });
});
