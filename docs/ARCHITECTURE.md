# System Architecture

## Overview Diagram

```
┌─────────────────────────────────────────────────────┐
│            Client Layer                             │
├──────────────┬──────────────┬──────────────┐────────┤
│ Web Browser  │ Mobile App   │  POS Device  │ CDN    │
│  (React)     │ (React Native)│(REST/WS)    │(Assets)│
└──────────────┴──────────────┴──────────────┴────────┘
               │
         ┌─────▼────────────────┐
         │   NGINX (Port 443)   │
         │ Reverse Proxy + SSL  │
         └─────┬────────────────┘
              │
    ┌─────────┴─────────────┐
    │                       │
┌───▼────────────────┐  ┌──▼──────────────┐
│ API (NestJS)       │  │ Frontend (React)│
│ Port 3000          │  │ Port 3001       │
│ - Auth             │  │ - Web app       │
│ - 35+ Modules      │  │ - Admin panel   │
│ - WebSocket        │  │                 │
└───┬────────────────┘  └─────────────────┘
    │
    ├──────────┬────────────┬─────────┬──────────┐
    │          │            │         │          │
┌───▼──┐ ┌────▼──┐ ┌───────▼──┐ ┌───▼──┐ ┌───▼──┐
│ PG   │ │ Redis │ │Elastic   │ │S3/   │ │Email │
│ DB   │ │ Cache │ │ Search   │ │CDN   │ │SMS   │
└──────┘ └───────┘ └──────────┘ └──────┘ └──────┘
```

## System Components

### 1. Client Layer

#### Web Browser (React)
- Single-page application (SPA)
- Real-time updates via WebSocket
- Responsive design (desktop, tablet)
- Offline support with service workers
- Multi-language interface (es, en, pt-br)

#### Mobile App (React Native)
- iOS/Android native applications
- JWT authentication
- Zustand state management
- Native device access (camera, storage)
- Push notifications

#### POS Terminal
- REST API integration
- WebSocket real-time order updates
- Offline transaction queueing
- Card reader integration

### 2. Reverse Proxy & SSL

**NGINX**
- Port 443 (HTTPS)
- SSL/TLS termination
- Request routing to backend services
- Static asset caching
- Load balancing (for scaled deployments)

### 3. Backend API (NestJS)

The NestJS backend implements a modular, layered architecture:

```
NestJS Application
├── Controllers (REST endpoints)
│   └── Validation & request handling
├── Services (Business logic)
│   ├── Database operations
│   ├── External API calls
│   └── Event publishing
├── Guards (Authentication/Authorization)
│   ├── JWT validation
│   ├── RBAC checks
│   └── Tenant isolation
├── Decorators (Cross-cutting concerns)
│   ├── @RequestUser (extract user context)
│   └── @BusinessContext (tenant scoping)
├── Pipes (Data transformation)
│   ├── Validation
│   └── Transformation
└── Interceptors (Request/Response handling)
    ├── Logging
    ├── Error handling
    └── Caching
```

#### Core Modules (35+)

**Authentication & Authorization**
- `auth`: JWT token generation, login/logout
- `users`: User management, profiles
- `authorizations`: Permission matrix (40+ permissions)
- `invitations`: User invitations to company

**Sales & Orders**
- `sales`: Sales orders (Ventas)
- `orders`: Order management with real-time updates
- `cart`: Shopping cart with persistence
- `devoluciones`: Returns and refunds

**Inventory & Catalog**
- `catalog`: Product catalog management
- `inventory`: Stock management with validation
- `products`: Product details and variants
- `stock`: Real-time stock synchronization

**Payments & Transactions**
- `payments`: Stripe and MercadoPago integration
- `cash-register`: POS cash transactions
- `refunds`: Refund processing
- `transactions`: Transaction history

**Customers & Relationships**
- `customers`: Customer management
- `loyalty`: Loyalty programs and rewards
- `membership`: Subscription management
- `dossier`: Customer profiles and history

**Communications**
- `email`: Email notifications (nodemailer)
- `sms-notifications`: SMS via third-party provider
- `notifications`: Push notifications
- `messaging`: Real-time WebSocket messaging

**Search & Analytics**
- `search`: Elasticsearch integration
- `analytics`: KPIs and metrics
- `metrics`: Performance metrics collection
- `alerts`: Alert management

**Operations & Admin**
- `admin`: Admin dashboard features
- `audit`: Audit logging (UsuarioAcceso)
- `business-context`: Company/tenant context
- `health`: Health check endpoints

**International Support**
- `i18n`: Internationalization (es, en, pt-br)
- `seo`: SEO optimization (OG tags, JSON-LD)
- `assets`: CDN asset management

### 4. Database (PostgreSQL)

**Connection**
- Host: `localhost:5500` (development)
- User: `user`
- Database: `otrarondamas`
- Driver: Prisma ORM

**Key Tables (60+ models)**
- `Empresa`: Multi-tenant company records
- `Usuario`: User accounts with roles
- `Venta`: Sales orders
- `VentaItem`: Sales line items
- `Producto`: Product catalog
- `Stock`: Inventory tracking
- `Pago`: Payment records
- `Cliente`: Customer information
- `UsuarioAcceso`: Audit log of all user actions
- `CierreCaja`: Cash register closings
- And 50+ more...

**Security Features**
- Row-level security via Prisma extension
- Soft deletes (deletedAt fields)
- Audit logging on critical operations
- Encrypted sensitive fields where applicable

### 5. Cache Layer (Redis)

**Purpose**
- Session storage
- Rate limiting counters
- Frequently accessed data caching
- Real-time data synchronization

**Keys Strategy**
```
cache:
  session:<sessionId>           # User sessions
  rate_limit:<userId>:<endpoint> # Rate limit counters
  order:<orderId>               # Order data
  product:<productId>           # Product catalog
  stock:<productId>             # Stock levels
```

### 6. Search Engine (Elasticsearch)

**Purpose**
- Full-text product search
- Order history search
- Customer search
- Audit log search

**Indices**
- `products`: Product catalog with filters
- `orders`: Sales orders searchable
- `customers`: Customer database searchable
- `audit_logs`: User action history

### 7. CDN & Asset Storage

**Purpose**
- Store product images
- Product documentation
- User avatars
- Static assets

**Providers**
- Hetzner Cloud Storage (primary)
- CloudFront or similar CDN (caching)

### 8. External Integrations

**Payment Processors**
- Stripe: Credit card processing, webhooks
- MercadoPago: Latin America payment solution

**Communications**
- SendGrid/nodemailer: Email delivery
- Twilio/similar: SMS delivery
- Firebase: Push notifications

## Data Flow Examples

### Example 1: User Login

```
1. Client: POST /api/auth/login {email, password}
2. API: Validate credentials against Usuario table
3. API: Generate JWT token (3600s TTL)
4. Redis: Store session with token
5. Client: Store JWT in localStorage
6. Client: Include JWT in all subsequent requests
```

### Example 2: Create Sales Order

```
1. Client: POST /api/ventas {items, customer, total}
   - Include JWT token in Authorization header
   
2. API Guard: Validate JWT → extract userId, empresaId
   
3. API Decorator: Extract business context (tenant)
   
4. API Service:
   a. Validate stock for each item
   b. Start database transaction
   c. Insert Venta record
   d. Insert VentaItem records
   e. Update Stock records
   f. Insert Pago record
   g. Commit transaction
   
5. Cache: Invalidate order list cache
   
6. WebSocket: Publish event (orderCreated)
   - All connected clients receive update
   
7. Elasticsearch: Index new order
   
8. Email: Send order confirmation
   
9. Response: Return Venta with ID to client
```

### Example 3: Real-time Inventory Update

```
1. WebSocket Connection:
   Client connects to ws://api.example.com/socket.io
   
2. Subscribe to Channel:
   emit('subscribe', {channel: 'inventory:empresa:123'})
   
3. Stock Change:
   Service detects stock update
   emit('stock:updated', {productId, oldQuantity, newQuantity})
   
4. Client Receives:
   Listener receives real-time stock update
   Updates UI immediately
   No page refresh needed
```

## Security Model

### Authentication

**JWT Token Flow**
```
1. User logs in with email/password
2. API validates credentials
3. API generates JWT (payload: {userId, empresaId, roles})
4. JWT signed with secret (3600s expiry)
5. Client stores JWT in localStorage
6. Client includes JWT in Authorization header
7. API validates JWT on each request
8. Expired tokens trigger re-authentication
```

**Token Structure**
```json
{
  "sub": "userId",
  "email": "user@example.com",
  "empresaId": "tenantId",
  "roles": ["admin", "vendedor"],
  "iat": 1698000000,
  "exp": 1698003600
}
```

### Authorization

**Role-Based Access Control (RBAC)**
- 40+ permissions granularly defined
- Roles assigned to users per company
- Permission checks at controller level
- Service-level authorization checks

**Permission Examples**
```
- crear:venta (create sales order)
- editar:venta (modify sales order)
- eliminar:venta (delete sales order)
- ver:reportes (view reports)
- gestionar:usuarios (manage users)
- configurar:empresa (configure company)
```

### Multi-Tenant Isolation

**Prisma Extension (CompanyScopedPrisma)**
```typescript
// Every query automatically scoped to user's empresaId
const vendorOrders = await prisma.venta.findMany({
  where: { empresaId: req.user.empresaId }
  // empresaId filter added automatically by extension
});
```

**Enforcement Points**
1. **Database Layer**: Prisma extension adds WHERE clause
2. **Service Layer**: Manual validation of empresaId
3. **Controller Layer**: Guard checks user's tenant access
4. **Audit Log**: All access logged in UsuarioAcceso table

### Data Encryption

- Passwords: bcryptjs (12 rounds)
- Sensitive fields: Encrypted at rest where applicable
- In-transit: HTTPS/TLS 1.2+
- API responses: JSON (no sensitive data in logs)

## Performance Considerations

### Database Optimization

**Indexing**
```sql
-- Critical indexes
CREATE INDEX idx_venta_empresa_date ON venta(empresaId, createdAt DESC);
CREATE INDEX idx_usuario_empresa_email ON usuario(empresaId, email);
CREATE INDEX idx_producto_familia ON producto(familiaId);
CREATE INDEX idx_stock_producto_empresa ON stock(productoId, empresaId);
```

**Query Optimization**
- N+1 query prevention with Prisma select/include
- Pagination for large result sets (default 20 items)
- Caching for frequently accessed data
- Database connection pooling

### Caching Strategy

**Cache Layers**
1. **Browser Cache**: Static assets (images, CSS, JS)
2. **CDN Cache**: Product images, static content
3. **Redis Cache**: Sessions, rate limits, frequent queries
4. **Database Query Cache**: Built-in Prisma caching

**Cache Invalidation**
```
- On write operations: invalidate related caches
- TTL-based: data expires after configured time
- Event-based: WebSocket publishes cache invalidation
- Manual: Admin can force cache refresh
```

### Horizontal Scaling

**Stateless Design**
- API servers are stateless (sessions in Redis)
- Multiple API instances can run in parallel
- Load balancer distributes requests
- Database is single source of truth

**Scaling Components**
```
Load Balancer (NGINX)
    ↓
┌───────┬───────┬───────┐
│ API 1 │ API 2 │ API 3 │  (horizontal scale)
└───────┴───────┴───────┘
    ↓
PostgreSQL (single primary)  (vertical scale)
Redis (cluster mode)         (horizontal scale)
Elasticsearch (cluster)      (horizontal scale)
```

## Deployment Architecture

### Development
```
docker-compose.yml
├── PostgreSQL 15
├── Redis
├── NestJS API (port 3000)
└── Optional: React frontend (port 3001)
```

### Staging
```
Hetzner VPS (cx31)
├── Docker Compose
├── PostgreSQL (persistent volume)
├── NGINX (SSL/TLS)
├── NestJS containers
└── External services (Stripe, etc.)
```

### Production
```
Hetzner Cloud
├── Load Balancer (NGINX)
├── API Cluster (3+ instances)
├── PostgreSQL Primary + Replica
├── Redis Cluster
├── Elasticsearch Cluster
├── CDN (CloudFront/Hetzner CDN)
└── Backups (daily snapshots)
```

## Disaster Recovery

**Backup Strategy**
- Daily PostgreSQL backups to S3
- Database snapshots every 4 hours
- Application code versioned in Git
- Configuration in encrypted vault

**Recovery Time Objective (RTO): 1 hour**
**Recovery Point Objective (RPO): 1 hour**

**Recovery Process**
1. Detect failure (monitoring alerts)
2. Restore from latest backup (15 minutes)
3. Verify data integrity (10 minutes)
4. Switch DNS to healthy instance (5 minutes)
5. Run smoke tests (10 minutes)

## Monitoring & Observability

**Logs**
- Application logs: JSON format to stdout
- Access logs: NGINX request logs
- Database logs: Query slow log
- Structured logging with context (userId, empresaId)

**Metrics**
- Request latency (p50, p95, p99)
- Error rates by endpoint
- Database query performance
- Cache hit/miss ratios
- WebSocket connection count

**Tracing**
- Request ID propagation
- Service-to-service call tracing
- Error context with stack traces
- User action audit trail (UsuarioAcceso)

**Alerting**
- API response time > 1s
- Error rate > 1%
- Database connection pool exhausted
- Disk space < 10%
- Certificate expiry < 7 days
