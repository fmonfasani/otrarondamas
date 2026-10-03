# WAPSELL — IDENTITY & TENANCY — AS-IS BASELINE

**Version:** v0.1  
**Status:** PROCESS ARTIFACT — AS-IS BASELINE  
**Fecha:** 2026-10-01  
**Dominio:** Identity & Tenancy

## 1. Propósito

Registrar el estado actual verificable/documentado del sistema de Otra Ronda Más que afecta al dominio Identity & Tenancy antes de continuar con Requirements y TO-BE.

Este documento no modifica la SPEC canónica, no crea decisiones y no autoriza implementación.

## 2. AS-IS conceptual

El sistema actual distingue principalmente:

- `Empresa` como entidad de negocio/aislamiento.
- `Usuario` como identidad del panel interno.
- `Cliente` como identidad separada de la tienda online.

La documentación AS-IS indica que `Usuario` está acoplado a una `Empresa` y que `Usuario.email` es globalmente único.

En autenticación existen dos identidades JWT diferenciadas mediante `type`:

- `Usuario` — panel interno.
- `Cliente` — tienda online.

Se documentan login por password y Google OAuth 2.0 para ambas identidades.

No se encuentra en el AS-IS un modelo implementado de `Business` + `Membership` que permita reutilizar una identidad global entre múltiples Businesses.

## 3. Autorización AS-IS

La autorización existente se apoya en conceptos como:

- `RolUsuario`;
- `Permiso`;
- `UsuarioPermiso`;
- guards/permisos;
- aislamiento mediante mecanismos asociados a `Empresa`.

La documentación de conflictos identifica una diferencia estructural respecto del TO-BE: en AS-IS los roles/permisos están asociados al modelo de usuario actual, mientras que el TO-BE los sitúa en el contexto de `Membership`.

## 4. Aislamiento AS-IS

`Empresa` funciona como frontera de aislamiento del sistema actual.

La documentación registra un mecanismo `EmpresaScopedPrismaService` y límites asociados a ese aislamiento.

El modelo actual no representa todavía el concepto TO-BE de:

`User → Membership → Business`

como relación N:N.

## 5. Authentication AS-IS

Documentado:

- password + bcrypt;
- Google OAuth 2.0 / Passport;
- JWT;
- discriminación de identidad mediante `type`;
- `/auth/me` para Usuario;
- `/auth/cliente/me` para Cliente;
- consultas a base de datos en los endpoints `me`;
- variables de entorno para alta automática vía Google en cada contexto.

El AS-IS documenta además compatibilidad retroactiva para tokens antiguos sin `type`.

## 6. Riesgos documentados

`05-ASIS/05-ASIS-AUTHORIZATION.md` conserva riesgos reportados por una auditoría anterior. La propia fuente aclara que no fueron re-verificados línea por línea en la sesión correspondiente.

Entre ellos:

- posible aceptación de tokens de `Cliente` en panel sin guard por tipo;
- alta automática por Google en una empresa fijada por configuración;
- permisos insuficientemente específicos en aprobación de legajos;
- tokens de invitación intercambiables entre ciertos flujos;
- credenciales publicadas en documentación;
- ausencia documentada de rate limiting en determinados puntos;
- JWT sin revocación y token en query string en el flujo histórico de Google OAuth.

**Clasificación:** DOCUMENTADO / HEREDADO.  
**No se debe interpretar como estado actual verificado sin nueva auditoría.**

## 7. Brechas AS-IS → TO-BE ya identificadas

| Área | AS-IS | TO-BE / dirección existente | Estado |
|---|---|---|---|
| Business | `Empresa` | `Business` como entidad canónica | Decidido conceptualmente |
| Tenancy | aislamiento por `Empresa` | aislamiento por `Business` | Decidido conceptualmente |
| User | `Usuario` acoplado a Empresa | `User` global | Decidido conceptualmente |
| Membership | no existe como modelo TO-BE | User ↔ Business N:N | Decidido conceptualmente |
| Roles | `RolUsuario` / permisos actuales | Role/Permission por Membership | Decidido conceptualmente |
| Customer | identidad separada | Customer independiente de User, vínculo opcional | Decidido conceptualmente |
| Business Context | Empresa fija / contexto actual | contexto derivado de Membership | Dirección TO-BE |
| Superadmin plataforma | no existe en código inspeccionado | detalle abierto/futuro | OPEN |
| Onboarding Business | configuración fija actual | onboarding de Business | OPEN DETAIL |
| Migración | modelo actual | Empresa → Business; Usuario → User + Membership | Dirección decidida; plan abierto |
| Token | JWT actual | diseño TO-BE pendiente de detalle técnico | OPEN |
| Aislamiento físico | mecanismo actual documentado | mecanismo definitivo | OPEN |
| MFA/2FA | no definido como TO-BE cerrado | posibilidad futura | OPEN |

## 8. Autoridad de lectura

Las decisiones estructurales relevantes para este baseline son:

- D-001 — Business/Tenant.
- D-002 — User global + Membership N:N.
- D-002-bis — Customer separado de User.
- D-005 — roles/permisos en Membership.
- D-006 — autorización considerando User, Business, Membership y permisos.

D-001, D-002 y D-002-bis están registradas como OWNER-VERBATIM. D-005 y D-006 están registradas como DERIVED / RECONSTRUCTED y deben tratarse como requisitos de trabajo, no como citas textuales de Owner.

## 9. Lo que NO queda definido por este baseline

Este documento no decide:

- schema;
- nombres físicos de tablas/columnas;
- mecanismo definitivo de aislamiento;
- formato/claims del token;
- estrategia de migración;
- lifecycle técnico de Membership;
- modelo definitivo de roles;
- onboarding;
- MFA;
- superadministración;
- endpoints;
- contratos;
- invariantes;
- tests;
- implementación.

## 10. Próximo paso

Con este AS-IS establecido, el siguiente artefacto del flujo será:

**Identity & Tenancy — Requirements & Gap Definition**

Objetivo: transformar las brechas verificadas/documentadas en requisitos explícitos, distinguiendo:

`VERIFICADO → REQUISITO EXISTENTE → DECISIÓN YA CERRADA → OPEN DETAIL → REQUIERE OWNER`.

No se crearán decisiones nuevas durante esa etapa salvo que una contradicción obligue a elevar una definición al Owner.