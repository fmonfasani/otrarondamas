# WAPSELL — IDENTITY & TENANCY
## OWNER DECISION PACK v0.1

**Estado:** DRAFT — OWNER DECISION REQUIRED  
**Fecha:** 2026-10-02  
**Dominio:** Identity & Tenancy  
**Propósito:** presentar únicamente las definiciones de negocio/producto que el proceso actual identifica como necesarias antes de cerrar la Technical Specification.

> Este documento no decide por el Owner. Las opciones son alternativas de análisis, no recomendaciones. La selección del Owner deberá registrarse posteriormente en el Decision Register.

---

## 1. Base normativa

Este pack deriva de:

- Decision Register canónico.
- Owner Rulings OR-001 / OR-002.
- Requirements & Gap Definition.
- Technical Specification Baseline.
- Technical Decision Resolution Register.

La implementación continúa **NOT AUTHORIZED**.

---

# 2. DECISIONES REQUERIDAS

## OD-ID-001 — Lifecycle de Membership

### Pregunta

¿Qué estados y transiciones debe tener una Membership entre User y Business?

### Contexto cerrado

Membership es la relación N:N entre User y Business y contiene el contexto de pertenencia/autorización.

### Aspectos a definir

- ¿Una Membership puede estar activa/inactiva?
- ¿Puede suspenderse temporalmente?
- ¿Puede revocarse?
- ¿Quién puede crearla?
- ¿Quién puede activarla?
- ¿Quién puede suspenderla/revocarla?
- ¿Qué ocurre con el acceso cuando deja de estar activa?
- ¿Puede reactivarse una Membership existente o debe crearse otra?

### Decisión del Owner

**Pendiente.**

---

## OD-ID-002 — Catálogo funcional de Roles

### Pregunta

¿Cuáles son los roles funcionales oficiales de Wapsell?

### Contexto existente

En documentación histórica aparecen roles como:

- Owner/Admin
- Vendedor / Asistente
- Gestor/Operador de Stock
- Repartidor
- Cliente/Comprador
- Proveedor

También existen referencias a otros actores en documentación previa.

### Punto a decidir

El catálogo anterior **no se considera automáticamente aprobado como catálogo definitivo**.

Definir:

- nombre oficial;
- propósito de cada rol;
- si es interno del Business, externo o de plataforma;
- si un User puede tener múltiples roles dentro de una Membership;
- si existe un rol Owner único;
- si existe un Administrador de plataforma separado.

### Decisión del Owner

**Pendiente.**

---

## OD-ID-003 — Catálogo funcional de Permissions

### Pregunta

¿Cómo se define la capacidad efectiva de una Membership?

### Aspectos a decidir

- ¿Los permisos son siempre derivados del Role?
- ¿Puede una Membership tener permisos adicionales?
- ¿Puede una Membership tener permisos restringidos respecto del Role?
- ¿Los permisos se administran por Business?
- ¿Existe un catálogo global de permisos de Wapsell?
- ¿Owner/Admin puede administrar permisos?

### Decisión del Owner

**Pendiente.**

---

## OD-ID-004 — Business Context / Business activo

### Pregunta

Cuando un User pertenece a varios Businesses, ¿cómo determina el sistema sobre cuál está operando?

### Aspectos funcionales a definir

- ¿Existe un Business activo?
- ¿El usuario debe seleccionarlo?
- ¿Puede cambiarlo sin cerrar sesión?
- ¿El cambio afecta toda la aplicación?
- ¿El contexto debe ser visible permanentemente?
- ¿Qué ocurre al ingresar con una Membership única?
- ¿Qué ocurre si la Membership deja de estar activa mientras el usuario está operando?

### Decisión del Owner

**Pendiente.**

---

## OD-ID-005 — Customer ↔ User

### Pregunta

¿Cuál es la regla funcional para vincular un Customer existente con un User?

### Estado normativo actual

Está cerrado que:

- Customer y User son conceptos distintos.
- Customer puede existir sin User.
- El vínculo es opcional.
- El criterio funcional de vinculación por "mismo email" permanece OPEN según OR-002-D / Decision Register §8.3.

### Definir

Elegir y/o especificar la regla de vinculación:

- automática;
- manual;
- mediante invitación/confirmación;
- combinación de mecanismos;
- comportamiento ante conflicto;
- quién puede iniciar el vínculo;
- quién puede desvincularlo.

### Decisión del Owner

**Pendiente.**

---

## OD-ID-006 — Criterio de finalización del Legacy Cutover

### Pregunta

¿Cuándo se considera finalizada la transición desde Usuario + Empresa hacia User + Membership + Business?

### Regla ya cerrada

Al finalizar la transición:

- las sesiones legacy se invalidan;
- se requiere nuevo login.

### Falta definir

El criterio objetivo que habilita ese cierre.

Posibles criterios a evaluar:

- todas las cuentas migradas;
- todos los Businesses migrados;
- porcentaje mínimo;
- cero sesiones legacy activas;
- validaciones de migración completas;
- combinación de condiciones.

**Las alternativas son ejemplos de criterios posibles, no una selección.**

### Decisión del Owner

**Pendiente.**

---

## OD-ID-007 — Business Onboarding

### Pregunta

¿Cómo se incorpora un nuevo Business a Wapsell?

### Aspectos a definir

- quién puede crear un Business;
- quién puede aprobarlo;
- quién se convierte en Owner inicial;
- cuándo se crea la primera Membership;
- configuración inicial;
- estado inicial del Business;
- si existe onboarding self-service;
- si existe alta administrativa por parte de Wapsell;
- qué información mínima debe existir antes de operar.

### Decisión del Owner

**Pendiente.**

---

## OD-ID-008 — Administración SaaS / Platform Admin

### Pregunta

¿Qué puede administrar Wapsell como plataforma sobre los Businesses?

### Separación necesaria

**Business Admin**

Administra su propio Business.

**Platform Admin**

Administraría aspectos de Wapsell como plataforma.

### Definir

- si existe Platform Admin;
- qué recursos puede visualizar;
- qué recursos puede modificar;
- si puede intervenir en Memberships;
- si puede suspender Businesses;
- si puede acceder a datos comerciales;
- si existe separación entre soporte y administración;
- auditoría requerida para acciones de plataforma.

### Decisión del Owner

**Pendiente.**

---

# 3. RESUMEN DE RESPUESTAS

| ID | Decisión | Estado |
|---|---|---|
| OD-ID-001 | Lifecycle Membership | PENDIENTE |
| OD-ID-002 | Roles oficiales | PENDIENTE |
| OD-ID-003 | Permissions | PENDIENTE |
| OD-ID-004 | Business Context | PENDIENTE |
| OD-ID-005 | Customer ↔ User | PENDIENTE |
| OD-ID-006 | Criterio de cutover | PENDIENTE |
| OD-ID-007 | Business onboarding | PENDIENTE |
| OD-ID-008 | Platform Admin | PENDIENTE |

---

# 4. QUÉ NO SE ESTÁ DECIDIENDO AQUÍ

Este pack no decide:

- tablas;
- columnas;
- IDs;
- endpoints;
- JWT claims;
- guards;
- middleware;
- RLS;
- Prisma strategy;
- migraciones;
- eventos;
- infraestructura;
- tecnología concreta.

Esas decisiones vienen después de cerrar las reglas funcionales que las condicionan.

---

# 5. SECUENCIA POSTERIOR

Una vez respondidas las decisiones anteriores:

1. registrar las decisiones del Owner;
2. actualizar Decision Register;
3. reconciliar TO-BE;
4. actualizar Technical Specification;
5. proponer soluciones técnicas;
6. aprobar Technical Specification;
7. Contracts;
8. Invariants;
9. Tests/Evals;
10. Plan;
11. Tasks;
12. Implementation.

---

# 6. ESTADO

**Owner decisions nuevas registradas:** 0  
**Owner decisions pendientes:** 8  
**Technical implementation:** NOT AUTHORIZED  
**Schema:** NOT MODIFIED  
**Data:** NOT MODIFIED  
**Code:** NOT MODIFIED

**Este documento es un Decision Pack para revisión del Owner.**
