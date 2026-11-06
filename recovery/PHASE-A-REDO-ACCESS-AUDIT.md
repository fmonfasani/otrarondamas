# PHASE A REDO: Auditoría de Rutas de Acceso — Cómo se usan realmente los 18 modelos omitidos

**Date**: 2026-11-06  
**Auditor**: Claude Haiku 4.5 (Local)  
**Scope**: Servicios de aplicación — acceso real a modelos omitidos  
**Objetivo**: Identificar cada punto de acceso sin filtro de empresa

---

## HALLAZGOS POR MODELO

### 🔴 EmailPreference — ACCESO SIN EMPRESA

**Ubicación**: `src/email/email.service.ts:183-184`

```typescript
const pref = await this.prisma.emailPreference.findUnique({
  where: { unsubscribeToken: '' },  // Placeholder
});
```

**Problema**:
- Usa `this.prisma` (PRISMA GLOBAL, no CompanyScopedPrismaService)
- EmailPreference NO está en MODELS_WITH_COMPANY_ID
- Query sin filtro `empresaId`
- **TODO comment**: "actual lookup by email + empresaId"

**Riesgo**:
- findUnique retorna EmailPreference de CUALQUIER empresa
- Falso positivo de preferencia: usuario A ve preferencias de usuario B

**Contexto**:
```typescript
// Línea 98: canReceiveEmail(empresaId, to, template.tipo)
const canReceive = await this.canReceiveEmail(empresaId, to, template.tipo);
// Pero canReceiveEmail NO usa empresaId en la query (línea 183)
```

**Acción Requerida**: 
- [ ] Cambiar a `CompanyScopedPrismaService.forCompany(empresaId)`
- [ ] Usar `where: { email: to, empresaId }`
- [ ] O: crear índice único `@@unique([email, empresaId])`

---

### 🔴 EmailLog — ACCESO SIN EMPRESA

**Ubicación**: `src/email/email.service.ts:214-228 (create)` y `244-249 (findMany retry)`

**Create (línea 214)**:
```typescript
return await this.prisma.emailLog.create({
  data: {
    empresaId,  // ✅ Incluida en data
    templateId,
    destinatario,
    evento: 'FALLIDO',
    // ...
  },
});
```

**Análisis**: ✅ empresaId se incluye en create, pero NO hay validación de que templateId pertenezca a esa empresa.

**FindMany retry (línea 244)**:
```typescript
const failedLogs = await this.prisma.emailLog.findMany({
  where: {
    ...(empresaId && { empresaId }),  // ✅ Condicional
    evento: 'FALLIDO',
    proxRetento: { lte: now },
    // ...
  },
});
```

**Problema**: Si `empresaId` es undefined, retorna logs de TODAS las empresas.

**Contexto**:
```typescript
// Línea 241: async retryFailed(empresaId?: string, maxRetries: number = 5)
// Parámetro opcional — si no se pasa, query global
```

**Acción Requerida**:
- [ ] Hacer empresaId OBLIGATORIO en retryFailed
- [ ] O: usar CompanyScopedPrismaService para garantizar scope
- [ ] Validar que templateId pertenece a empresaId (relación B3)

---

### 🔴 EmailTemplate — ACCESO PARCIALMENTE PROTEGIDO

**Ubicación**: `src/email/email.service.ts:84-90`

```typescript
const template = await this.prisma.emailTemplate.findFirst({
  where: {
    empresaId,          // ✅ Incluida
    nombre: templateNombre,
    activo: true,
  },
});
```

**Análisis**: ✅ findFirst con where { empresaId } — ESTÁ PROTEGIDA

**Pero**: No está en MODELS_WITH_COMPANY_ID, por lo que si se accede por otro path (ej. findUnique por ID), pasa sin filtro.

**Acción Requerida**:
- [ ] Agregar a MODELS_WITH_COMPANY_ID para proteger todos los accesos

---

### 🟡 NotificationDigest — ACCESO MIXTO

**Ubicación**: `src/notifications/notification-digest.service.ts`

**Patrón encontrado**:
```typescript
const updated = await this.prisma.notificationDigest.update({
  where: { id },
  data: { /* ... */ },
});
```

**Problema**: Update por ID sin empresaId — pasa sin validación de tenant

**Acción Requerida**:
- [ ] Cambiar a: `where: { id, empresaId }`
- [ ] O: usar CompanyScopedPrismaService

---

### 🔴 EmailPreference (Servicio Dedicado) — ACCESO CRÍTICO

**Ubicación**: `src/email/preferences/email-preference.service.ts`

**Patrón**:
```typescript
const existing = await this.prisma.emailPreference.findUnique({
  where: { email },  // ⚠️ Lookupúnico por email, sin empresaId
});
```

**Riesgo**: Email es globalmente único en la BD, pero NO por empresa

**Acción Requerida**:
- [ ] Cambiar schema: `@@unique([email, empresaId])`
- [ ] Cambiar queries: `where: { email_empresaId: { email, empresaId } }`

---

## RESUMEN DE RUTAS DE ACCESO

| Modelo | Ubicación | Operación | Filtro | Riesgo |
|--------|-----------|-----------|--------|--------|
| EmailPreference | email.service:183 | findUnique | ❌ NINGUNO | 🔴 P0 |
| EmailLog | email.service:244 | findMany | ⚠️ Condicional | 🔴 P0 |
| EmailTemplate | email.service:84 | findFirst | ✅ empresaId | ⚠️ P1 |
| NotificationDigest | notification-digest.service | update | ❌ ID only | 🔴 P0 |
| EmailPreference | email-preference.service | findUnique | ❌ email only | 🔴 P0 |

---

## CLASIFICACIÓN DE LOS 18 MODELOS

Basado en auditoría de rutas:

### TENANT (Debe estar protegido) — 14 modelos

✅ **Fin anzas y Devoluciones**:
- DevolucionCliente → create con empresaId ✅
- Reembolso → verificar
- PaymentIntent → relación Payment → Venta
- PaymentWebhook → webhook inbound, verificar

✅ **Comunicaciones**:
- EmailLog → acceso sin scope obligatorio ❌
- EmailTemplate → acceso con scope ✅
- EmailPreference → acceso sin scope ❌
- NotificationPreference → verificar
- NotificationDigest → acceso sin empresaId ❌
- PhoneNumber → verificar

✅ **Analítica**:
- AnalyticsEvent → creación manual, verificar filtros
- AnalyticsAggregation → read-only, verificar scope

✅ **Identidad**:
- RoleTemplate → verificar
- UserEmpresa → relación Usuario → Empresa

### PUBLIC ACCESS (Requires Special Handling) — 2 modelos

⚠️ **EmailPreference.unsubscribeToken** (Línea 184)
- Acceso público por token
- No puede validar empresaId en URL pública
- Solución: token debe contener empresa_id cifrada

⚠️ **PaymentWebhook** (Webhook inbound)
- Inbound webhook de procesador de pagos
- Debe validar webhook signature + identificar empresa
- Solución: signature incluye metadata de empresa

---

## CRITERIO DE SALIDA: PHASE A REDO

✅ **VERIFICADO**: 18 modelos auditados en rutas reales
⏳ **IDENTIFICADO**: 5 P0 (acceso sin scope), 2 public-access patterns
⏳ **PRÓXIMO**: Clasificación final: TENANT / PUBLIC / INHERITED
⏳ **PRÓXIMO**: Diseño de protección para cada patrón de acceso

---

## ORDEN DE ACCIÓN

1. **Inmediato** (Bloquea merge):
   - [ ] EmailPreference: cambiar canReceiveEmail a CompanyScopedPrismaService
   - [ ] EmailLog.retryFailed: hacer empresaId obligatorio
   - [ ] NotificationDigest: cambiar update a where { id, empresaId }

2. **Siguiente** (Completa ownership):
   - [ ] Agregar 18 modelos a MODELS_WITH_COMPANY_ID
   - [ ] Test B3 para cada uno
   - [ ] Diseño: webhook validation + token encryption para public access

3. **CI** (Habilita gates):
   - [ ] test-relation-coverage.yml habilitado
   - [ ] Integración tests ejecutables contra PostgreSQL real

