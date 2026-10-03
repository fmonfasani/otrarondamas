# WAPSELL — IDENTITY & TENANCY
## TECHNICAL SPECIFICATION BASELINE v0.1

**Estado:** DRAFT — TECHNICAL SPECIFICATION / NOT APPROVED  
**Fecha:** 2026-10-01  
**Dominio:** Identity & Tenancy  
**Precedencia:** Requirements → Decisions → TO-BE  
**Propósito:** traducir el TO-BE conceptual reconciliado a requisitos técnicos determinables, separando reglas ya cerradas de decisiones de implementación todavía abiertas.

> Este documento no autoriza cambios de código, schema, datos, infraestructura ni migraciones.
> Las opciones técnicas marcadas como PROPOSED son propuestas para evaluación, no decisiones aprobadas.

---

## 1. Alcance

Este documento cubre técnicamente:

- User global;
- Business;
- Membership;
- Customer ↔ User;
- Business Context;
- Authentication;
- Authorization;
- Tenant Isolation;
- email globalmente único;
- compatibilidad de sesiones legacy;
- transición Empresa → Business.

Fuera de alcance:

- Commerce;
- Messaging;
- Branding;
- modelo detallado de roles/permisos;
- implementación de onboarding;
- contratos API finales;
- schema definitivo;
- migraciones ejecutables;
- código.

---

## 2. Fuente normativa

### Cerrado

| Regla | Autoridad |
|---|---|
| Business = unidad canónica de tenancy | D-001 |
| User global | D-002 |
| User ↔ Business N:N mediante Membership | D-002 |
| Customer independiente de User | D-002-bis |
| Roles/permisos pertenecen a Membership | D-005 |
| Authorization requiere contexto Business + Membership + autorización | D-006 |
| User email globalmente único | OR-002-C / A7 |
| Empresa → Business como destino persistente | P1-A |
| Transición incremental y temporal | OR-002-B |
| Compatibilidad legacy temporal | OR-002-E |
| Implementación solo después de especificación aprobada | OR-002-F / P5-B |

### Abierto

Los siguientes elementos no tienen todavía una decisión técnica aprobada:

- modelo físico;
- lifecycle de Membership;
- catálogo final de roles;
- catálogo final de permisos;
- Business Context/switching;
- claims;
- sesión y revocación;
- mecanismo de tenant isolation;
- mecanismo de authorization enforcement;
- Customer ↔ User matching;
- migración física;
- cutover;
- rollback;
- onboarding;
- administración SaaS.

---

## 3. Requisitos técnicos derivados

### TS-ID-001 — Global User

El sistema debe representar User como identidad global independiente de Business.

**No permitido:** duplicar una identidad global exclusivamente para representar membresías en distintos Business.

### TS-ID-002 — Membership

La relación User ↔ Business debe soportar múltiples Business por User y múltiples User por Business.

**Requisito conceptual:** User N:N Business mediante Membership.

**Modelo físico:** OPEN.

### TS-ID-003 — Contextual Authorization

Toda operación protegida Business-scoped debe resolver:

1. User autenticado.
2. Business objetivo.
3. Membership válida.
4. autorización requerida.

La secuencia técnica exacta permanece OPEN.

### TS-ID-004 — Tenant Isolation

Toda operación sobre recursos Business-scoped debe impedir acceso cruzado entre Business.

El aislamiento debe ser efectivo aunque un consumidor manipule:

- parámetros;
- query;
- body;
- identificadores de recursos;
- contexto de navegación.

El mecanismo concreto de enforcement permanece OPEN.

### TS-ID-005 — User email uniqueness

El sistema TO-BE debe preservar la regla: User.email es único globalmente.

El enforcement técnico deberá contemplar:

- normalización;
- comparación;
- constraint;
- datos existentes;
- migración de conflictos.

Los detalles están OPEN.

### TS-ID-006 — Customer independence

Customer debe poder existir sin User.

No se debe derivar una identidad de plataforma automáticamente por el solo hecho de crear Customer.

### TS-ID-007 — Customer ↔ User

El vínculo Customer → User debe ser opcional.

El algoritmo automático de matching permanece OPEN.

### TS-ID-008 — Business Context

Toda operación Business-scoped debe poder determinar de manera inequívoca el Business objetivo.

La fuente del contexto —request, sesión, token, URL, selección activa u otra— permanece OPEN.

### TS-ID-009 — Legacy compatibility

Durante la transición debe existir una estrategia temporal de compatibilidad para sesiones/tokens legacy.

La estrategia deberá permitir identificar y procesar correctamente una sesión legacy sin confundirla con el modelo TO-BE.

El formato técnico queda OPEN.

### TS-ID-010 — Legacy termination

Al finalizar la transición:

- las sesiones legacy deben quedar invalidadas;
- los usuarios deberán autenticarse nuevamente bajo el modelo TO-BE.

El mecanismo de invalidación queda OPEN.

### TS-ID-011 — Empresa → Business

La migración debe producir un destino persistente en el modelo Business.

No se autoriza todavía una estrategia concreta de migración.

---

## 4. Separación técnica de responsabilidades

El diseño técnico debe mantener separadas estas responsabilidades:

Authentication
→ Identity Resolution
→ Business Context Resolution
→ Membership Resolution
→ Authorization
→ Tenant Isolation
→ Resource Operation

### Authentication

Determina la identidad global.

### Identity Resolution

Obtiene el User global correspondiente a la sesión autenticada.

### Business Context Resolution

Determina el Business sobre el que se pretende operar.

### Membership Resolution

Comprueba la relación User ↔ Business.

### Authorization

Determina si la Membership permite la operación.

### Tenant Isolation

Restringe los datos operables al Business autorizado.

### Resource Operation

Ejecuta la operación de negocio después de superar las fronteras anteriores.

---

## 5. Business Context

### 5.1 Requisito

El contexto Business debe ser:

- explícito;
- determinable;
- validable;
- coherente con Membership;
- utilizado por todas las operaciones Business-scoped.

### 5.2 Problema técnico abierto

Todavía no está decidido si el Business Context se resolverá mediante:

- URL;
- header;
- token/session;
- contexto de aplicación;
- selección explícita del usuario;
- combinación de mecanismos.

No se selecciona una alternativa en este documento.

### 5.3 Regla de seguridad

Nunca debe confiarse exclusivamente en un Business ID proporcionado por el cliente sin validar Membership y autorización.

---

## 6. Membership technical model — requisitos

Aunque el modelo físico está abierto, cualquier implementación futura deberá poder representar como mínimo:

User
  │
  ├── Membership ── Business
  ├── Membership ── Business
  └── Membership ── Business

Membership deberá permitir, como mínimo conceptual:

- identificar User;
- identificar Business;
- determinar pertenencia;
- resolver autorización contextual.

Los atributos adicionales dependen del lifecycle aprobado.

No se prescriben nombres de columnas.

---

## 7. Authorization enforcement

### 7.1 Requisito mínimo

Una autorización Business-scoped no debe depender exclusivamente de:

- existencia de JWT;
- existencia de User;
- permiso global;
- ID de Business enviado por cliente.

Debe existir una cadena verificable:

User + Business + Membership + Authorization

### 7.2 Relación con AS-IS

El AS-IS actual utiliza:

- JwtAuthGuard;
- PermissionsGuard;
- LegajoAprobadoGuard;
- UsuarioPermiso;
- EmpresaScopedPrismaService.

Esto es evidencia de cómo funciona el sistema actual, no una decisión de cómo debe implementarse el TO-BE.

Los mecanismos AS-IS deben preservarse o reemplazarse mediante una transición explícita; no deben reinterpretarse automáticamente como arquitectura TO-BE.

---

## 8. Tenant isolation

### 8.1 Requisito funcional de seguridad

Para dos Business distintos A y B:

Authorized(User, A, Resource-A) = true

mientras que:

Authorized(User, B, Resource-B) = false

salvo que el User tenga Membership y autorización válidas para B.

### 8.2 Clases de operación a cubrir

La estrategia futura debe cubrir, como mínimo:

- lectura;
- creación;
- actualización;
- eliminación cuando corresponda;
- búsquedas;
- agregaciones;
- relaciones;
- operaciones batch;
- operaciones administrativas;
- operaciones transaccionales.

### 8.3 Mecanismo OPEN

No se decide todavía entre:

- application-level scoping;
- database-level isolation;
- RLS;
- combinación de controles;
- otra estrategia.

La decisión deberá considerar el comportamiento real de Prisma y PostgreSQL y las operaciones que puedan escapar de filtros convencionales.

---

## 9. Email global

### 9.1 Regla cerrada

Un User no puede compartir email con otro User en el modelo final.

### 9.2 Aspectos técnicos pendientes

Input
→ Normalization
→ Uniqueness check
→ Persistence constraint

Debe definirse:

- lowercase/case-folding;
- whitespace;
- Unicode normalization;
- equivalencia;
- constraint de base de datos;
- comportamiento ante conflicto.

### 9.3 Migración

Antes de activar un constraint final deberá auditarse la existencia de duplicados en el AS-IS.

La auditoría concreta todavía no fue ejecutada en esta fase.

---

## 10. Customer ↔ User technical boundary

### 10.1 Regla

Customer y User son conceptos distintos.

### 10.2 Consecuencia técnica

No debe existir una migración que convierta mecánicamente todos los Customer en User.

La migración deberá conservar Customers que no tengan una identidad de plataforma.

### 10.3 Matching

El sistema debe permitir que un Customer se vincule a un User cuando corresponda.

Pero todavía no está definido:

- matching automático;
- matching manual;
- confirmación;
- conflicto;
- ownership del vínculo;
- unlink;
- re-link.

---

## 11. Legacy transition

### 11.1 Modelo conceptual

AS-IS
Usuario + Empresa
      │
      ├── legacy session
      │
      ▼
Compatibility Boundary
      │
      ▼
TO-BE
User + Membership + Business
      │
      └── new session

### 11.2 Principios

La compatibilidad:

- es temporal;
- no debe convertirse en arquitectura permanente;
- debe ser identificable;
- debe permitir observabilidad;
- debe tener condición de finalización.

### 11.3 OPEN

No están definidos:

- duración;
- feature flag;
- versión de token;
- claim;
- endpoint de transición;
- revocation strategy;
- cutover;
- rollback.

---

## 12. Empresa → Business migration

La migración técnica deberá preservar:

### Identidad

Usuarios existentes no deben duplicarse arbitrariamente.

### Business

Empresas existentes deberán poder mapearse al Business correspondiente.

### Customer

Customers existentes deben conservar su independencia.

### Relaciones

La nueva Membership debe representar la pertenencia resultante.

### Recursos

Los recursos Business-scoped deberán conservar su pertenencia al Business correcto.

### Integridad

La migración no debe producir:

- recursos sin Business;
- recursos asignados al Business incorrecto;
- Memberships inconsistentes;
- Users duplicados por Business;
- Customers convertidos incorrectamente en Users.

Los procedimientos concretos quedan OPEN.

---

## 13. Data migration invariants — pre-contractual

Antes de definir una migración ejecutable, deberán formalizarse como invariantes:

1. Cada recurso Business-scoped tiene un Business válido.
2. Ningún recurso Business-scoped queda compartido accidentalmente entre Business.
3. Cada Membership referencia un User válido y Business válido.
4. Un User global no se duplica por migrar de Empresa a Membership.
5. Customer puede permanecer sin User.
6. User email mantiene unicidad global.
7. Legacy sessions no sobreviven al cierre de transición.

Estas son pre-invariants; todavía no constituyen el documento formal de Invariants.

---

## 14. Observabilidad requerida

La transición deberá permitir identificar como mínimo:

- autenticaciones legacy;
- autenticaciones TO-BE;
- Business Context resuelto;
- Membership utilizada;
- fallos de autorización;
- intentos de acceso cruzado;
- conflictos de email;
- conflictos de Customer ↔ User;
- errores de migración;
- sesiones legacy invalidadas.

Los nombres de eventos, logs y métricas quedan OPEN.

---

## 15. Compatibilidad con AS-IS

El AS-IS documenta:

- Usuario.empresaId obligatorio;
- Usuario.email globalmente único;
- JWT con tipos de identidad;
- JwtAuthGuard global;
- PermissionsGuard global;
- scoping mediante EmpresaScopedPrismaService;
- ausencia de Membership;
- ausencia de Business Context explícito;
- separación entre Usuario y Cliente.

Estos datos son baseline técnico y no deben perderse durante la transformación.

---

## 16. Technical decision backlog

| ID | Decisión técnica requerida | Estado |
|---|---|---|
| TD-ID-001 | modelo físico User/Business/Membership | OPEN |
| TD-ID-002 | lifecycle Membership | OPEN |
| TD-ID-003 | catálogo Role/Permission | OPEN |
| TD-ID-004 | resolución Business Context | OPEN |
| TD-ID-005 | representación del contexto en sesión/token | OPEN |
| TD-ID-006 | token claims TO-BE | OPEN |
| TD-ID-007 | session/revocation model | OPEN |
| TD-ID-008 | authorization enforcement mechanism | OPEN |
| TD-ID-009 | tenant isolation mechanism | OPEN |
| TD-ID-010 | email normalization | OPEN |
| TD-ID-011 | duplicate email migration | OPEN |
| TD-ID-012 | Customer ↔ User matching | OPEN |
| TD-ID-013 | Empresa → Business migration | OPEN |
| TD-ID-014 | legacy compatibility mechanism | OPEN |
| TD-ID-015 | legacy cutover | OPEN |
| TD-ID-016 | rollback strategy | OPEN |
| TD-ID-017 | Business onboarding | OPEN |
| TD-ID-018 | SaaS administration boundary | OPEN |

---

## 17. Candidate architecture — NOT APPROVED

Como propuesta técnica para evaluación posterior:

Authentication Layer
        ↓
Global User Resolver
        ↓
Business Context Resolver
        ↓
Membership Resolver
        ↓
Authorization
        ↓
Tenant Isolation
        ↓
Business Domain

Esto es una propuesta de separación de responsabilidades, no una decisión sobre frameworks, clases, módulos o infraestructura.

---

## 18. Security requirements

El diseño futuro deberá impedir:

- usar un User válido para saltar entre Business;
- usar un Business ID arbitrario para acceder a recursos;
- reutilizar permisos de un Business en otro;
- interpretar Customer como autorización;
- confiar en claims sin validar contexto cuando corresponda;
- mantener sesiones legacy después del cutover;
- crear duplicados globales de User por Business.

---

## 19. Contract readiness

Identity & Tenancy todavía no está listo para Contracts finales en:

- Business Context;
- Membership lifecycle;
- Role/Permission catalog;
- authorization mechanism;
- session/token semantics;
- migration behavior;
- Customer ↔ User linking.

Sí existe base suficiente para comenzar a redactar contratos conceptuales de:

- User identity;
- Business boundary;
- Membership relationship;
- authorization preconditions;
- tenant isolation requirements.

Los contratos concretos deberán esperar las decisiones técnicas que condicionan su forma observable.

---

## 20. Gate de aprobación

Este documento queda:

**DRAFT — NOT APPROVED**

Para convertirlo en Technical Specification aprobada se requiere:

1. revisar las decisiones técnicas abiertas;
2. separar requisitos técnicos obligatorios de propuestas;
3. resolver los puntos que afectan Contracts;
4. obtener aprobación;
5. recién después producir Contracts;
6. luego Invariants;
7. luego Tests/Evals;
8. luego Plan/Tasks;
9. y finalmente Implementation.

---

## 21. Evidencia

| Elemento | Evidencia |
|---|---|
| AS-IS Usuario.empresaId | VERIFIED BY CODE |
| AS-IS JWT / guards | VERIFIED BY CODE |
| AS-IS Prisma scoping | VERIFIED BY CODE |
| Ausencia de Membership AS-IS | VERIFIED BY CODE |
| Business/User/Membership conceptual | DECISION + TO-BE |
| User email globalmente único | OWNER-RULED |
| Empresa → Business | OWNER-RULED |
| Legacy compatibility | OWNER-RULED |
| Technical mechanism | NOT DETERMINABLE / OPEN |
| Physical schema | OPEN |
| Migration execution | NOT EXECUTED |
| Implementation | NOT AUTHORIZED |

---

## 22. Estado final

**DRAFT — TECHNICAL SPECIFICATION / NOT APPROVED**

**Decisiones nuevas creadas:** 0  
**Decisiones técnicas cerradas:** 0  
**Propuestas técnicas:** explícitamente marcadas  
**Schema modificado:** 0  
**Código modificado:** 0  
**Datos modificados:** 0  
**Migraciones ejecutadas:** 0  
**Contracts creados:** 0  
**Invariants formales creadas:** 0  
**Tests creados:** 0  
**Implementation authorized:** NO
