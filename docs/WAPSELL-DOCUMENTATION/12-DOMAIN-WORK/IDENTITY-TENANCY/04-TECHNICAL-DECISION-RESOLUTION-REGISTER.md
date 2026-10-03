# WAPSELL — IDENTITY & TENANCY
## TECHNICAL DECISION RESOLUTION REGISTER v0.1

**Estado:** DRAFT — PROCESS ARTIFACT / NOT APPROVED  
**Fecha:** 2026-10-01  
**Dominio:** Identity & Tenancy  
**Propósito:** resolver el backlog técnico sin convertir propuestas en decisiones aprobadas.

> Regla de trabajo: una decisión funcional ya cerrada se trata como restricción; un detalle técnico abierto se investiga y especifica; una cuestión que cambia comportamiento de negocio o producto requiere definición del Owner. Este documento no autoriza implementación.

---

## 1. Autoridad utilizada

Precedencia aplicada:

1. Owner Rulings.
2. Decision Register.
3. SPEC canónica.
4. TO-BE y derivados.
5. Auditorías/documentación como evidencia.

Fuentes principales:

- `04-DECISIONS/00-DECISION-REGISTER.md`
- `00-PREPROCESS/IDENTITY-TENANCY/01-REQUIREMENTS-AND-GAP-DEFINITION.md`
- `00-PREPROCESS/IDENTITY-TENANCY/03-TECHNICAL-SPECIFICATION-BASELINE.md`
- AS-IS Identity / Authorization.

### Corrección de reconciliación

Existe una discrepancia entre artefactos de proceso:

- `01-REQUIREMENTS-AND-GAP-DEFINITION.md` presenta A1–A7 como reglas cerradas.
- El **Decision Register canónico**, §8.3 y OR-002-D, establece que el criterio **"mismo email" para vincular Customer ↔ User permanece OPEN**.

Por precedencia ISS-08, este registro toma como vigente el **Decision Register canónico**. Por tanto:

- Customer independiente de User: **CERRADO**.
- Vínculo Customer → User opcional: **CERRADO**.
- Criterio automático "mismo email": **OPEN**.
- La implementación del vínculo: **OPEN**.

No se resuelve esta contradicción en silencio.

---

## 2. Clasificación

Cada TD-ID se clasifica como:

- **CERRADO POR DECISIÓN**: la regla ya está definida.
- **RESOLUBLE TÉCNICAMENTE**: no requiere nueva decisión de producto; requiere especificación técnica.
- **OWNER DECISION REQUIRED**: cambia comportamiento/producto/gobernanza y necesita definición.
- **EVIDENCE REQUIRED**: primero debe inspeccionarse código/datos.
- **OPEN**: todavía no puede cerrarse responsablemente.

---

## 3. Resolution Register

| ID | Tema | Estado | Tratamiento |
|---|---|---|---|
| TD-ID-001 | Modelo físico User/Business/Membership | OPEN | Technical Spec; propuesta posterior, no decisión todavía |
| TD-ID-002 | Lifecycle Membership | OWNER DECISION REQUIRED | Definir estados, alta, suspensión, revocación y efectos |
| TD-ID-003 | Catálogo Role/Permission | OWNER DECISION REQUIRED | Functional/Authorization Spec |
| TD-ID-004 | Resolución Business Context | OWNER DECISION REQUIRED | Afecta UX y comportamiento observable; luego diseño técnico |
| TD-ID-005 | Representación Business Context en sesión/token | RESOLUBLE TÉCNICAMENTE | Depende de TD-ID-004 |
| TD-ID-006 | Claims del token TO-BE | RESOLUBLE TÉCNICAMENTE | Security/Auth Spec |
| TD-ID-007 | Session / Revocation | RESOLUBLE TÉCNICAMENTE | Security/Auth Spec; respetar OR-002-E |
| TD-ID-008 | Authorization enforcement | RESOLUBLE TÉCNICAMENTE | Architecture/Technical Spec + evidencia AS-IS |
| TD-ID-009 | Tenant isolation | RESOLUBLE TÉCNICAMENTE | Architecture; comparar opciones contra Prisma/PostgreSQL reales |
| TD-ID-010 | Email normalization | RESOLUBLE TÉCNICAMENTE | Identity Spec; la unicidad global ya está cerrada |
| TD-ID-011 | Duplicate email migration | EVIDENCE REQUIRED | Auditar datos AS-IS antes de definir migración |
| TD-ID-012 | Customer ↔ User matching | OWNER DECISION REQUIRED | El criterio "mismo email" está OPEN en el registro canónico |
| TD-ID-013 | Empresa → Business migration | RESOLUBLE TÉCNICAMENTE | Dirección final cerrada; mecanismo de migración abierto |
| TD-ID-014 | Legacy compatibility mechanism | RESOLUBLE TÉCNICAMENTE | OR-002-E fija la política; falta diseño técnico |
| TD-ID-015 | Legacy cutover | OWNER DECISION REQUIRED | La obligación de invalidar legacy está cerrada; falta criterio operativo de corte |
| TD-ID-016 | Rollback strategy | RESOLUBLE TÉCNICAMENTE | Transformation/Architecture Spec |
| TD-ID-017 | Business onboarding | OWNER DECISION REQUIRED | Producto/plataforma: actores, flujo y límites |
| TD-ID-018 | SaaS administration boundary | OWNER DECISION REQUIRED | Gobernanza de plataforma y alcance administrativo |

---

## 4. Decisiones que ya NO debemos volver a discutir

### Cerradas

- Business es la unidad canónica de tenancy.
- User es identidad global.
- User ↔ Business se relaciona mediante Membership N:N.
- Roles/permisos pertenecen al contexto Membership.
- Customer no se fusiona con User.
- Customer puede existir sin User.
- Empresa → Business es el destino persistente final.
- La transición es incremental y temporal.
- Durante la transición existe compatibilidad legacy.
- Al finalizar la transición las sesiones legacy se invalidan y se requiere nuevo login.
- User.email es globalmente único.
- La implementación sigue: **especificación → aprobación del Owner → implementación**.

Estas reglas son restricciones para las especificaciones siguientes.

---

## 5. Lo que podemos resolver técnicamente

Estos puntos no deberían convertirse automáticamente en nuevas decisiones de negocio:

### TD-ID-005 — Contexto en sesión/token
Una vez definido qué significa "Business activo", podemos comparar técnicamente URL, sesión, token, request context o combinación.

### TD-ID-006 — Claims
Debe derivarse de la estrategia de sesión/autenticación elegida.

### TD-ID-007 — Revocación
Debe diseñarse respetando la transición temporal y el corte obligatorio de legacy.

### TD-ID-008 — Authorization enforcement
Debe partir de la evidencia real del AS-IS:

- JwtAuthGuard;
- PermissionsGuard;
- LegajoAprobadoGuard;
- UsuarioPermiso;
- EmpresaScopedPrismaService.

No se debe asumir que estos mecanismos serán la arquitectura definitiva.

### TD-ID-009 — Tenant isolation
Debe evaluarse contra las operaciones reales de Prisma/PostgreSQL, incluyendo operaciones que puedan escapar de un scope convencional.

### TD-ID-010 — Email normalization
La regla de unicidad es cerrada; lo abierto es cómo normalizar y hacer cumplir técnicamente esa regla.

### TD-ID-013 — Migración
El destino Empresa → Business está cerrado. El cómo debe especificarse técnicamente sin inventar una migración.

### TD-ID-014 — Legacy compatibility
La política está cerrada; el mecanismo puede diseñarse técnicamente.

### TD-ID-016 — Rollback
Puede diseñarse como parte de la estrategia de transformación, sujeto a las restricciones de continuidad ya aprobadas.

---

## 6. Lo que necesita decisión del Owner

### TD-ID-002 — Membership lifecycle

Hay que definir qué significa una Membership:

- estados;
- creación;
- activación;
- suspensión;
- revocación;
- efectos sobre acceso.

No se deben inventar estos estados desde la implementación.

### TD-ID-003 — Role / Permission catalog

Hay que cerrar el catálogo funcional definitivo y su alcance.

### TD-ID-004 — Business Context

Hay que definir cómo debe experimentar el usuario la pertenencia a múltiples Businesses:

- Business activo;
- selección;
- cambio;
- restricciones;
- comportamiento de URLs/sesiones.

La implementación técnica viene después.

### TD-ID-012 — Customer ↔ User

El registro canónico deja abierto el criterio "mismo email".

Primero debe decidirse la regla funcional. Después se define su mecanismo técnico.

### TD-ID-015 — Legacy cutover

La regla de resultado ya está cerrada: las sesiones legacy deben invalidarse.

Falta definir el criterio operativo que determina que la transición terminó.

### TD-ID-017 — Business onboarding

Debe definirse quién puede crear/activar un Business y bajo qué flujo.

### TD-ID-018 — SaaS administration

Debe definirse qué administración corresponde a la plataforma Wapsell y cuál queda dentro de cada Business.

---

## 7. Lo que primero requiere evidencia

### TD-ID-011 — Duplicate email migration

Antes de decidir una estrategia de migración de emails:

1. inspeccionar los datos reales;
2. detectar duplicados;
3. clasificar conflictos;
4. recién entonces diseñar la resolución.

No se debe asumir que existen duplicados ni que no existen.

### TD-ID-001 — Modelo físico

La propuesta técnica debe partir del schema real y de sus relaciones actuales. No se autoriza diseñar tablas nuevas ignorando el AS-IS.

---

## 8. Dependencias

La secuencia recomendada es:

`TD-ID-002/003/004`
→ `TD-ID-005/006/007/008/009`
→ `TD-ID-001`
→ `TD-ID-010/011/012`
→ `TD-ID-013/014/015/016`
→ `TD-ID-017/018`
→ Technical Specification aprobada
→ Contracts
→ Invariants
→ Tests/Evals
→ Plan
→ Tasks
→ Implementation.

No todos los elementos requieren esperar estrictamente a todos los anteriores; la cadena representa las dependencias conceptuales principales.

---

## 9. Próximo paso del proceso

El siguiente paso no es programar.

Es:

**1. Resolver los OWNER DECISION REQUIRED.**  
**2. Obtener evidencia de los puntos marcados EVIDENCE REQUIRED.**  
**3. Convertir los puntos técnicamente resolubles en propuestas técnicas comparables.**  
**4. Consolidar todo en una Technical Specification revisada.**  
**5. Solicitar aprobación del Owner.**

Solo después de esa aprobación se continúa con Contracts → Invariants → Tests/Evals → Plan → Tasks → Implementation.

---

## 10. Estado

**Decisiones nuevas creadas:** 0  
**Decisiones existentes modificadas:** 0  
**Contradicciones ocultadas:** 0  
**Código modificado:** 0  
**Schema modificado:** 0  
**Datos modificados:** 0  
**Implementation authorized:** NO

**Estado del artefacto:** DRAFT — NOT APPROVED.
