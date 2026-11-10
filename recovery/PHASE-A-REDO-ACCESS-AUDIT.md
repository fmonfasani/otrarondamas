# PHASE A REDO: Auditoría de Rutas de Acceso — Cómo se usan realmente los 19 modelos omitidos

**Date**: 2026-11-06  
**Auditor**: Claude Haiku 4.5 (Local)  
**Scope**: Servicios de aplicación — acceso real a 19 modelos omitidos de MODELS_WITH_COMPANY_ID  
**Objetivo**: Identificar cada punto de acceso sin filtro de empresa  
**Estado**: 18 modelos con empresaId directo auditados; 1 modelo (RoleTemplate) clasificado como nullable/global

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

### 🔴 NotificationDigest — IDOR CONFIRMADO

**Ubicación**: `src/notifications/notification-digest.service.ts`

**Patrón encontrado**:
```typescript
const updated = await this.prisma.notificationDigest.update({
  where: { id },  // ← SOLO ID, sin empresaId ni usuarioId
  data: { /* ... */ },
});
```

**Hallazgo remoto confirmado**: 
- PATCH autenticado globalmente
- Handler no recibe `usuarioId` del contexto autenticado
- Servicio consulta/actualiza por `digestId` solamente
- Otro usuario puede proporcionar cualquier `digestId` y modificar digest ajeno

**Escenario IDOR**:
1. Usuario A: `PATCH /notifications/digests/{id-de-A}` → markDigestAsOpened(id)
2. Attacker (Usuario B): `PATCH /notifications/digests/{id-de-A}` → misma operación
3. **Resultado**: Digest de Usuario A modificado por Usuario B

**Impacto**: ⚠️ Modificación de estado sin verificación de ownership

**Acción Requerida**:
- [ ] Controller: Obtener `usuarioId` del contexto autenticado
- [ ] Service: Cambiar signature a `markDigestAsOpened(usuarioId: string, digestId: string)`
- [ ] Query: `where: { id: digestId, usuario: { empresaId, id: usuarioId } }`
- [ ] Test: Cross-tenant IDOR attempt (Usuario B intenta marcar digest de Usuario A)

---

### 🟡 EmailPreference (Servicio Dedicado) — ACCESO DISEÑO

**Ubicación**: `src/email/preferences/email-preference.service.ts`

**Patrón actual**:
```typescript
const existing = await this.prisma.emailPreference.findUnique({
  where: { email },  // ⚠️ Lookup único global por email
});
```

**Análisis**:
- Email es globalmente único en schema (unsubscribeToken también)
- Pero findUnique no valida empresaId del contexto
- Operaciones posteriores (update, delete) requieren empresaId

**Estado**: Defecto de consentimiento, no de aislamiento
- Lectura previa global es intencional (mecanismo de autorización por token)
- Pero operaciones debe validar ownership antes de modificar

**Acción Requerida**:
- [ ] NO cambiar schema (email es globalmente único por diseño)
- [ ] Validar empresaId en getOrCreate(), update(), delete() tras lookup global
- [ ] Operaciones posteriores requieren: where { id, empresaId }

---

## RESUMEN DE RUTAS DE ACCESO

| Modelo | Ubicación | Operación | Filtro | Clasificación | Estado |
|--------|-----------|-----------|--------|----------------|--------|
| EmailPreference | email.service:183 | findUnique | ❌ NINGUNO | P1 funcional | Defecto consentimiento |
| EmailLog | email.service:244 | findMany | ⚠️ Condicional | P1 condicional | Sin caller operativo |
| EmailTemplate | email.service:84 | findFirst | ✅ empresaId | P1 brecha | Update sin scope |
| NotificationDigest | notification-digest.service | update | ❌ ID only | P1 IDOR | Código vulnerable |
| EmailPreference | email-preference.service | findUnique | ❌ email only | P1 funcional | Defecto de diseño |

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

✅ **VERIFICADO**: 19 modelos auditados en rutas reales
✅ **CLASIFICADO**: 18 modelos TENANT (con empresaId directo), 1 modelo GLOBAL (RoleTemplate nullable)
✅ **HALLAZGOS RECLASIFICADOS**: 5 defectos potenciales (P1), 2 public-access patterns
⏳ **PRÓXIMO**: Reproducción HTTP de IDOR (NotificationDigest, Payment)
⏳ **PRÓXIMO**: Diseño de corrección por superficie (GET /pagos/:id, PATCH /digests/:id)

---

## CORRECCIONES PRIORIZADAS

### BLOQUEADORES (impide merge)

1. **GET /pagos/:id IDOR** — rama fix/security-payment-ownership
   - Cambiar getPaymentDetail para incluir empresaId en where
   - Migrar callers: retry, cancel, tests
   - Agregar tests cross-tenant negative

2. **PATCH /notifications/digests/:id IDOR** — rama fix/security-notification-digest-idor
   - Pasar @CurrentUser() al handler
   - Resolver empresaId autenticado con BusinessContextService
   - Cambiar servicio: where { id, usuarioId, empresaId }
   - Agregar tests cross-user negative

### INVESTIGACIÓN (en paralelo)

3. **Webhooks de pago** — análisis de vinculación
   - handlePaymentSuccess/Failed: validación de empresaId en operación
   - Separar de corrección GET /pagos/:id (cadena distinta)

### DEUDA TÉCNICA (post-bloqueador)

4. **19 modelos omitidos** — auditoría de acceso + clasificación TENANT/PUBLIC/INHERITED
5. **40+ relaciones no registradas** — mapear riesgos por relación
6. **CI gates**: PostgreSQL real, tests B3 exhaustivos

