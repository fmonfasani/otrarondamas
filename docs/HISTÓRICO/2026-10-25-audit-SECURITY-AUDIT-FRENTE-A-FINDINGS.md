# FRENTE A — AUDITORÍA DE SEGURIDAD MULTI-TENANT

**Fecha:** 21/10/2026  
**Status:** EN PROGRESO — HALLAZGOS CRÍTICOS ENCONTRADOS  

---

## Hallazgo 1: Token Type Validation Missing (CRÍTICO)

### Descripción
El JWT contiene un campo `type: 'usuario' | 'cliente'` (auth.types.ts:35) que diferencia identidades, pero **no existe guard global que lo valide**. Un token de Cliente (`type: 'cliente'`) puede pasar todos los guards de endpoints de staff (`pos-admin`).

### Evidencia
- **Archivo:** `apps/api/src/auth/auth.types.ts` línea 35
  ```typescript
  type: 'usuario' | 'cliente'; // RF-17: distinguishes whether sub is Usuario or Cliente
  ```
- **Guards globales:** `JwtAuthGuard` (auth/guards/jwt-auth.guard.ts)
  - ✓ Valida existencia y formato del JWT
  - ✗ **NO valida el campo `type`**
  - ✗ **NO rechaza tokens de `cliente` en endpoints de staff**

### Endpoints Afectados (Muestra)
| Endpoint | Guard | Validación Type |
|----------|-------|-----------------|
| `GET /clientes` | JwtAuthGuard (global) | ✗ NO |
| `POST /clientes` | JwtAuthGuard + RequirePermission | ✗ NO |
| `GET /catalogo/productos` | JwtAuthGuard | ✗ NO |
| `POST /inventario/movimientos` | JwtAuthGuard + RequirePermission | ✗ NO |
| `GET /caja/cajas` | JwtAuthGuard + RequirePermission | ✗ NO |

### Escenario de Explotación
1. Cliente (`type: 'cliente'`) obtiene JWT via `/auth/cliente/login` con `type: 'cliente'`
2. Cliente usa ese token en `Authorization: Bearer <token>` contra `GET /clientes`
3. JwtAuthGuard valida JWT (existe) pero NO valida `type`
4. `@CurrentUser()` extrae `user.type === 'cliente'`
5. `BusinessContextService.resolveForAuthenticatedUser(user)` **no valida que `type === 'usuario'`**
6. Endpoint ejecuta sin error; Cliente accede a lista de Clientes (dato sensible de administración)

### Test de Reproducción (Pseudocódigo)

```typescript
// En test/integration/security-token-type-validation.spec.ts
describe('Token Type Validation', () => {
  it('SHOULD REJECT: cliente token accessing /clientes (staff endpoint)', async () => {
    // 1. Generate cliente JWT with type: 'cliente'
    const clienteToken = jwt.sign({
      sub: 'cliente-123',
      type: 'cliente',
      empresaId: 'empresa-1',
      permisos: [],
      rol: 'ASISTENTE_LOCAL',
      estadoLegajo: 'APROBADO',
    }, JWT_SECRET);

    // 2. Send request to staff endpoint
    const response = await request(app.getHttpServer())
      .get('/clientes')
      .set('Authorization', `Bearer ${clienteToken}`);

    // 3. CURRENTLY: 200 OK (VULNERABLE)
    // EXPECTED: 401 Unauthorized or 403 Forbidden
    console.log('Response status:', response.status); // BUG: returns 200
  });

  it('SHOULD REJECT: cliente token accessing /inventario/movimientos', async () => {
    // Similar test for inventory endpoint
  });
});
```

### Impacto
- **Severidad:** CRÍTICA
- **Scope:** Todos los endpoints de staff (`pos-admin`)
- **Confidentiality:** Alta — Cliente puede leer datos administrativos (inventario, clientes, compras, caja)
- **Integrity:** Media — Cliente no puede mutar sin `@RequirePermission`, pero acceso de lectura ya es violation

### Mitigación Actual
- ✗ **NO EXISTE** validación de `type` a nivel global
- ✗ **NO EXISTE** decorador @RequireUserType() o equivalente
- ✓ `CompanyScopedPrismaService` aún filtra por tenant (BusinessContext), pero no es suficiente si el actor es de otra clase

### Riesgo Residual
**CRÍTICO NO MITIGADO.** Implementar guard global que valide `type` es urgente.

---

## Hallazgo 2: BusinessContextService No Valida Token Type

### Descripción
`BusinessContextService.resolveForAuthenticatedUser(user)` acepta un usuario autenticado pero **no valida que sea de tipo correcto** para la operación solicitada.

### Evidencia
- **Archivo:** `apps/api/src/business-context/business-context.service.ts`
- **Método:** `resolveForAuthenticatedUser(user: AuthenticatedUser)`
- **Línea:** (a determinar, pero sin `user.type` check)

### Mitigación Propuesta
Validación en dos niveles (NO hacer ambas, elegir UNA):

**Opción A: Guard Global de Type (RECOMENDADO)**
```typescript
// apps/api/src/auth/guards/token-type.guard.ts
@Injectable()
export class TokenTypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) return false; // No authenticated user

    const allowCustomer = this.reflector.getAllAndOverride<boolean>(
      ALLOW_CUSTOMER_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Staff endpoints (default): only Usuario
    if (!allowCustomer && user.type !== 'usuario') {
      throw new ForbiddenException('Cliente access to staff endpoint');
    }

    // Customer endpoints (@AllowCustomer): Cliente or Usuario (for testing)
    return true;
  }
}

// Aplicar como APP_GUARD en auth.module.ts
```

**Opción B: Validación en BusinessContextService (ALTERNATIVA)**
```typescript
// apps/api/src/business-context/business-context.service.ts
async resolveForAuthenticatedUser(user: AuthenticatedUser, requireType?: 'usuario' | 'cliente') {
  if (requireType && user.type !== requireType) {
    throw new ForbiddenException(`Endpoint requires type: '${requireType}', got: '${user.type}'`);
  }
  // ... rest of resolution
}
```

---

## Hallazgo 3: @AllowCustomer Decorator Incomplete

### Descripción
El decorador `@AllowCustomer()` marca endpoints como abiertos a Clientes, pero **no existe un guard global que lo procese**. Sin consumidor de ese metadato, el decorador es inerte.

### Evidencia
- **Archivo:** `apps/api/src/auth/decorators/allow-customer.decorator.ts`
- **Uso:** `auth/auth.customer.controller.ts` 
- **Consumidor:** NO EXISTE (grep -r ALLOW_CUSTOMER_KEY → no hits en guards)

### Riesgo
Si alguien agrega `@AllowCustomer()` a un endpoint, no afecta nada (el guard de tipo no existe). Si se agrega un guard de tipo sin considerar this, todos los endpoints bloqueados para Clientes aunque lleven el decorador.

---

## Hallazgo 4: CompanyScopedPrismaService Filters by BusinessContext, Not JWT

### Descripción
`CompanyScopedPrismaService` filtra todas las queries por `businessId` del contexto, **no del JWT**. Esto es intencionado (ver customers.controller.ts líneas 29-34), pero requiere que `BusinessContextService.resolveForAuthenticatedUser()` sea infalible.

### Evidencia
- **Archivo:** `apps/api/src/prisma/company-scoped-prisma.service.ts`
- **Patrón:** Todas las queries pasan por una extensión que agrega `where: { businessId: context.businessId }`
- **Implicación:** Si `user.type === 'cliente'`, pero `context.businessId` se resuelve correctamente, el Cliente accede a datos de su empresa, no de otra

### Vulnerabilidad Residual
**Baja en este punto**, pero expone que **la validación de tipo es la única barrera** que impide que un Cliente acceda a endpoints de staff de su misma empresa.

---

## Hallazgo 5: Four vs Two Controls — D-006 Discrepancy

### Descripción
D-006 reporta una discrepancia entre "cuatro controles de autorización" y "dos controles" implementados. Auditoría revela:

### Controles Actuales Encontrados
1. **JwtAuthGuard (global):** Valida JWT existe y es válido
2. **ApprovedDossierGuard (por endpoint):** Valida estado de Legajo
3. **RequirePermission (por endpoint):** Valida permisos del Usuario
4. **BusinessContextService (por endpoint):** Resuelve tenant del actor
5. **CompanyScopedPrismaService (global de datos):** Filtra queries por tenant

### Análisis
- **"Cuatro"**: Posiblemente se refiere a niveles conceptuales (JWT, Role, Permission, Tenant)
- **"Dos"**: Posiblemente se refiere a lo que se implementó en una fase anterior (JWT + Permission)
- **Realidad:** Hay 5 puntos de control, pero **FALTA Token Type Validation** que es crítico

### Resolución de D-006
D-006 status es "APPROVED — DERIVED / RECONSTRUCTED" pero "OPEN" — no especifica implementación. La decisión aprobada es:
> "Implementar validación robusta del tipo de token en todos los endpoints de la API para prevenir acceso entre identidades"

**Implementación pendiente:** Guard global + decorador + test

---

## Matriz de Endpoints y Controles

| Endpoint | JWT Valid | Type Check | Permission | Dossier | Tenant Filter | Riesgo |
|----------|-----------|-----------|------------|---------|---------------|--------|
| `GET /clientes` | ✓ | ✗ | - | ✓ | ✓ | **CRÍTICO** |
| `POST /clientes` | ✓ | ✗ | ✓ | ✓ | ✓ | **CRÍTICO** |
| `GET /catalogo/productos` | ✓ | ✗ | - | ✓ | ✓ | **CRÍTICO** |
| `POST /inventario/movimientos` | ✓ | ✗ | ✓ | ✓ | ✓ | **CRÍTICO** |
| `GET /caja/cajas` | ✓ | ✗ | ✓ | ✓ | ✓ | **CRÍTICO** |
| `POST /auth/cliente/login` | ✓ | - | - | - | - | N/A (public) |
| `POST /auth/login` | ✓ | - | - | - | - | N/A (public) |

---

## Priorización

| ID | Hallazgo | Severidad | Esfuerzo | Estado |
|---|----------|-----------|----------|--------|
| H1 | Token Type Validation Missing | CRÍTICA | Bajo | **SIN IMPLEMENTAR** |
| H2 | BusinessContextService Type Check | ALTA | Bajo | **SIN IMPLEMENTAR** |
| H3 | @AllowCustomer Guard Consumer | MEDIA | Bajo | **SIN IMPLEMENTAR** |
| H4 | CompanyScopedPrismaService Tenant Isolation | BAJA | N/A | ✓ Implementado |
| H5 | D-006 Implementation Gap | CRÍTICA | Medio | **ABIERTA** |

---

## Conclusión

**NO SE PUEDE AFIRMAR AISLAMIENTO MULTI-TENANT SEGURO.**

El aislamiento de datos por tenant (CompanyScopedPrismaService) está implementado, pero **falta el control de tipo de token** que es la barrera principal contra el acceso entre identidades. Un Cliente puede explotar esto para acceder a endpoints de staff de su propia empresa.

**Cambios no realizados en esta auditoría** (requieren decisión normativa y aprobación):
- ✗ No se agregó TokenTypeGuard (requiere D-006 aprobación definitiva)
- ✗ No se modificó BusinessContextService (espera a guard)
- ✗ No se implementó consumidor de @AllowCustomer (espera a guard)

**Recomendación:** Implementar TokenTypeGuard global como Fix mínimo para D-006.

---

**Auditoría realizada por:** Claude Code (Haiku)  
**Fecha:** 2026-10-21  
**Alcance:** Security, Authorization, Identity, Multi-Tenant Isolation
