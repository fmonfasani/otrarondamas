# Wapsell Platform Documentation

Enterprise SaaS ERP/POS system with multi-tenant architecture, real-time messaging, payments, analytics, and mobile support.

## Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/fmonfasani/otrarondamas.git
cd otrarondamas

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Seed database
npm run db:seed
```

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Hetzner VPS setup and step-by-step instructions.

## Technology Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | NestJS, TypeScript, Prisma ORM |
| **Frontend** | React, Next.js, Tailwind CSS |
| **Mobile** | React Native |
| **Database** | PostgreSQL 15 |
| **Cache** | Redis |
| **Search** | Elasticsearch |
| **Real-time** | Socket.io WebSockets |
| **Payments** | Stripe, MercadoPago |
| **Infrastructure** | Docker, Hetzner Cloud, NGINX |

## Key Features

- ✅ Multi-tenant SaaS architecture with tenant isolation
- ✅ Real-time messaging (WebSockets)
- ✅ Payment processing (Stripe + MercadoPago integration)
- ✅ Analytics & KPIs dashboard
- ✅ Full-text search (Elasticsearch)
- ✅ Mobile app (iOS/Android via React Native)
- ✅ Multi-language support (es, en, pt-br)
- ✅ SEO optimization (OG tags, JSON-LD)
- ✅ Admin dashboard with user management
- ✅ Audit logging & compliance (UsuarioAcceso tracking)
- ✅ Inventory management with stock validation
- ✅ Sales & order management
- ✅ Customer relationship management
- ✅ Purchase order management
- ✅ Cash register & transactions
- ✅ Loyalty programs
- ✅ Email & SMS notifications

## Documentation Structure

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, microservices, data flow, security model |
| [API-REFERENCE.md](./API-REFERENCE.md) | REST endpoints, authentication, error handling, webhooks |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production setup, infrastructure, CI/CD pipeline |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues, debugging, recovery procedures |
| [RUNBOOKS.md](./RUNBOOKS.md) | Operations procedures, maintenance, emergency response |
| [TEAM-HANDBOOK.md](./TEAM-HANDBOOK.md) | Contributing guide, code standards, commit conventions |
| [CHANGELOG.md](./CHANGELOG.md) | Release notes, feature history |
| [FAQS.md](./FAQS.md) | Frequently asked questions |

## Project Statistics

- **Total Lines of Code**: 51,848+
- **Test Coverage**: 894+ tests across unit, integration, and E2E suites
- **API Modules**: 35+ (auth, sales, inventory, payments, analytics, etc.)
- **Database Models**: 60+ Prisma models
- **Supported Languages**: Spanish (es), English (en), Portuguese (pt-br)

## Getting Started

### First Time Setup

1. **Fork & Clone**
   ```bash
   git clone https://github.com/fmonfasani/otrarondamas.git
   cd otrarondamas
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Environment**
   ```bash
   cp apps/api/.env.example apps/api/.env.local
   # Edit with your local configuration
   ```

4. **Initialize Database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

6. **Access Services**
   - API: http://localhost:3000
   - Frontend: http://localhost:3001 (if enabled)

### Understanding the Codebase

1. **Architecture**: Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand system design
2. **API Routes**: Check [API-REFERENCE.md](./API-REFERENCE.md) for available endpoints
3. **Contributing**: See [TEAM-HANDBOOK.md](./TEAM-HANDBOOK.md) for code standards
4. **Deployment**: Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup

## Support & Resources

- **Issues**: [GitHub Issues](https://github.com/fmonfasani/otrarondamas/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fmonfasani/otrarondamas/discussions)
- **Email**: support@wapsell.com
- **Documentation**: See files in this directory

## Key Directories

```
otrarondamas/
├── apps/
│   ├── api/              # NestJS backend
│   ├── mobile/           # React Native mobile app
│   ├── pos-admin/        # POS terminal interface
│   └── tienda-online/    # E-commerce storefront
├── packages/
│   ├── shared-types/     # Shared TypeScript types
│   ├── ui-kit/           # UI component library
│   └── design-system/    # Design tokens & patterns
├── docs/                 # This documentation
├── docker-compose.yml    # Local development stack
└── package.json          # Workspace configuration
```

## Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run integration tests
npm run test:integration:parallel

# Build for production
npm run build

# Lint code
npm run lint

# Database migrations
npm run db:migrate
npm run db:seed

# Analyze CI metrics
npm run ci:analyze
```

## Continuous Integration

The project uses GitHub Actions for:
- Automated testing (unit, integration, E2E)
- Linting and code quality checks
- Build verification
- Deployment to staging and production

See [DEPLOYMENT.md](./DEPLOYMENT.md#continuous-integration) for CI/CD details.

## Security

- JWT token-based authentication (3600s TTL)
- Role-based access control (RBAC) with 40+ permissions
- Multi-tenant isolation (CompanyScopedPrisma extension)
- Audit logging for all user actions
- SSL/TLS encryption in production
- Environment variable protection

For security details, see [ARCHITECTURE.md#security-model](./ARCHITECTURE.md#security-model).

## Performance

- Database query optimization with Prisma
- Redis caching layer for frequently accessed data
- Elasticsearch for full-text search
- WebSocket real-time updates
- CDN asset delivery
- Request rate limiting (100 req/s per IP, 10 req/s for auth)

## License

ISC

## Contributing

Before contributing, read [TEAM-HANDBOOK.md](./TEAM-HANDBOOK.md) for:
- Code style guide
- Commit message conventions
- Pull request process
- Testing requirements
- Documentation standards
