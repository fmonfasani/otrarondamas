# SEGURIDAD P0: Validación Token Type Confusion — DELIVERABLE

**Status:** HALLAZGO CONFIRMADO POR CÓDIGO + TEST CREADO  
**Fecha:** 2026-10-21  
**Alcance:** Token type validation en endpoints de staff  

---

## Resumen Ejecutivo

La auditoría de seguridad FRENTE A identificó **H1: Token Type Validation Missing** como vulnerabilidad CRÍTICA. SEGURIDAD P0 ha:

1. ✓ **Confirmado el hallazgo por análisis de código** (sin ejecución contra BD por restricción de acceso)
2. ✓ **Creado test de reproducción** completo y documentado
3. ✓ **Identificado el punto de falla** exacto en la cadena de guards
4. ✓ **Propuesto mitigación mínima** compatible con contratos existentes
5. ✗ **No implementado cambios productivos** (según restricciones)

---

## 1. Cadena de Autenticación — Análisis de Código

### JWT Payload (auth.types.ts:35)
```typescript
interface JwtPayload {
  // ... other fields
  type: 'usuario' | 'cliente';  // ← CRITICAL: Distinguishes identity type
}
```

### JwtAuthGuard (guards/jwt-auth.guard.ts)
✓ **Existe:** Guard global registrado en `AUTH_GUARD`  
✓ **Valida:** Existencia y formato del JWT  
✗ **NO valida:** Campo `type` del payload  
✗ **Resultado:** Un Cliente (`type: 'cliente'`) puede obtener `request.user` válido

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [...]);
    if (isPublic) return true;
    return super.canActivate(context); // ← Solo valida JWT, NO el type
  }
}
```

### BusinessContextService (no valida type)
✓ **Resuelve:** `businessId` desde `Membership` (correcto)  
✗ **NO rechaza:** Clientes en endpoints de staff  
✗ **Implicación:** Si cliente puede pasar JwtAuthGuard, puede acceder a cualquier endpoint

---

## 2. Endpoints Afectados — Matriz Confirmada

| Endpoint | HTTP | Guard Chain | Type Check | Permiso | Acceso Cliente |
|----------|------|-------------|-----------|---------|----------------|
| `GET /clientes` | GET | JwtAuthGuard + ApprovedDossierGuard | ✗ | - | **VULNERABLE** |
| `POST /clientes` | POST | JwtAuthGuard + ApprovedDossierGuard + @RequirePermission | ✗ | ✓ | 403 (por permiso, no tipo) |
| `GET /catalogo/productos` | GET | JwtAuthGuard + ApprovedDossierGuard | ✗ | - | **VULNERABLE** |
| `POST /inventario/movimientos` | POST | JwtAuthGuard + ApprovedDossierGuard + @RequirePermission | ✗ | ✓ | 403 (por permiso) |
| `GET /caja/cajas` | GET | JwtAuthGuard + ApprovedDossierGuard | ✗ | - | **VULNERABLE** |

**Conclusión:** Endpoints SIN `@RequirePermission` son directamente accesibles a Clientes.  
Endpoints CON `@RequirePermission` están protegidos por el check de permisos, pero solo porque el Cliente no tiene `clientes.gestionar`, etc. — no porque se rechace su tipo de identidad.

---

## 3. Test de Reproducción (security-p0-token-type-validation.integration-spec.ts)

**Archivo:** [apps/api/test/integration/security-p0-token-type-validation.integration-spec.ts](apps/api/test/integration/security-p0-token-type-validation.integration-spec.ts)

### Estructura del Test

```typescript
describe('SECURITY P0 — Token Type Confusion (H1 Reproduction)', () => {
  // Fixtures: Usuario (internal) + Cliente (customer) del mismo Business

  describe('Baseline: Usuario access to staff endpoints', () => {
    it('Usuario GET /clientes → 200 OK (expected)');
    it('Usuario POST /clientes with permission → 201 OK (expected)');
  });

  describe('VULN H1: Cliente access to staff endpoints', () => {
    it('Cliente GET /clientes → should be 401/403, but is 200 (VULNERABLE)');
    it('Cliente POST /clientes → 403 (permission check blocks, not type check)');
  });

  describe('Baseline: Cliente access to customer endpoints', () => {
    it('Cliente can login → OK (expected)');
  });

  describe('Tenant Isolation', () => {
    it('Usuario from other Business → cannot access first Business resources (OK)');
  });

  describe('Authorization: Permission check', () => {
    it('Usuario without clientes.gestionar → 403 (expected)');
  });
});
```

### Test Execution Status

**Intento de ejecución:** Contra puerto 5501 (e2e-tests-db)  
**Resultado:** Database authentication failed (credenciales no disponibles)  
**Impacto:** Test no ejecutado, pero es reproducible si DB está disponible

**Comando para ejecutar en ambiente con DB:**
```bash
DATABASE_URL="postgresql://user:password@localhost:5501/otrarondamas?schema=public" \
JWT_SECRET=test-secret \
npx jest --config ./test/jest-e2e.json --runInBand \
  test/integration/security-p0-token-type-validation.integration-spec.ts
```

---

## 4. Puntos de Control Identificados

### Control 1: JwtAuthGuard (Global)
- ✓ Existe
- ✓ Valida JWT
- ✗ **FALLA:** No valida `type`

### Control 2: ApprovedDossierGuard (By endpoint)
- ✓ Existe
- ✓ Valida `estadoLegajo`
- ✗ **FALLA:** No valida `type`

### Control 3: @RequirePermission (By endpoint)
- ✓ Existe
- ✓ Valida permisos específicos
- ✗ No intenta validar `type` (el guard correspondiente no existe)

### Control 4: BusinessContextService
- ✓ Existe
- ✓ Resuelve tenant desde Membership
- ✗ **FALLA:** No valida que actor sea de tipo correcto para la operación

### Control 5: CompanyScopedPrismaService
- ✓ Filtra queries por `businessId`
- ✓ Previene acceso a otro tenant
- ✗ **NO cubre:** Aislamiento entre identidades (Usuario vs Cliente) del mismo tenant

---

## 5. D-006 Status & Decision Context

**D-006:** "¿Cómo se enforcing la validación de tipo de token en todos los endpoints...?"

**Status según documento:** APPROVED — DERIVED / RECONSTRUCTED, but **OPEN** (no implementation detail specified)

**Implicación:** La decisión está aprobada (nivel normativo), pero su implementación está abierta. Las opciones son:
1. Guard global de tipo
2. Validación en BusinessContextService
3. Decorador @RequireUserType() con guard correspondiente

---

## 6. Mitigación Propuesta

### Opción A: Guard Global de Type (RECOMENDADO)

```typescript
// apps/api/src/auth/guards/token-type.guard.ts
@Injectable()
export class TokenTypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) return false;

    const allowCustomer = this.reflector.getAllAndOverride<boolean>(
      ALLOW_CUSTOMER_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Staff endpoints (default): only Usuario
    if (!allowCustomer && user.type !== 'usuario') {
      throw new ForbiddenException('Cliente access to staff endpoint not allowed');
    }

    return true;
  }
}
```

**Ventajas:**
- Guard global, consistente
- Reutiliza metadato `@AllowCustomer` existente
- Fácil de depurar
- No requiere cambios en BusinessContextService

**Desventajas:**
- Requiere registro como APP_GUARD en auth.module.ts

### Opción B: Validación en BusinessContextService (Alternativa)

```typescript
async resolveForAuthenticatedUser(
  user: AuthenticatedUser,
  requireType?: 'usuario' | 'cliente'
) {
  if (requireType && user.type !== requireType) {
    throw new ForbiddenException(`Type '${requireType}' required, got '${user.type}'`);
  }
  // ... rest of resolution
}
```

**Ventajas:**
- Centralizado en un servicio

**Desventajas:**
- Requiere cambios en todos los endpoints
- Menos reutilizable

---

## 7. Estado Actual (Sin Cambios Productivos)

### Cambios Realizados
- ✓ Test de reproducción creado (`security-p0-token-type-validation.integration-spec.ts`)
- ✓ Hallazgo documentado en detalle

### Cambios NO Realizados
- ✗ TokenTypeGuard no agregado (pendiente aprobación D-006)
- ✗ BusinessContextService no modificado
- ✗ auth.module.ts no actualizado
- ✗ No se agregó decorador @RequireUserType()

### Protección de Estado Actual
- ✓ No se modificó código productivo
- ✓ 60 archivos modificados preexistentes, preservados
- ✓ 85 cambios totales intactos
- ✓ Sin commits, push, merge, deploys

---

## 8. Resultados de Pruebas

### Ejecución del Test
**Status:** No ejecutado contra base de datos (credenciales no disponibles)  
**Tipo:** Integration test, 7 casos de prueba  
**Preparación:** Fixtures, JWT signing, assertions, cleanup

### Casos Cubiertos
1. ✓ Usuario interno en /clientes → 200 (baseline)
2. ✓ Usuario interno POST /clientes → 201 (baseline)
3. ✓ **Cliente GET /clientes → 200 (VULNERABLE)**
4. ✓ Cliente POST /clientes → 403 (permiso, no tipo)
5. ✓ Cliente login → OK (baseline)
6. ✓ Usuario otra empresa → 404/403 (tenant isolation OK)
7. ✓ Usuario sin permisos → 403 (permission check OK)

---

## 9. Riesgos Residuales

### Si No Se Implementa Mitigación
- **Severidad:** CRÍTICA
- **Exposure:** Todos los endpoints GET/POST sin @RequirePermission
- **Data at Risk:** Información de administración (clientes, inventario, caja, catálogo)
- **Timeline:** Inmediato, explotable hoy

### Garantías Actuales
- ✓ CompanyScopedPrismaService filtra por tenant (previene cross-tenant access)
- ✓ @RequirePermission bloquea mutaciones sin permiso (previene writes sin autorización específica)
- ✗ **FALTA:** Barrera contra identidad incorrecta (Cliente usando endpoint de Usuario)

---

## 10. Siguiente Acción Única

**Decisión requerida del Owner:**

Elegir **UNA** de:
1. **Implementar TokenTypeGuard global** (Opción A) — Fix mínimo de D-006
2. **Refinar BusinessContextService** (Opción B) — Alternativa centralizada
3. **Mantener ABIERTO** — No corregir hasta que D-006 tenga especificación definitiva

**Recomendación técnica:** Opción A (Guard global) — alínea con el patrón existente de `@Public()` y `@AllowCustomer()`.

---

## Archivo de Entrega

**Test creado:** [security-p0-token-type-validation.integration-spec.ts](apps/api/test/integration/security-p0-token-type-validation.integration-spec.ts)

**Hallazgo original:** [SECURITY-AUDIT-FRENTE-A-FINDINGS.md](SECURITY-AUDIT-FRENTE-A-FINDINGS.md)

---

**Auditoría realizada por:** Claude Code (Haiku)  
**Fecha:** 2026-10-21  
**Riesgo identificado:** CRÍTICO NO MITIGADO  
**Decisión:** AWAITING OWNER (D-006 implementation choice)
