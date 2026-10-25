# Frequently Asked Questions (FAQs)

Common questions about Wapsell platform development, deployment, and usage.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development](#development)
3. [Testing](#testing)
4. [Database](#database)
5. [Deployment](#deployment)
6. [Performance](#performance)
7. [Security](#security)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### Q: What do I need to develop on Wapsell?

A: You need:
- Node.js 18.x or higher
- npm 9.x or higher
- Docker & Docker Compose
- Git
- A code editor (VS Code recommended)

### Q: How long does initial setup take?

A: About 15-20 minutes:
- Clone repo: 2 minutes
- npm install: 5-10 minutes
- Docker compose up: 2 minutes
- Run migrations: 1 minute
- Test run: 2 minutes

### Q: Can I develop on Windows?

A: Yes! Use:
- Windows Subsystem for Linux (WSL2) for Docker support
- Or Docker Desktop for Windows
- Or develop on a Linux VM

### Q: What's the recommended editor setup?

A: VS Code with extensions:
- ESLint
- Prettier
- Prisma
- Docker

See [TEAM-HANDBOOK.md](./TEAM-HANDBOOK.md#recommended-ide-extensions-vs-code) for full list.

## Development

### Q: How do I start the development server?

A: Two terminals:

```bash
# Terminal 1: Start dependencies
docker-compose up

# Terminal 2: Start API
npm run dev
```

API runs at `http://localhost:3000`

### Q: How do I create a new feature?

A: Follow the git workflow:

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and test
npm test

# 3. Push
git push origin feature/my-feature

# 4. Create PR on GitHub
# 5. Get review
# 6. Merge to main
```

See [TEAM-HANDBOOK.md#git-workflow](./TEAM-HANDBOOK.md#git-workflow) for details.

### Q: How do I add a new API endpoint?

A: Create module files:

```bash
# 1. Create module directory
mkdir -p apps/api/src/myfeature/{dto,entities,test}

# 2. Create files
touch apps/api/src/myfeature/{myfeature.controller.ts,myfeature.service.ts,myfeature.module.ts}

# 3. Update schema.prisma if needed
# 4. Create migration
npm run db:new-migration -- add_myfeature

# 5. Add controller, service, module
# 6. Add tests
# 7. Test endpoint
curl http://localhost:3000/api/myfeature
```

### Q: How do I debug TypeScript?

A: Use VS Code debugger:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

Then press F5 to start debugging.

## Testing

### Q: How do I run tests?

A: Multiple options:

```bash
# Run all tests
npm test

# Run specific file
npm test -- users.service.spec.ts

# Watch mode (re-runs on changes)
npm test -- --watch

# With coverage
npm test -- --coverage
```

### Q: How do I write a test?

A: Use NestJS testing utilities:

```typescript
describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MyService]
    }).compile();
    service = module.get<MyService>(MyService);
  });

  it('should work', async () => {
    const result = await service.doSomething();
    expect(result).toEqual('expected value');
  });
});
```

See [TEAM-HANDBOOK.md#testing-standards](./TEAM-HANDBOOK.md#testing-standards) for complete guide.

### Q: What's the code coverage target?

A: 
- Unit tests: > 80%
- Integration tests: > 60%
- E2E tests: > 40%
- Overall: > 75%

Run with: `npm test -- --coverage`

### Q: How do I run a specific test suite?

A: Use jest patterns:

```bash
# Run auth tests
npm test -- auth

# Run auth service tests only
npm test -- auth.service

# Run integration tests
npm run test:integration
```

## Database

### Q: How do I check the database schema?

A: Open Prisma Studio:

```bash
npm run db:studio
# Opens http://localhost:5555
```

Visual editor for database tables, records, and relationships.

### Q: How do I add a new table?

A: 

1. Update `apps/api/prisma/schema.prisma`
2. Create migration:
   ```bash
   npm run db:new-migration -- add_mytable
   ```
3. Apply migration:
   ```bash
   npm run db:migrate
   ```

### Q: How do I fix a migration error?

A: If migration fails:

```bash
# Check status
npx prisma migrate status

# Reset and re-apply (development only)
npx prisma migrate reset

# Or manually fix and deploy
npx prisma migrate deploy
```

See [TROUBLESHOOTING.md#migration-errors](./TROUBLESHOOTING.md#migration-errors) for details.

### Q: How do I seed the database?

A: Use seeding script:

```bash
npm run db:seed
```

Populates database with sample data for development.

### Q: How do I backup the database?

A: 

```bash
# Create backup
docker-compose exec db pg_dump -U user otrarondamas | gzip > backup.sql.gz

# Restore
gzip -d < backup.sql.gz | docker-compose exec -i db psql -U user otrarondamas
```

For production, see [DEPLOYMENT.md#backup--disaster-recovery](./DEPLOYMENT.md#step-8-backup--disaster-recovery).

### Q: How do I write database queries?

A: Always use Prisma (no raw SQL unless necessary):

```typescript
// Bad: Raw SQL (vulnerable to injection)
const users = await prisma.$queryRaw`SELECT * FROM usuario WHERE email = ${email}`;

// Good: Prisma
const users = await prisma.usuario.findMany({
  where: { email }
});

// With relations
const users = await prisma.usuario.findMany({
  include: { empresa: true }
});

// With filtering and pagination
const users = await prisma.usuario.findMany({
  where: {
    email: { contains: 'example.com' },
    activo: true
  },
  skip: 0,
  take: 20,
  orderBy: { createdAt: 'desc' }
});
```

## Deployment

### Q: How do I deploy to production?

A: See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete guide. Quick summary:

1. Setup Hetzner VPS
2. Install Docker & dependencies
3. Clone repo and configure .env
4. Get SSL certificate
5. Start docker-compose
6. Run migrations
7. Verify health checks

### Q: What's the difference between staging and production?

A:
- **Staging**: On a VPS, uses production config, for final testing
- **Production**: Live environment serving real users, with monitoring and backups

### Q: How do I update code in production?

A: Use the deployment procedure:

```bash
# 1. Push code to main branch
git push origin main

# 2. GitHub Actions automatically tests
# 3. If tests pass, manually approve deployment

# 4. Or manual deployment
cd /opt/wapsell
git pull origin main
docker-compose build api
docker-compose up -d api
docker-compose exec api npm run db:migrate
```

### Q: How do I rollback a bad deployment?

A: Use rollback procedure:

```bash
cd /opt/wapsell

# Find previous good commit
git log --oneline -5

# Revert to previous version
git reset --hard <previous-commit>

# Restart
docker-compose build api
docker-compose up -d api
```

See [DEPLOYMENT.md#rollback-procedure](./DEPLOYMENT.md#rollback-procedure) for details.

### Q: What happens to data during deployment?

A: No data loss:
- Database persists in Docker volume
- Migrations applied incrementally
- No truncation or reset

## Performance

### Q: Why is API slow?

A: Common causes:
1. N+1 queries - use `include` or `select` in Prisma
2. Large result sets - use pagination (`skip` and `take`)
3. Missing database indexes - run `ANALYZE` and check query plans
4. External API calls - implement caching or async processing
5. High memory usage - check for memory leaks

See [TROUBLESHOOTING.md#slow-api-responses](./TROUBLESHOOTING.md#slow-api-responses).

### Q: How do I cache data?

A: Use Redis:

```typescript
@Cacheable('products:all', 3600) // Cache for 1 hour
async getProducts() {
  return prisma.producto.findMany();
}

// Manually
const cached = await redis.get('key');
if (cached) return cached;
const data = await expensiveOperation();
await redis.set('key', data, 3600);
return data;
```

### Q: How do I monitor performance?

A: Check metrics:

```bash
# API response times
curl -w "@curl-format.txt" http://localhost:3000/api/endpoint

# Database performance
docker logs wapsell-api | grep "slow query"

# Memory usage
docker stats

# Real-time metrics
watch docker stats
```

For production monitoring, see [RUNBOOKS.md#monitoring--alerting](./RUNBOOKS.md#monitoring--alerting).

## Security

### Q: How do I protect an endpoint?

A: Use NestJS guards:

```typescript
@Get(':id')
@UseGuards(JwtAuthGuard) // Requires login
@UseGuards(PermissionGuard('view:users')) // Requires permission
async getUser(@Param('id') id: string) {
  return this.userService.getById(id);
}
```

### Q: How do I validate user input?

A: Use DTOs with validation:

```typescript
import { IsEmail, MinLength, IsPhoneNumber } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsPhoneNumber()
  telefono: string;
}

// In controller
@Post()
async create(@Body() dto: CreateUserDto) {
  // Validation happens automatically
}
```

### Q: How do I prevent SQL injection?

A: Always use Prisma (never raw SQL):

```typescript
// Bad: Vulnerable
const users = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`;

// Good: Safe
const user = await prisma.usuario.findUnique({
  where: { id }
});
```

### Q: How do I handle sensitive data?

A: 
1. Never log passwords or tokens
2. Use HTTPS in production
3. Store hashed passwords
4. Don't expose sensitive fields in API responses
5. Use environment variables for secrets

```typescript
// Bad: Logs password
console.log('User:', user);

// Good: Redact sensitive fields
console.log('User created:', { id: user.id, email: user.email });
```

### Q: How do I ensure users only see their company's data?

A: Use Prisma extension:

```typescript
// Automatically scoped to empresaId
const orders = await prisma.venta.findMany({
  // Extension adds: where: { empresaId: user.empresaId }
});
```

See [ARCHITECTURE.md#multi-tenant-isolation](./ARCHITECTURE.md#multi-tenant-isolation).

## Troubleshooting

### Q: Docker container won't start

A: Check logs:

```bash
docker logs wapsell-api
docker-compose logs api

# Common issues:
# 1. Port already in use
lsof -i :3000

# 2. Missing env vars
cat apps/api/.env.local | grep DATABASE_URL

# 3. Out of memory
docker stats
```

See [TROUBLESHOOTING.md#container-wont-start](./TROUBLESHOOTING.md#container-wont-start).

### Q: Database connection failed

A: Verify database is running:

```bash
docker-compose ps db

# If not running
docker-compose up -d db

# Test connection
docker-compose exec db psql -U user -c "SELECT 1;"
```

See [TROUBLESHOOTING.md#database-connection-refused](./TROUBLESHOOTING.md#database-connection-refused).

### Q: Tests failing

A: Diagnosis steps:

```bash
# Run single test
npm test -- single-file.spec.ts

# With verbose output
npm test -- --verbose

# With debugging
DEBUG=* npm test

# Check environment
cat apps/api/.env.local | grep TEST
```

### Q: High memory usage

A: 

```bash
# Monitor memory
docker stats wapsell-api

# If > 1GB, restart
docker-compose restart api

# Check for memory leaks
npm install clinic
clinic doctor -- npm start
```

See [TROUBLESHOOTING.md#high-memory-usage](./TROUBLESHOOTING.md#high-memory-usage).

### Q: API returns 500 error

A: Check logs:

```bash
docker logs wapsell-api --tail 50
docker logs wapsell-api -f  # Follow logs

# Look for:
# - Database connection errors
# - Unhandled exceptions
# - Missing environment variables
```

## More Help

- **Documentation**: See docs/ directory
- **GitHub Issues**: https://github.com/fmonfasani/otrarondamas/issues
- **GitHub Discussions**: https://github.com/fmonfasani/otrarondamas/discussions
- **Email**: support@wapsell.com

## Quick Reference

### Common Commands

```bash
# Development
npm run dev          # Start API
npm test            # Run tests
npm run lint        # Check code style
npm run format      # Auto-format code

# Database
npm run db:migrate  # Apply migrations
npm run db:studio   # Open database editor
npm run db:seed     # Seed sample data
npm run db:reset    # Reset database (dev only)

# Docker
docker-compose up -d        # Start all services
docker-compose down         # Stop all services
docker-compose ps           # List running containers
docker logs wapsell-api -f  # View API logs

# Deployment
npm run build       # Build for production
git push            # Push changes
# CI/CD runs automatically on main branch
```

### Useful URLs

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| API Health | http://localhost:3000/health |
| Prisma Studio | http://localhost:5555 |
| API Docs | http://localhost:3000/api-docs |

### Documentation Files

| File | Purpose |
|------|---------|
| README.md | Project overview |
| ARCHITECTURE.md | System design |
| API-REFERENCE.md | REST API docs |
| DEPLOYMENT.md | Production setup |
| TROUBLESHOOTING.md | Problem solutions |
| RUNBOOKS.md | Operations procedures |
| TEAM-HANDBOOK.md | Development guide |
| CHANGELOG.md | Release notes |
| FAQS.md | This file |
