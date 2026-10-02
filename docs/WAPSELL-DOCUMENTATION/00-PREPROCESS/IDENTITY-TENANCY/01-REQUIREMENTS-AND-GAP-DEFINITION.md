# WAPSELL — IDENTITY & TENANCY — REQUIREMENTS & GAP DEFINITION

**Version:** v0.1  
**Status:** PROCESS ARTIFACT — DRAFT / NOT APPROVED  
**Fecha:** 2026-10-01  
**Dominio:** Identity & Tenancy

> Este documento convierte el AS-IS y las decisiones existentes en requisitos de trabajo. No autoriza schema, migraciones, contratos ni implementación. Los puntos que dependen de una definición todavía abierta quedan marcados como OPEN.

## 1. Fuentes

- AS-IS Identity: `05-ASIS/04-ASIS-IDENTITY.md`.
- AS-IS Authorization: `05-ASIS/05-ASIS-AUTHORIZATION.md`.
- TO-BE Identity & Tenancy: `07-TOBE/01-IDENTITY-AND-TENANCY.md`.
- Decision Register: `04-DECISIONS/00-DECISION-REGISTER.md`.
- Decisiones rectoras: D-001, D-002, D-002-bis, D-005 y D-006.

## 2. Requisitos derivados de decisiones ya existentes

### IT-REQ-001 — Business como unidad de tenancy
**Fuente:** D-001.  
El sistema debe tratar `Business` como la entidad canónica de negocio y como unidad de aislamiento multi-tenant. `Tenant` describe la función de aislamiento, no una entidad alternativa.
**Estado:** REQUIREMENT DERIVED FROM APPROVED DECISION.

### IT-REQ-002 — Aislamiento entre Businesses
**Fuente:** D-001 / D-014.  
Los datos y recursos comerciales de un Business no deben ser accesibles desde otro Business. Products, Orders, Sales, Inventory y Customers pertenecen al contexto de un Business.
**Estado:** REQUIREMENT DERIVED.
**Detalle de enforcement:** OPEN.

### IT-REQ-003 — User como identidad global
**Fuente:** D-002.  
Un `User` debe representar una identidad global de plataforma y no una pertenencia exclusiva a un Business.
**Estado:** REQUIREMENT DERIVED FROM APPROVED DECISION.

### IT-REQ-004 — Membership como pertenencia
**Fuente:** D-002.  
La relación entre `User` y `Business` debe poder representar múltiples pertenencias. `Membership` constituye el contexto mediante el cual un User opera dentro de un Business.
**Estado:** REQUIREMENT DERIVED FROM APPROVED DECISION.

### IT-REQ-005 — Autorización contextual
**Fuente:** D-005 / D-006.  
Los roles y permisos efectivos de un User deben evaluarse en el contexto de la Membership y del Business objetivo. Una autorización obtenida en un Business no debe implicar autorización equivalente en otro.
**Estado:** REQUIREMENT DERIVED / RECONSTRUCTED.

### IT-REQ-006 — Customer independiente de User
**Fuente:** D-002-bis.  
`Customer` debe permanecer como entidad comercial independiente de `User`. Puede existir sin una identidad de plataforma.
**Estado:** REQUIREMENT DERIVED FROM APPROVED DECISION.

### IT-REQ-007 — Vínculo Customer → User opcional
**Fuente:** D-002-bis.  
Un Customer puede vincularse opcionalmente a un User. La existencia del vínculo no debe ser requisito para representar al Customer comercial.
**Estado:** REQUIREMENT DERIVED FROM APPROVED DECISION.

### IT-REQ-008 — Autenticación desacoplada de Business
**Fuente:** D-002 / D-006.  
La autenticación de User pertenece a la capa global de identidad; el acceso posterior a un Business depende de una Membership válida y de la autorización correspondiente.
**Estado:** REQUIREMENT DERIVED / RECONSTRUCTED.
**Mecánica exacta:** OPEN.

### IT-REQ-009 — Sin acceso por ausencia de Membership
**Fuente:** TO-BE Identity & Tenancy.  
La ausencia de una Membership válida no debe conceder acceso a recursos del Business.
**Estado:** TO-BE REQUIREMENT.

## 3. Requisitos de transformación AS-IS → TO-BE

### IT-REQ-010 — Transformación Empresa → Business
`Empresa` es el antecedente AS-IS de `Business`. La transformación debe preservar la funcionalidad existente y llevar la entidad al concepto canónico `Business`.
**Estado:** DIRECTION APPROVED; migration mechanics OPEN.

### IT-REQ-011 — Separación identidad/pertenencia
El modelo actual `Usuario` acoplado a `Empresa` debe transformarse conceptualmente en una identidad `User` independiente y una relación `Membership` con el Business.
**Estado:** DIRECTION APPROVED; technical realization OPEN.

### IT-REQ-012 — Preservación de Customer independiente
La transformación no debe fusionar `Customer` con `User`. Debe preservar la posibilidad de Customers sin login y contemplar el vínculo opcional definido por D-002-bis.
**Estado:** DIRECTION APPROVED.

### IT-REQ-013 — Compatibilidad temporal de sesiones
Durante una transición incremental, la compatibilidad temporal con sesiones/tokens legacy debe contemplarse según OR-002-E. Al finalizar la transición, las sesiones legacy deben invalidarse y requerirse nuevo login.
**Estado:** OWNER-RULED / TRANSFORMATION DIRECTION.
**Detalle técnico:** OPEN.

## 4. Gaps funcionales que deben resolverse antes de la especificación técnica

| Gap | Situación | Clasificación | Próximo tratamiento |
|---|---|---|---|
| Catálogo definitivo de Roles | No cerrado | OPEN DETAIL | Owner/Functional Spec |
| Catálogo definitivo de Permissions | No cerrado | OPEN DETAIL | Specialized Spec |
| Lifecycle de Membership | Estados conceptuales mencionados, ciclo no cerrado | OPEN DETAIL | Owner/Functional Spec |
| Business onboarding | No definido completamente | OPEN DETAIL | Business/Platform Spec |
| Selección/cambio de Business activo | Necesario para multi-membership; comportamiento no cerrado | OPEN DETAIL | Owner Decision / UX Spec |
| User email/unicidad | AS-IS globalmente unique; TO-BE no fija mecanismo | OPEN DETAIL | Technical/Identity Spec |
| Customer ↔ User matching | Reglas A1–A7 ya registradas | OWNER-RULED; implementación abierta | Specialized Spec |
| Superadmin de plataforma | No existe en AS-IS | OPEN DETAIL | Platform Governance |
| Estados de User | No cerrados | OPEN DETAIL | Identity Spec |
| Estados de Business | No cerrados | OPEN DETAIL | Business Spec |
| Revocación/sesiones | AS-IS y transición requieren definición técnica | OPEN DETAIL | Security/Auth Spec |
| Mecanismo de aislamiento | AS-IS usa scope por Empresa; mecanismo TO-BE no decidido | OPEN DETAIL | Architecture |
| Migración física | Dirección conceptual definida; plan no autorizado | OPEN DETAIL | Transformation Spec |

## 5. Elementos que NO deben convertirse en requisitos sin nueva decisión

Los siguientes puntos aparecen como posibilidades o detalles abiertos y no deben tratarse como aprobados:

- esquema físico concreto;
- nombres de tablas, columnas o identificadores;
- formato y claims definitivos del JWT;
- RLS, filtros, schemas separados u otro mecanismo específico de aislamiento;
- catálogo definitivo de roles y permisos;
- estados concretos de Membership/User/Business;
- MFA/2FA;
- superadmin y sus permisos concretos;
- onboarding self-service;
- estrategia concreta de migración y dual-write;
- endpoints o eventos específicos.

## 6. Reglas Customer ↔ User ya cerradas

El proceso debe respetar las reglas A1–A7 registradas previamente:

- A1: vínculo automático si coincide el email.
- A2: conflicto si Customer ya está vinculado a otro User; requiere intervención manual.
- A3: el vínculo es global.
- A4: Customers de distintos Businesses pueden vincularse al mismo User global por email.
- A5: cambio del email del Customer no rompe el vínculo existente.
- A6: cambio del email del User no rompe el vínculo existente.
- A7: el email del User es globalmente único.

Estas reglas no autorizan todavía el diseño físico ni la implementación del vínculo.

## 7. Resultado del análisis

El dominio tiene una base conceptual suficiente para avanzar a TO-BE, pero todavía no está listo para Contracts/Implementation.

Los bloqueadores principales son:

1. lifecycle y administración de Membership;
2. catálogo definitivo de Roles/Permissions;
3. contexto activo y cambio entre Businesses;
4. definición técnica de autenticación/sesiones;
5. mecanismo de aislamiento;
6. transformación/migración concreta del AS-IS;
7. límites de administración de plataforma.

## 8. Próximo paso

Construir `02-DECISION-RECONCILIATION.md` para separar los gaps que ya tienen una decisión previa de los que realmente requieren una nueva definición del Owner. Después de esa reconciliación se puede cerrar el TO-BE funcional del dominio sin mezclarlo todavía con schema o implementación.