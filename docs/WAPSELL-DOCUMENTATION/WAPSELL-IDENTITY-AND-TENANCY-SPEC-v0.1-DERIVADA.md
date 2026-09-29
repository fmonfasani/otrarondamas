# Wapsell — Identity & Tenancy SPEC v0.1 — DERIVADA PARA REVISIÓN

> **Estado:** DRAFT — DERIVADA, NO CANÓNICA  
> **Fecha:** 2026-09-28  
> **Propósito:** convertir las decisiones D-001, D-002, D-005 y D-006 aprobadas durante el workshop en una especificación especializada de Identity & Tenancy, sin inventar detalles de implementación.  
> **Regla:** esta especificación no modifica el repositorio ni sustituye todavía al documento canónico.

## 1. Alcance

Esta SPEC cubre exclusivamente:

- identidad global de plataforma;
- Business/Tenant;
- Membership;
- roles y permisos en contexto de Membership;
- autorización contextual al Business;
- principios de aislamiento derivados de Identity/Tenancy.

Quedan fuera de esta SPEC los contratos técnicos, esquema Prisma definitivo, estrategia de migración detallada, endpoints, claims JWT concretos, estados de Membership, MFA/2FA, onboarding completo y pruebas de implementación.

## 2. Decisiones normativas

### D-001 — Business = Tenant

**Decisión aprobada:**

> Business = Tenant. Empresa se transforma en Business y pasa a ser la unidad de aislamiento multi-tenant.

**Implicación normativa:**

- `Business` es el término canónico de producto para la unidad de negocio.
- `Tenant` expresa su función como unidad de aislamiento multi-tenant.
- `Empresa` pertenece al modelo AS-IS y deberá transformarse hacia `Business`.

**OPEN DETAIL:**

- estrategia exacta de migración de `Empresa`;
- nombre físico definitivo de tablas/modelos;
- compatibilidad temporal;
- migración de referencias de las entidades existentes.

### D-002 — User / Membership

**Decisión aprobada:**

> User es la identidad global de la plataforma. La relación entre User y Business se establece mediante Membership, permitiendo que un mismo User pertenezca a múltiples Business. Los roles y permisos se determinan dentro del contexto de cada Membership.

**Implicación normativa:**

```text
User
 ├── Membership → Business A
 ├── Membership → Business B
 └── Membership → Business C
```

El mismo User puede participar en múltiples Business sin que su identidad global se duplique por cada negocio.

**OPEN DETAIL:**

- modelo físico de `User`;
- modelo físico de `Membership`;
- unicidad de email y otros identificadores;
- estados de Membership;
- invitaciones;
- recuperación de acceso;
- migración de `Usuario` y `Cliente`;
- tratamiento definitivo de `Customer/Cliente` frente a `User`.

### D-005 — Roles y permisos en Membership

**Decisión aprobada:**

> Los roles y permisos pertenecen al Membership entre un User y un Business. Un mismo User puede tener diferentes roles y permisos en diferentes Business. El acceso a los recursos y operaciones de un Business se determina por el Membership activo y sus autorizaciones.

**Implicación normativa:**

El rol no es una propiedad global suficiente del User.

Ejemplo conceptual:

```text
User X
 ├── Membership A → rol/permisos propios
 └── Membership B → rol/permisos diferentes
```

El sistema no debe utilizar el rol de un Membership para autorizar operaciones sobre otro Business.

**OPEN DETAIL:**

- catálogo definitivo de roles;
- composición de permisos;
- herencia o jerarquía de roles;
- permisos por defecto;
- administración de Membership;
- suspensión/revocación;
- modelo RBAC/ABAC concreto.

### D-006 — Autorización contextual

**Decisión aprobada:**

> Todo acceso autenticado a Wapsell debe validarse mediante la identidad global User y el contexto de Membership correspondiente. Cada endpoint debe verificar que el User autenticado posee un Membership válido para el Business objetivo y que dicho Membership tiene los roles y permisos necesarios para ejecutar la operación. No se permitirá autorizar el acceso únicamente por la existencia de un token válido.

**Implicación normativa:**

La autenticación de identidad y la autorización sobre un Business son controles distintos.

Conceptualmente:

```text
Credencial válida
      ↓
User identificado
      ↓
Business objetivo
      ↓
Membership válido
      ↓
Roles / permisos suficientes
      ↓
Operación autorizada
```

Un token válido, por sí solo, no constituye autorización para operar sobre un Business.

**OPEN DETAIL:**

- tipo de token y claims;
- resolución del Business objetivo;
- middleware/guard/interceptor;
- permisos de cada endpoint;
- respuestas de autorización;
- expiración/revocación;
- sesiones;
- MFA/2FA;
- rate limiting;
- protección de flujos de invitación.

## 3. AS-IS relevante

La línea base disponible documenta un modelo diferente:

- `Empresa` funciona como entidad central de aislamiento.
- `Usuario` está ligado a `Empresa`.
- Existe una separación entre `Usuario` y `Cliente`.
- Los roles actuales utilizan `RolUsuario`.
- Los permisos actuales utilizan `Permiso`/`UsuarioPermiso`.
- La arquitectura existente contiene autenticación y autorización, pero el modelo TO-BE de Membership todavía no está implementado.

La auditoría técnica clasifica la separación `Usuario`/`Empresa`, los permisos actuales y el aislamiento por empresa como capacidades existentes, mientras que Business administration y el modelo multi-tenant TO-BE son brechas.  

## 4. Transformación AS-IS → TO-BE

| Área | AS-IS | TO-BE aprobado | Detalle pendiente |
|---|---|---|---|
| Unidad de negocio | `Empresa` | `Business = Tenant` | migración física |
| Identidad | `Usuario` y `Cliente` separados | `User` global | reconciliación de perfiles |
| Pertenencia | `Usuario.empresaId` | `Membership` | modelo N:N |
| Roles | `RolUsuario` asociado al usuario | rol contextual al Membership | catálogo definitivo |
| Permisos | `Permiso`/`UsuarioPermiso` | permisos del Membership | modelo de autorización |
| Autorización | modelo actual con riesgos documentados | User + Membership + autorización contextual | contratos y controles |
| Aislamiento | por `Empresa` | por `Business` | estrategia técnica |

## 5. Reglas que esta SPEC NO debe inventar

No se consideran aprobados por esta SPEC:

- nombres físicos de tablas;
- columnas definitivas;
- relaciones Prisma;
- endpoints;
- formato de JWT;
- claims;
- códigos HTTP;
- middleware concreto;
- estrategia de migración;
- eliminación de `Usuario`;
- eliminación de `Cliente`;
- fusión física de `Cliente` con `User`;
- roles concretos adicionales;
- permisos concretos;
- MFA/2FA;
- onboarding SaaS;
- política de sesiones.

## 6. Riesgos y conflictos que deben quedar trazables

### CON-010 — Identidad y Membership

El AS-IS tiene `Usuario` ligado a `Empresa`, mientras el TO-BE establece `User` global con Membership N:N hacia Business. Es una contradicción de modelo de datos e identidad que requiere transformación.

### CON-013 — Roles y permisos

El AS-IS utiliza `RolUsuario` y permisos asociados al usuario; el TO-BE mueve el contexto de autorización al Membership.

### CON-015 — Seguridad

El AS-IS contiene riesgos documentados relacionados con tokens de `Cliente` y controles de tipo/autorización. Esos riesgos no deben tratarse como hechos actuales no verificados; requieren verificación durante la fase de implementación/validación.

## 7. Trazabilidad

```text
D-001 → Identity/Tenancy → Architecture → Contract → Invariant → Test
D-002 → Identity/Tenancy → Architecture → Contract → Invariant → Test
D-005 → Authorization → Architecture → Contract → Invariant → Test
D-006 → Authorization/Security → Architecture → Contract → Invariant → Test
```

Las capas posteriores no están definidas todavía en esta SPEC.

## 8. Criterio de salida

Esta SPEC podrá avanzar a revisión cuando:

1. las cuatro decisiones estén registradas en el Decision Register canónico;
2. el modelo User/Business/Membership esté definido a nivel de contrato;
3. se resuelva el tratamiento de `Cliente`;
4. se defina el catálogo de roles/permisos;
5. se documente la estrategia de autorización contextual;
6. se definan invariantes de aislamiento;
7. se definan pruebas de autorización y aislamiento.

## 9. Estado

**DRAFT — lista para revisión funcional.**

No implica aprobación de implementación, cambios de base de datos, migración ni código.
