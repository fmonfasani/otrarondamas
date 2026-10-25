# Team Handbook & Contributing Guide

Contributing guidelines and development standards for Wapsell platform.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Code Standards](#code-standards)
4. [Git Workflow](#git-workflow)
5. [Testing Standards](#testing-standards)
6. [Code Review Process](#code-review-process)
7. [Documentation](#documentation)
8. [Performance Guidelines](#performance-guidelines)
9. [Security Practices](#security-practices)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Docker & Docker Compose
- Git
- PostgreSQL 15 (optional, runs in Docker)
- VS Code or similar IDE

### First Day Setup

1. **Clone Repository**
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
   # Edit as needed for your machine
   ```

4. **Start Development Stack**
   ```bash
   docker-compose up -d  # Start database and dependencies
   npm run dev           # Start API server
   ```

5. **Verify Setup**
   ```bash
   curl http://localhost:3000/health
   # Should return: {"status":"ok"}
   ```

6. **Run Tests**
   ```bash
   npm test
   # All tests should pass
   ```

## Development Setup

### Recommended IDE Extensions (VS Code)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "ms-dotnettools.vscode-dotnet-runtime",
    "ms-vscode.makefile-tools",
    "ms-azuretools.vscode-docker"
  ]
}
```

Install with:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
# ... repeat for others
```

### Development Workflow

```bash
# 1. Start development server (watches for changes)
npm run dev

# 2. Run tests in watch mode
npm test -- --watch

# 3. In another terminal, run specific test file
npm test -- apps/api/src/sales/sales.service.spec.ts --watch

# 4. Check linting
npm run lint

# 5. Format code
npm run format

# 6. Build for production
npm run build
```

### Database Workflow

```bash
# Create new migration after schema changes
npm run db:new-migration -- <migration_name>
# Example: npm run db:new-migration -- add_loyalty_field

# Apply pending migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Open Prisma Studio (visual database editor)
npm run db:studio

# Reset database (development only, loses all data)
npm run db:reset
```

## Code Standards

### TypeScript Configuration

- Target: ES2020
- Strict mode: enabled
- Module: commonjs
- No implicit any

### Naming Conventions

```typescript
// Files
- controllers: *.controller.ts
- services: *.service.ts
- tests: *.spec.ts
- entities: *.entity.ts
- DTOs: *.dto.ts
- interfaces: *.interface.ts

// Classes
export class UserService { }
export class UserController { }

// Functions
export const getUserById = () => { };

// Constants
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_TIMEOUT = 5000;

// Private members
private _cache: Map<string, any>;
```

### File Organization

```
src/
├── users/
│   ├── users.controller.ts        # HTTP endpoints
│   ├── users.service.ts           # Business logic
│   ├── users.module.ts            # NestJS module
│   ├── entities/
│   │   └── user.entity.ts         # Database entity
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   └── test/
│       ├── users.service.spec.ts
│       └── users.controller.spec.ts
```

### Code Style Guide

**Bad**:
```typescript
// Too long, hard to read
async function processUserOrderAndSendConfirmationEmailAndUpdateInventoryAndLogActivity() {
  // 500 lines of code
}

// Global state
let globalCache = {};

// No error handling
const data = await database.query('SELECT * FROM users');

// Magic numbers
if (price * 1.21 > 1000) { }
```

**Good**:
```typescript
// Single responsibility, well-named
async function processUserOrder(userId: string) {
  const order = await this.createOrder(userId);
  await this.sendConfirmationEmail(order);
  await this.updateInventory(order);
  await this.logActivity(userId, 'ORDER_CREATED', { orderId: order.id });
  return order;
}

// Injected dependencies
constructor(private readonly cache: CacheService) { }

// Error handling
try {
  const data = await database.query('SELECT * FROM users');
} catch (error) {
  this.logger.error('Failed to fetch users', error);
  throw new DatabaseException('User query failed');
}

// Constants
const TAX_RATE = 0.21;
if (price * TAX_RATE > 1000) { }
```

### ESLint & Prettier

```bash
# Format code (automatic)
npm run format

# Check linting issues
npm run lint

# Fix linting issues automatically
npm run lint -- --fix
```

Configuration (`.eslintrc.json`):
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/explicit-function-return-types": "warn",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

### Comments & Documentation

```typescript
/**
 * Fetches user by ID from database.
 * 
 * @param userId - The unique identifier of the user
 * @returns Promise containing user data or null if not found
 * @throws {DatabaseException} If database connection fails
 * 
 * @example
 * const user = await service.getUserById('user-123');
 */
async getUserById(userId: string): Promise<User | null> {
  // Implementation
}

// TODO: Refactor this after API contract is finalized (ref: DECISION-042)
// FIXME: This n+1 query needs optimization (see PR #123)
// NOTE: This behavior matches legacy system for backward compatibility
```

## Git Workflow

### Branch Naming

```bash
feature/p13-1-i18n          # Feature branch: feature/<project>-<task>
bugfix/login-redirect       # Bug fix: bugfix/<description>
hotfix/security-patch       # Urgent: hotfix/<description>
chore/update-deps           # Maintenance: chore/<description>
```

### Commit Messages

Format: `<type>(<scope>): <subject>`

```bash
# Examples
feat(auth): add JWT token refresh endpoint
fix(inventory): prevent negative stock quantities
docs(api): update payment webhook documentation
style(users): format code with prettier
refactor(orders): simplify status validation
perf(search): add elasticsearch caching
test(payments): add Stripe webhook tests
chore(deps): update NestJS to 10.1.0

# Longer commit with body
feat(analytics): add revenue reporting dashboard

- Calculate daily/weekly/monthly revenue
- Support filtering by date range
- Add CSV export functionality
- Include tax calculations

Closes #245
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Pull Request Process

1. **Before Creating PR**
   ```bash
   # Update from main
   git fetch origin main
   git rebase origin/main
   
   # Run full test suite
   npm test
   
   # Check linting
   npm run lint -- --fix
   
   # Build to verify no errors
   npm run build
   ```

2. **Create PR**
   ```bash
   git push origin feature/<your-feature>
   # Go to GitHub and create PR
   ```

3. **PR Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests added/updated
   - [ ] Manual testing completed
   
   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Comments added for complex logic
   - [ ] Documentation updated
   - [ ] No console.logs or debug code
   - [ ] Tests pass locally
   - [ ] No new warnings generated
   
   ## Screenshots (if applicable)
   Add screenshots of UI changes
   
   ## Related Issues
   Closes #123
   ```

4. **Code Review**
   - Minimum 1 approval required
   - All CI checks must pass
   - Address all feedback before merging

5. **Merge**
   ```bash
   # Use "Squash and merge" for feature branches
   # This keeps history clean
   ```

### Revert Commits

If a commit needs to be reverted:

```bash
# Find commit to revert
git log --oneline -10

# Create new commit that reverts it
git revert <commit-hash>

# Push
git push origin feature/<branch>
```

## Testing Standards

### Test Structure

```typescript
// users.service.spec.ts
describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  // Setup before each test
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserService, UserRepository]
    }).compile();
    
    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
  });

  // Test suite for specific function
  describe('getUserById', () => {
    it('should return user when exists', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = { id: userId, email: 'user@example.com' };
      jest.spyOn(repository, 'findById').mockResolvedValue(mockUser);

      // Act
      const result = await service.getUserById(userId);

      // Assert
      expect(result).toEqual(mockUser);
      expect(repository.findById).toHaveBeenCalledWith(userId);
    });

    it('should return null when user not found', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      // Act
      const result = await service.getUserById('nonexistent');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      // Arrange
      jest.spyOn(repository, 'findById')
        .mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(service.getUserById('user-123'))
        .rejects
        .toThrow('DB Error');
    });
  });
});
```

### Test Coverage Goals

| Category | Target |
|----------|--------|
| Unit tests | > 80% |
| Integration tests | > 60% |
| E2E tests | > 40% |
| Overall | > 75% |

### Running Tests

```bash
# All tests
npm test

# Specific file
npm test -- users.service.spec.ts

# Watch mode
npm test -- --watch

# With coverage
npm test -- --coverage

# Integration tests only
npm run test:integration

# E2E tests
npm run test:e2e
```

## Code Review Process

### What Gets Reviewed

1. **Correctness**
   - Does code do what PR claims?
   - Are edge cases handled?
   - Is error handling present?

2. **Design**
   - Is architecture sound?
   - Does it fit existing patterns?
   - Could it be simpler?

3. **Testing**
   - Are tests comprehensive?
   - Do tests verify the feature?
   - Are edge cases tested?

4. **Performance**
   - Any N+1 queries?
   - Unnecessary data transfers?
   - Memory leaks?

5. **Security**
   - Input validation?
   - Authorization checks?
   - No sensitive data exposure?

6. **Documentation**
   - Comments for complex logic?
   - API documentation updated?
   - README updated?

### Review Checklist (for reviewers)

```markdown
- [ ] Code builds without errors
- [ ] All tests pass
- [ ] No console.logs or debug code
- [ ] No secrets or credentials exposed
- [ ] Error handling present
- [ ] SQL queries optimized (no N+1)
- [ ] Database migrations included (if needed)
- [ ] Documentation updated
- [ ] Follows code standards
- [ ] TypeScript strict mode compliant
```

## Documentation

### README Updates

Update `README.md` if PR:
- Adds new feature
- Changes API contract
- Updates setup instructions
- Fixes known issue

### API Documentation

Use JSDoc comments for all public APIs:

```typescript
/**
 * Creates a new sales order
 * 
 * @param createSaleDto - Order creation data
 * @param user - Authenticated user context
 * @returns Created sales order with items
 * 
 * @throws {ValidationException} If order data invalid
 * @throws {InsufficientStockException} If stock unavailable
 * 
 * @example
 * const order = await service.create({
 *   clienteId: 'client-123',
 *   items: [{ productoId: 'prod-1', cantidad: 5 }]
 * }, user);
 */
async create(
  createSaleDto: CreateSaleDto,
  @Req() user: RequestUser
): Promise<SaleDto> {
  // implementation
}
```

### Architecture Decisions

For significant changes, document decision:

```markdown
# Architecture Decision Record (ADR)

## Title: Use Prisma ORM for Database Access

## Status: Accepted

## Context
We needed to choose an ORM for PostgreSQL access...

## Decision
We chose Prisma because:
- Type-safe queries
- Auto-generated migrations
- Excellent TypeScript support
- Active community

## Consequences
- Learning curve for team
- Better developer experience
- Compile-time query validation
- Slightly larger runtime overhead

## See Also
- Previous decision: ADR-001 (Database choice)
- Related: ARCHITECTURE.md#database-layer
```

## Performance Guidelines

### N+1 Query Prevention

**Bad**:
```typescript
// Fetches orders, then iterates to fetch clients (N+1)
const orders = await prisma.venta.findMany();
for (const order of orders) {
  order.cliente = await prisma.cliente.findUnique({
    where: { id: order.clienteId }
  });
}
```

**Good**:
```typescript
// Single query with relation loaded
const orders = await prisma.venta.findMany({
  include: { cliente: true }
});
```

### Pagination

Always paginate large result sets:

```typescript
// Bad: Could return 10,000+ records
const products = await prisma.producto.findMany();

// Good: Limit results
const products = await prisma.producto.findMany({
  skip: (page - 1) * limit,
  take: limit
});
```

### Caching

Use cache for frequently accessed data:

```typescript
@Cacheable('productos:list', 3600) // 1 hour TTL
async getProducts(): Promise<Producto[]> {
  return prisma.producto.findMany();
}
```

## Security Practices

### Input Validation

Always validate user input:

```typescript
// Define DTO with validation
class CreateUserDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Password must contain uppercase' })
  password: string;

  @IsPhoneNumber()
  telefono: string;
}

// Use in controller
@Post()
async create(@Body() createUserDto: CreateUserDto) {
  // DTO guarantees valid data
}
```

### Authorization

Check permissions in guards and services:

```typescript
// Controller level
@Delete(':id')
@UseGuards(JwtAuthGuard, PermissionGuard('delete:usuario'))
async delete(@Param('id') userId: string) {
  return this.userService.delete(userId);
}

// Service level
async delete(userId: string, currentUser: User) {
  if (!currentUser.can('delete:usuario')) {
    throw new ForbiddenException();
  }
  // Rest of implementation
}
```

### Sensitive Data

Never log or expose sensitive data:

```typescript
// Bad: Logs password
console.log('User created:', { email, password });

// Good: Redact sensitive fields
console.log('User created:', { email, id });
```

### SQL Injection Prevention

Always use parameterized queries:

```typescript
// Bad: String concatenation
const query = `SELECT * FROM users WHERE email = '${email}'`;

// Good: Parameterized (Prisma handles this)
const user = prisma.usuario.findUnique({
  where: { email }
});
```

## Getting Help

- **Questions**: Use GitHub Discussions
- **Bugs**: File GitHub Issues with reproduction steps
- **Architecture**: Post in team Slack channel
- **Code Review**: Tag maintainers in PR
- **Onboarding**: Schedule sync with team lead

## Code of Conduct

- Be respectful in reviews
- Assume good intent
- Help others learn
- Share knowledge freely
- No harassment or discrimination
