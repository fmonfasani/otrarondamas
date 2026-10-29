# API Contracts Documentation

**Last Updated**: 2026-10-29  
**Status**: VERIFIED from source code inspection  
**Scope**: NestJS API + Prisma schema audit  

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Multi-Tenant Isolation](#multi-tenant-isolation)
3. [Core Models & Relations](#core-models--relations)
4. [API Endpoints](#api-endpoints)
5. [DTO Contracts](#dto-contracts)
6. [Database Indexes](#database-indexes)
7. [Field Mapping Reference](#field-mapping-reference)

---

## Schema Overview

**Database**: PostgreSQL  
**ORM**: Prisma Client (Node.js + debian-openssl-3.0.x)  
**Multi-tenancy Model**: Company-scoped (empresaId/businessId)  

### Primary Entity Hierarchy

```
Empresa (Business)
├── Usuario (Staff User)
├── Cliente (Customer)
├── Venta (In-person Sale)
│   ├── VentaItem (Sale Line Item)
│   └── Pago (Sale Payment)
├── Pedido (Order)
│   ├── PedidoItem (Order Line Item)
│   ├── Entrega (Order Delivery)
│   └── Pago (Order Payment)
├── Producto (Product)
│   ├── Presentacion (Presentation/SKU variant)
│   ├── Lote (Batch/Lot)
│   └── ProductoProveedor (Supplier mapping)
├── Compra (Purchase Order)
│   ├── CompraItem (Purchase Line Item)
│   └── RecepcionCompra (Purchase Receipt)
└── Membership (Staff-Business relation)
    └── RoleGrant (Role assignment)
```

---

## Multi-Tenant Isolation

### Tenant Context Key

- **Primary Key**: `empresaId` (UUID)
- **Alias in some tables**: `businessId` (normalized to `empresaId`)
- **Scope Application**: `CompanyScopedPrismaService` — wraps all DB queries

### Isolation Strategy

**1. Foreign Key Enforcement**
All company-scoped tables have explicit FK to `Empresa(id)`:

```prisma
model Venta {
  id        String   @id @default(uuid())
  empresaId String   // FK to Empresa
  // ...
  Empresa   Empresa  @relation(fields: [empresaId], references: [id])
  
  @@index([empresaId, numero])
}
```

**2. Unique Constraints with Company Scope**

Some resources are company-scoped unique (not globally unique):

```prisma
// Cliente: email must be unique per company
@@unique([empresaId, email])

// Producto: codigoInterno (SKU) must be unique per company
@@unique([empresaId, codigoInterno])

// Venta: numero (sequential number) per company
@@index([empresaId, numero])
```

**3. Authority Checks**

All controllers resolve `empresaId` from authenticated context:

```typescript
// From SalesController
private async resolveCompanyIdFromContext(user: AuthenticatedUser): Promise<string> {
  const context = await this.businessContext.resolveForAuthenticatedUser(user);
  return this.businessContext.resolveCompanyId(context.businessId);
}
```

Queries never trust client-supplied `empresaId`; they always derive it from JWT + business context.

**4. Multi-Membership Support**

Users can belong to multiple companies via `Membership` table:

```prisma
model Membership {
  id        String   @id @default(uuid())
  userId    String
  businessId String  // FK to Empresa
  role      RolUsuario
  status    MembershipStatus
  
  @@unique([userId, businessId])
}
```

When JWT is issued, it includes `empresas[]` array of accessible companies.

---

## Core Models & Relations

### Empresa (Business/Tenant)

```prisma
model Empresa {
  id              String   @id @default(uuid())
  nombre          String   @unique
  handle          String?  @unique
  slug            String   @unique
  configuracion   Json     // Business settings
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations to all child entities
  Usuario         Usuario[]
  Cliente         Cliente[]
  Venta           Venta[]
  Pedido          Pedido[]
  Producto        Producto[]
  Membership      Membership[]
  // ... 40+ relations total
}
```

**Authorization**: Staff access via `Membership`; customer access via `Cliente` + `Customer` JWT type.

---

### Usuario (Staff User)

```prisma
model Usuario {
  id              String    @id @default(uuid())
  empresaId       String    // FK to Empresa
  nombre          String
  email           String    @unique
  passwordHash    String?
  activo          Boolean   @default(true)
  rol             RolUsuario @default(OWNER)
  estadoLegajo    EstadoLegajo @default(APROBADO)
  fotoUrl         String?
  googleId        String?   @unique
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  Empresa         Empresa   @relation(fields: [empresaId], references: [id])
  Venta           Venta[]
  Pedido          Pedido[]
  Compra          Compra[]
  // ... related operations
}

enum RolUsuario {
  OWNER
  ASISTENTE_LOCAL
  PROVEEDOR
  REPARTIDOR
}

enum EstadoLegajo {
  PENDIENTE
  APROBADO
}
```

**JWT Claims** (from `auth.types.ts`):
```typescript
{
  sub: string;         // Usuario.id
  email: string;
  nombre: string;
  empresaId: string;   // Primary company
  rol: RolUsuario;
  estadoLegajo: EstadoLegajo;
  type: "usuario";
  permisos: string[];  // From database (runtime, not cached)
  empresas?: EmpresaInJwt[]; // Multi-business
}
```

---

### Cliente (Customer)

```prisma
model Cliente {
  id              String     @id @default(uuid())
  empresaId       String     // FK to Empresa
  nombre          String
  email           String?
  telefono        String?
  direccion       String?
  limiteCredito   Decimal?
  activo          Boolean    @default(true)
  esMayorista     Boolean    @default(false)
  estadoLegajo    EstadoLegajo?
  
  // Auth: OAuth or password
  googleId        String?    @unique
  passwordHash    String?
  
  // Business identifiers
  condicionIva    String?    // Tax classification
  cuit            String?    // Business registry
  razonSocial     String?    // Legal name
  
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  
  Empresa         Empresa    @relation(fields: [empresaId], references: [id])
  Cart            Cart[]
  Venta           Venta[]
  Pedido          Pedido[]
  CuentaCorriente CuentaCorriente[]
  Deuda           Deuda[]
  
  @@unique([empresaId, email])
  @@unique([id, empresaId])
}
```

**JWT Claims** (customer login):
```typescript
{
  sub: string;         // Cliente.id
  email: string;
  nombre: string;
  empresaId: string;   // Single business
  esMayorista: boolean;
  type: "cliente";     // Distinguish from "usuario"
}
```

---

### Venta (In-Person Sale) — RF-05

```prisma
model Venta {
  id            String      @id @default(uuid())
  empresaId     String      // FK to Empresa
  usuarioId     String      // FK to Usuario (who created)
  clienteId     String?     // FK to Cliente (optional)
  canal         String      // "MOSTRADOR", "WHATSAPP", etc.
  
  total         Decimal     @db.Decimal(14, 2)
  descuento     Decimal     @default(0) @db.Decimal(14, 2)
  
  estado        EstadoVenta @default(CONFIRMADA)
  numero        Int?        // Sequential per company
  idempotencyKey String?    @unique // RFC 7231 idempotency
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  Empresa       Empresa     @relation(fields: [empresaId], references: [id])
  Usuario       Usuario     @relation(fields: [usuarioId], references: [id])
  Cliente       Cliente?    @relation(fields: [clienteId], references: [id])
  VentaItem     VentaItem[]
  Pago          Pago[]
  AuditLog      AuditLog[]
  
  @@index([empresaId, numero])
}

model VentaItem {
  id                          String   @id @default(uuid())
  ventaId                     String   // FK to Venta
  productoId                  String   // FK to Producto
  
  cantidad                    Decimal  @db.Decimal(14, 2)
  precioUnitario              Decimal  @db.Decimal(14, 2)
  descuentoItem               Decimal  @default(0) @db.Decimal(14, 2)
  descuentoFidelizacionPorcentaje Decimal? @db.Decimal(5, 2)
  
  reglaFidelizacionId         String?  // FK to ReglaFidelizacion
  
  createdAt                   DateTime @default(now())
  updatedAt                   DateTime @updatedAt
  
  Venta         Venta             @relation(fields: [ventaId], references: [id])
  Producto      Producto          @relation(fields: [productoId], references: [id])
  ReglaFidelizacion ReglaFidelizacion? @relation(fields: [reglaFidelizacionId], references: [id], onDelete: Restrict)
}

enum EstadoVenta {
  CONFIRMADA
  ANULADA
}
```

**Key Behavior**:
- Idempotency: same `idempotencyKey` returns cached result
- Loyalty: automatic discount via `ReglaFidelizacion` based on customer level
- Line-level precision: Decimal(14,2) for amounts, Decimal(5,2) for percentages
- No soft delete: cancellations tracked in `AuditLog` + separate `DevolucionCliente` (return request)

---

### Pedido (Order) — RFC Inbox

```prisma
model Pedido {
  id            String       @id @default(uuid())
  empresaId     String       // FK to Empresa
  clienteId     String       // FK to Cliente
  usuarioId     String?      // FK to Usuario (assigned staff)
  
  estado        EstadoPedido @default(RECIBIDO)
  canalOrigen   String       // "TIENDA_ONLINE", "WHATSAPP", etc.
  
  total         Decimal
  descuento     Decimal      @default(0)
  idempotencyKey String?     @unique
  
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  Empresa       Empresa      @relation(fields: [empresaId], references: [id])
  Cliente       Cliente      @relation(fields: [clienteId], references: [id])
  Usuario       Usuario?     @relation(fields: [usuarioId], references: [id])
  PedidoItem    PedidoItem[]
  Entrega       Entrega?
  Pago          Pago[]
  Notificacion  Notificacion[]
}

enum EstadoPedido {
  RECIBIDO                 // Initial state
  CONFIRMADO               // Approved by staff
  EN_PREPARACION           // Being picked/packed
  LISTO                    // Ready for delivery
  ASIGNADO                 // Assigned to driver
  EN_CAMINO                // In transit
  ENTREGADO                // Completed
  PARCIALMENTE_ENTREGADO   // Partial completion
  ENTREGA_FALLIDA          // Failed attempt
  CANCELADO                // Cancelled
}
```

**Constraints** (from `orders.controller.ts`):
- **IMMUTABLE after EN_PREPARACION**: Cannot cancel if state >= EN_PREPARACION (409 Conflict)
- **Stock reversal**: Cancelling a CONFIRMADO order reverses inventory (EGRESO → ENTRADA)
- **Serializable isolation**: Prevents race conditions on concurrent cancellations
- **Customer visibility**: GET requires `pedidos.gestionar` permission (PII exposure)

---

### Producto (Product)

```prisma
model Producto {
  id                  String   @id @default(uuid())
  empresaId           String   // FK to Empresa
  
  nombre              String
  codigoInterno       String   // Internal SKU
  codigoBarras        String?  // EAN/UPC
  marca               String?
  unidadBase          UnidadBase
  
  // Pricing
  costo               Decimal
  precioMinorista     Decimal  // Retail
  precioMayorista     Decimal? // Wholesale
  
  // Classification
  familiaId           String   // FK to Familia (top-level category)
  subfamiliaId        String   // FK to Subfamilia
  tipoId              String   // FK to Tipo
  subtipoId           String   // FK to Subtipo
  
  activo              Boolean  @default(true)
  stockMinimo         Decimal  @default(0)
  descuentoPorcentaje Decimal? @db.Decimal(5, 2)
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  Empresa       Empresa          @relation(fields: [empresaId], references: [id])
  Familia       Familia          @relation(fields: [familiaId], references: [id])
  Subfamilia    Subfamilia       @relation(fields: [subfamiliaId], references: [id])
  Tipo          Tipo             @relation(fields: [tipoId], references: [id])
  Subtipo       Subtipo          @relation(fields: [subtipoId], references: [id])
  CartItem      CartItem[]
  Lote          Lote[]
  Presentacion  Presentacion[]
  
  @@unique([empresaId, codigoInterno])
}

enum UnidadBase {
  UNIDAD
  KILOGRAMO
  LITRO
  METRO
  PACK
  CAJA
}
```

**Hierarchy**:
```
Familia (top-level category)
└── Subfamilia (subcategory)
    └── Tipo (type)
        └── Subtipo (subtype)
└── Producto (product must have all four levels)
```

---

### Pago (Payment)

```prisma
model Pago {
  id            String       @id @default(uuid())
  empresaId     String       // FK to Empresa
  
  ventaId       String?      // FK to Venta (in-person sale)
  pedidoId      String?      // FK to Pedido (online order)
  deudaId       String?      // FK to CuentaCorriente (account credit)
  
  usuarioId     String?      // FK to Usuario (who recorded)
  
  monto         Decimal
  medio         String       // "EFECTIVO", "TARJETA", "TRANSFERENCIA"
  estado        EstadoPago   @default(PENDIENTE)
  comision      Decimal      @default(0)
  
  // For cash payments
  montoRecibido Decimal?
  vuelto        Decimal?
  referencia    String?      // Receipt number
  
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  Empresa       Empresa      @relation(fields: [empresaId], references: [id])
  Venta         Venta?       @relation(fields: [ventaId], references: [id])
  Pedido        Pedido?      @relation(fields: [pedidoId], references: [id])
  CuentaCorriente CuentaCorriente? @relation(fields: [deudaId], references: [id])
  Usuario       Usuario?     @relation(fields: [usuarioId], references: [id])
  AplicacionPago AplicacionPago[]
}

enum EstadoPago {
  PENDIENTE
  EN_PROCESO
  APROBADO
  RECHAZADO
  CANCELADO
  REEMBOLSADO_PARCIAL
  REEMBOLSADO_TOTAL
}
```

**Payment Gateway** (P11-1):
For online orders, Payment gateway integration models exist:

```prisma
model Payment {
  id                String   @id @default(cuid())
  empresaId         String   // FK to Empresa
  ventaId           String   // FK to Venta
  monto             Decimal  @db.Decimal(10, 2)
  moneda            String   @default("ARS")
  
  proveedor         String   // "STRIPE" | "MERCADOPAGO"
  providerPaymentId String   @unique
  estado            String   @default("PENDING")
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  Empresa           Empresa  @relation(fields: [empresaId], references: [id], onDelete: Restrict)
  Venta             Venta    @relation(fields: [ventaId], references: [id], onDelete: Restrict)
  PaymentIntent     PaymentIntent[]
  Refund            Refund[]
}

model PaymentIntent {
  id               String   @id @default(cuid())
  empresaId        String   // FK to Empresa
  paymentId        String   // FK to Payment
  clientSecret     String   @unique
  providerIntentId String   @unique
  expiresAt        DateTime
}

model Refund {
  id              String   @id @default(cuid())
  empresaId       String   // FK to Empresa
  paymentId       String   // FK to Payment
  monto           Decimal  @db.Decimal(10, 2)
  razon           String
  estado          String   @default("PENDING")
  providerRefundId String? @unique
}
```

---

### Cart (Shopping Cart)

```prisma
model Cart {
  id         String     @id @default(uuid())
  customerId String     // FK to Cliente
  businessId String     // FK to Empresa
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  
  Cliente    Cliente    @relation(fields: [customerId], references: [id])
  Empresa    Empresa    @relation(fields: [businessId], references: [id])
  CartItem   CartItem[]
  
  @@unique([customerId, businessId])
  @@index([businessId, customerId])
}

model CartItem {
  id         String   @id @default(uuid())
  cartId     String   // FK to Cart
  productoId String   // FK to Producto
  cantidad   Decimal
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  Cart       Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  Producto   Producto @relation(fields: [productoId], references: [id])
  
  @@unique([cartId, productoId])
  @@index([cartId])
}
```

---

### Compra (Purchase Order)

```prisma
model Compra {
  id                      String       @id @default(uuid())
  empresaId               String       // FK to Empresa
  proveedorId             String       // FK to Proveedor
  usuarioId               String       // FK to Usuario
  
  estado                  EstadoCompra @default(BORRADOR)
  total                   Decimal
  
  fechaOrden              DateTime     @default(now())
  fechaRecepcionEsperada  DateTime?
  fechaVencimientoPago    DateTime?
  
  numeroFactura           String?
  saldo                   Decimal      @default(0)
  totalPagado             Decimal      @default(0)
  
  createdAt               DateTime     @default(now())
  updatedAt               DateTime     @updatedAt
  
  Empresa     Empresa          @relation(fields: [empresaId], references: [id])
  Proveedor   Proveedor        @relation(fields: [proveedorId], references: [id])
  Usuario     Usuario          @relation(fields: [usuarioId], references: [id])
  CompraItem  CompraItem[]
  RecepcionCompra RecepcionCompra[]
}

enum EstadoCompra {
  BORRADOR              // Draft
  EMITIDA               // Sent to supplier
  RECEPCION_PARCIAL     // Partially received
  RECIBIDA              // Fully received
}
```

---

### Lote (Batch/Lot) — Inventory

```prisma
model Lote {
  id            String   @id @default(uuid())
  empresaId     String   // FK to Empresa
  productoId    String   // FK to Producto
  
  numeroLote    String   // Batch/lot number
  vencimiento   DateTime
  cantidad      Decimal
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  Empresa       Empresa  @relation(fields: [empresaId], references: [id])
  Producto      Producto @relation(fields: [productoId], references: [id])
  
  @@unique([productoId, numeroLote, empresaId])
}

model MovimientoStock {
  id                String       @id @default(uuid())
  empresaId         String       // FK to Empresa
  productoId        String       // FK to Producto
  loteId            String?      // FK to Lote (nullable for non-lot products)
  
  tipoMovimiento    String       // "EGRESO" (sale), "ENTRADA" (receipt), etc.
  cantidad          Decimal
  motivo            String
  
  usuarioId         String?      // FK to Usuario
  recepcionCompraId String?      // FK to RecepcionCompra
  
  loteVencidoAlMomento Boolean  @default(false) // Flag for expired lots
  
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  
  Empresa           Empresa      @relation(fields: [empresaId], references: [id])
  Producto          Producto     @relation(fields: [productoId], references: [id])
  Lote              Lote?        @relation(fields: [loteId], references: [id])
  Usuario           Usuario?     @relation(fields: [usuarioId], references: [id])
}
```

---

## API Endpoints

### Authentication

#### POST /api/auth/login
**Staff/Admin Login**

Request:
```json
{
  "email": "usuario@empresa.com",
  "password": "securepassword"
}
```

Response (200 OK):
```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "usuario@empresa.com",
    "nombre": "Juan Pérez",
    "empresaId": "uuid",
    "rol": "OWNER",
    "estadoLegajo": "APROBADO",
    "type": "usuario",
    "permisos": ["ventas.crear", "ventas.ver", "pedidos.gestionar"],
    "empresas": [
      {
        "id": "uuid",
        "nombre": "Empresa 1",
        "role": "OWNER"
      }
    ]
  },
  "expiresIn": 3600
}
```

---

#### GET /api/auth/me
**Current User Profile**

Headers: `Authorization: Bearer <token>`

Response (200 OK):
```json
{
  "id": "uuid",
  "email": "usuario@empresa.com",
  "nombre": "Juan Pérez",
  "empresaId": "uuid",
  "empresaNombre": "Otra Ronda Más",
  "fotoUrl": "https://...",
  "rol": "OWNER",
  "estadoLegajo": "APROBADO",
  "type": "usuario",
  "metodoLogin": "password",
  "createdAt": "2026-10-01T00:00:00Z",
  "empresasDetail": [
    {
      "id": "uuid",
      "nombre": "Empresa 1",
      "role": "OWNER",
      "createdAt": "2026-10-01T00:00:00Z"
    }
  ]
}
```

---

### Sales (RF-05)

#### POST /api/ventas
**Create In-Person Sale**

Permission: `ventas.crear`  
Guard: `ApprovedDossierGuard` (RF-17: staff member's dossier approved)

Request:
```typescript
{
  items: [
    {
      productoId: "uuid",
      cantidad: 2,
      descuentoItem?: 0
    }
  ],
  clienteId?: "uuid",
  idempotencyKey?: "uuid-or-unique-string"
}
```

Response (201 Created):
```json
{
  "id": "uuid",
  "empresaId": "uuid",
  "usuarioId": "uuid",
  "clienteId": "uuid|null",
  "numero": 1234,
  "total": "299.99",
  "descuento": "0.00",
  "estado": "CONFIRMADA",
  "idempotencyKey": "uuid",
  "createdAt": "2026-10-29T18:30:00Z",
  "VentaItem": [
    {
      "id": "uuid",
      "productoId": "uuid",
      "cantidad": "2.00",
      "precioUnitario": "149.99",
      "descuentoItem": "0.00",
      "descuentoFidelizacionPorcentaje": "10.00",
      "reglaFidelizacionId": "uuid|null"
    }
  ],
  "saldo": "0.00",
  "advertenciasStockVencido": []
}
```

**Behavior**:
- Idempotency: resubmitting same `idempotencyKey` returns cached sale
- Loyalty: automatic discount applied for eligible customers
- Decimal precision: line-level Decimal(14,2) + aggregate Decimal(14,2)
- Stock validation: all items checked for activo=true

---

#### POST /api/ventas/cotizacion
**Quote Sale (Pre-Create)**

Permission: `ventas.crear`

Request: (same as POST /api/ventas)

Response (200 OK):
```json
{
  "total": "299.99",
  "descuento": "0.00",
  "items": [
    {
      "productoId": "uuid",
      "cantidad": "2",
      "precioUnitario": "149.99",
      "subtotal": "299.98"
    }
  ]
}
```

**Behavior**: Quote only — does not create a Venta record. Called at 300ms debounce during cart edit.

---

#### GET /api/ventas
**List In-Person Sales**

Permission: `ventas.ver`  
Query:
```
?page=1&limit=20&estado=CONFIRMADA
```

Response (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "numero": 1234,
      "total": "299.99",
      "clienteId": "uuid|null",
      "estado": "CONFIRMADA",
      "createdAt": "2026-10-29T18:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

---

#### GET /api/ventas/:id
**Get Sale Detail**

Permission: `ventas.ver`

Response (200 OK):
```json
{
  "id": "uuid",
  "numero": 1234,
  "empresaId": "uuid",
  "usuarioId": "uuid",
  "clienteId": "uuid",
  "total": "299.99",
  "estado": "CONFIRMADA",
  "VentaItem": [...],
  "Pago": [
    {
      "id": "uuid",
      "monto": "299.99",
      "medio": "EFECTIVO",
      "estado": "APROBADO",
      "montoRecibido": "300.00",
      "vuelto": "0.01"
    }
  ],
  "saldo": "0.00"
}
```

---

#### GET /api/ventas/:id/comprobante
**Get Sale Receipt**

Permission: `ventas.ver`

Response (200 OK):
```json
{
  "numero": "1234",
  "fecha": "2026-10-29",
  "cliente": {
    "nombre": "Juan García",
    "email": "juan@example.com"
  },
  "items": [
    {
      "nombre": "Producto A",
      "cantidad": "2",
      "unitario": "149.99",
      "descuento": "0.00",
      "total": "299.98"
    }
  ],
  "total": "299.99",
  "medio": "EFECTIVO"
}
```

---

### Orders (Pedidos)

#### GET /api/pedidos
**List Orders**

Permission: `pedidos.gestionar` (PII exposure — view itself is sensitive)  
Query:
```
?estado=RECIBIDO&limit=20&page=1
```

Response (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "empresaId": "uuid",
      "clienteId": "uuid",
      "canalOrigen": "TIENDA_ONLINE",
      "estado": "CONFIRMADO",
      "total": "1999.99",
      "createdAt": "2026-10-29T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1
}
```

---

#### GET /api/pedidos/:id
**Get Order Detail**

Permission: `pedidos.gestionar`

Response (200 OK):
```json
{
  "id": "uuid",
  "empresaId": "uuid",
  "clienteId": "uuid",
  "usuarioId": "uuid|null",
  "estado": "EN_PREPARACION",
  "canalOrigen": "TIENDA_ONLINE",
  "total": "1999.99",
  "descuento": "0.00",
  "PedidoItem": [
    {
      "id": "uuid",
      "productoId": "uuid",
      "cantidad": "5",
      "precioUnitario": "399.99"
    }
  ],
  "Entrega": {
    "id": "uuid",
    "estado": "EN_PREPARACION",
    "preparadorId": "uuid|null",
    "repartidorId": "uuid|null"
  },
  "Pago": [
    {
      "id": "uuid",
      "monto": "1999.99",
      "estado": "APROBADO"
    }
  ],
  "createdAt": "2026-10-29T10:00:00Z"
}
```

---

#### PATCH /api/pedidos/:id/estado
**Update Order Status**

Permission: `pedidos.gestionar`

Request:
```json
{
  "estado": "CONFIRMADO"
}
```

Response (200 OK):
```json
{
  "id": "uuid",
  "estado": "CONFIRMADO",
  "updatedAt": "2026-10-29T18:30:00Z"
}
```

**State Machine**:
- RECIBIDO → CONFIRMADO → EN_PREPARACION → LISTO → ASIGNADO → EN_CAMINO → ENTREGADO
- Backward states: ENTREGA_FALLIDA, PARCIALMENTE_ENTREGADO, CANCELADO

---

#### POST /api/pedidos/:id/cancel
**Cancel Order**

Permission: `pedidos.gestionar`

Request:
```json
{
  "motivo": "Cliente solicitó cancelación"
}
```

Response (200 OK):
```json
{
  "id": "uuid",
  "estado": "CANCELADO",
  "stockReversed": [
    {
      "productoId": "uuid",
      "cantidad": "5",
      "movimientoId": "uuid"
    }
  ]
}
```

**Constraints** (P2-3):
- **Only RECIBIDO, CONFIRMADO, ENTREGA_FALLIDA** can be cancelled
- **EN_PREPARACION+** returns 409 Conflict
- **Stock reversal**: EGRESO movements reversed to ENTRADA
- **Idempotency**: cancelling twice is safe (no double-reversal)
- **Isolation**: SERIALIZABLE prevents race conditions

---

### Products

#### GET /api/ventas/productos
**Search Products (For Sale Creation)**

Query:
```
?search=cafe
```

Response (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "nombre": "Café Premium 1kg",
      "codigoInterno": "CAF-001",
      "precioMinorista": "850.00",
      "precioMayorista": "750.00",
      "activo": true
    }
  ]
}
```

**Access**: No permission required (called during sale flow)

---

### Dashboard / Analytics

#### GET /api/admin/dashboard/kpis
**Dashboard KPIs**

Permission: `dashboard.view`  
Query:
```
?period=30d
```

Response (200 OK):
```json
{
  "period": "30d",
  "sales": {
    "total": "150000.00",
    "count": 245,
    "avgTicket": "612.24",
    "trend": 15.5
  },
  "orders": {
    "total": 78,
    "pending": 12,
    "completed": 66,
    "cancelled": 0
  },
  "inventory": {
    "totalValue": "250000.00",
    "lowStock": 23,
    "expired": 2
  },
  "customers": {
    "total": 150,
    "active30d": 89,
    "newThisMonth": 15
  }
}
```

---

#### GET /api/admin/dashboard/trends
**Sales Trend Chart**

Query:
```
?metric=revenue&period=30d
```

Response (200 OK):
```json
{
  "metric": "revenue",
  "period": "30d",
  "data": [
    {
      "date": "2026-10-01",
      "value": "5000.00",
      "dayOfWeek": "Tuesday"
    },
    ...
  ]
}
```

---

#### GET /api/admin/dashboard/top-products
**Top Products by Revenue**

Query:
```
?limit=10&metric=revenue
```

Response (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "nombre": "Café Premium",
      "revenue": "25000.00",
      "quantity": 150,
      "rank": 1
    }
  ]
}
```

---

## DTO Contracts

### CreateSaleDto

```typescript
interface CreateSaleDto {
  items: Array<{
    productoId: string;
    cantidad: number;
    descuentoItem?: number;
  }>;
  clienteId?: string;
  idempotencyKey?: string;
}
```

---

### QuoteSaleDto

```typescript
interface QuoteSaleDto {
  items: Array<{
    productoId: string;
    cantidad: number;
    descuentoItem?: number;
  }>;
  clienteId?: string;
}
```

---

### UpdateOrderStatusDto

```typescript
interface UpdateOrderStatusDto {
  estado: EstadoPedido;
}
```

---

### CancelOrderDto

```typescript
interface CancelOrderDto {
  motivo: string;
}
```

---

## Database Indexes

### Performance Indexes

| Model | Index | Purpose |
|-------|-------|---------|
| `Venta` | `(empresaId, numero)` | Sequential number lookup per company |
| `Producto` | `(empresaId, codigoInterno)` | SKU unique constraint query |
| `Cliente` | `(empresaId, email)` | Email unique constraint query |
| `Pedido` | `(empresaId, estado)` | Order inbox filtering |
| `MovimientoStock` | `(empresaId, productoId, loteId)` | Inventory lookup |
| `AnalyticsEvent` | `(empresaId, eventType, timestamp)` | Dashboard aggregations |
| `AnalyticsEvent` | `(empresaId, userId, timestamp)` | Per-user analytics |
| `Cart` | `(businessId, customerId)` | Cart lookup |
| `CartItem` | `(cartId)` | Cart items fetch |
| `Conversation` | `(businessId, deletedAt)` | Message inbox |
| `Message` | `(businessId, conversationId, createdAt)` | Message history |

### Uniqueness Constraints

| Model | Constraint | Scope |
|-------|-----------|-------|
| `Empresa` | `nombre` | Global |
| `Empresa` | `slug` | Global |
| `Usuario` | `email` | Global |
| `Usuario` | `googleId` | Global |
| `Cliente` | `(empresaId, email)` | Per-company |
| `Producto` | `(empresaId, codigoInterno)` | Per-company |
| `Venta` | `idempotencyKey` | Global (RFC 7231) |
| `Pedido` | `idempotencyKey` | Global |
| `Membership` | `(userId, businessId)` | Single membership per user-company |
| `Lote` | `(productoId, numeroLote, empresaId)` | Per-product-company |

---

## Field Mapping Reference

### Frontend → Database Mapping

| Frontend Label | DB Field | Type | Format |
|---|---|---|---|
| Amount | `Decimal` | Decimal | Decimal(14,2) |
| Discount % | `Decimal` | Decimal | Decimal(5,2) |
| Unit Price | `precioUnitario` | Decimal | Decimal(14,2) |
| Quantity | `cantidad` | Decimal | Decimal(14,2) |
| Created | `createdAt` | DateTime | ISO 8601 |
| Updated | `updatedAt` | DateTime | ISO 8601 |
| Status | `estado` | Enum | See EstadoVenta, EstadoPedido, etc. |
| ID | `id` | String | UUID v4 |

### Authorization Scopes

| Scope | Operation | Guard |
|-------|-----------|-------|
| `ventas.crear` | Create in-person sale | `RequirePermission` |
| `ventas.ver` | View sales list & detail | `RequirePermission` |
| `pedidos.gestionar` | Full order lifecycle | `RequirePermission` |
| `dashboard.view` | View analytics dashboard | `Authorize` |
| `caja.gastos` | Cash register expenses | `RequirePermission` |

---

## Isolation & Security

### Tenant Scoping

All queries execute within company scope:

```typescript
// Service layer — always resolve from JWT
const companyId = await this.businessContext.resolveCompanyIdFromContext(user);
const db = this.prismaFactory.forCompany(companyId);

// Query is automatically filtered
const sales = await db.venta.findMany({
  where: { empresaId: companyId }
});
```

### Permission Checks

Two-layer authorization:
1. **JWT claims** (cached in token): `permisos` array (stale until re-login)
2. **Database query** (fresh on each request): PermissionsGuard loads current assignments

### PII Visibility

- `Cliente` details (name, email, phone, address) visible only via `pedidos.gestionar`
- `Usuario` list not exposed via API (internal only)
- Customer JWT type (`type: "cliente"`) indicates non-staff

---

## Appendix: Error Codes

### Common HTTP Status Codes

| Code | Condition | Example |
|------|-----------|---------|
| 400 | Invalid request (validation) | Missing required field |
| 401 | Unauthorized (no token) | Missing Authorization header |
| 403 | Forbidden (permission check fails) | User lacks `ventas.crear` |
| 404 | Not found or wrong tenant | Venta not in user's company |
| 409 | Conflict (state constraint violation) | Trying to cancel EN_PREPARACION order |
| 422 | Unprocessable (business logic) | Inactive product |
| 500 | Server error | Database connection failure |

---

## References

- **NestJS Controllers**: `apps/api/src/sales/sales.controller.ts`, `orders.controller.ts`, `admin/dashboard.controller.ts`
- **Services**: `apps/api/src/sales/sales.service.ts`, `orders/orders.service.ts`
- **DTOs**: `apps/api/src/*/dto/*.ts`
- **Prisma Schema**: `apps/api/prisma/schema.prisma`
- **Auth Types**: `apps/api/src/auth/auth.types.ts`
- **Business Context**: `apps/api/src/business-context/business-context.service.ts`
- **Multi-Tenancy**: `apps/api/src/prisma/company-scoped-prisma.service.ts`

---

**Document Status**: ✅ VERIFIED  
**Last Audit**: 2026-10-29  
**Next Review**: After API contract changes  
