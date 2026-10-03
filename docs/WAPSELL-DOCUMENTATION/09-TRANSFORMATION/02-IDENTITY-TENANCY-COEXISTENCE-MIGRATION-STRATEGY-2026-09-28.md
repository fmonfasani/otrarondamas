# Identity & Tenancy — Coexistence and Migration Strategy

**Fecha:** 2026-09-28  
**Base:** `main @ b6646e70b0fa43862f5a0d1db0c3cd22aed3537`  
**Estado:** PROPOSAL — NOT APPROVED  
**Tipo:** Transformation Design / Migration Strategy

> Documento de diseño propuesto. No modifica Prisma, runtime, datos ni contratos. No autoriza ninguna implementación.

> **Trazabilidad de rulings (R1, 2026-09-30) — nota aditiva; el texto de este documento no se modificó.**
>
> - **Source / Authority:** `04-DECISIONS/13-OR-001-OWNER-RULING-CLOSURE.md` — OR-001, `CLOSED` 2026-09-28.
>   P1-A: `Empresa` → `Business` (destino final). P2-C: convivencia temporal de ambos modelos. P3: continuidad
>   sin downtime en Ventas, Caja, Catálogo, Compras, Tienda Online, Auth y Datos históricos. P4: `"Roonda"` →
>   `"Otra Ronda Más"`. P5-B: documentar y luego implementar solo tras la aprobación del Owner de la
>   especificación (puerta no superada).
> - **Source / Authority:** `04-DECISIONS/15-OR-002-A-OWNER-RULING.md` — OR-002-A, `CLOSED` 2026-09-28: dirección
>   conceptual `User` → `Membership` N:N → `Business`; `Customer` independiente con vínculo opcional. No
>   autoriza implementación física.
> - **Estado de este documento:** sigue siendo `PROPOSAL — NOT APPROVED`. Las fases F0–F8, los gates G0–G10,
>   las alternativas A/B de §4 (dual-write no decidido), el rollback de §5 y el cutover son **propuesta**, no
>   decisión del Owner. OR-001 deja explícitamente `OPEN`: criterio de finalización de la coexistencia,
>   rollback, mecanismo técnico de compatibilidad, estrategia de deployment, migraciones Prisma, modelo físico
>   y mecanismo de aislamiento. Ninguna duración ni orden de release se deriva del ruling.
> - **P3 sin propagar:** este documento solo menciona *"continuidad operativa"* de forma general (§1); sus
>   fases y gates no contienen el requisito de continuidad sin downtime sobre los 7 dominios. No se infiere
>   aquí ningún mecanismo para cumplirlo.
> - **Atribución sin respaldo localizado (`OWNER CONFIRMATION REQUIRED`):** §10 rotula *"Invalidación de
>   sesiones/tokens y re-login: DOCUMENTADO / OWNER RULING"* (y §2 lo afirma como restricción). Ni OR-001 ni
>   OR-002-A contienen esa decisión, y su relación con P3 (Auth sin downtime) no está determinada. La rotulación
>   `Coexistencia: OWNER RULING` sí está respaldada por OR-001 P2-C. No se modificó ninguna de las dos líneas.
> - **Alcance de P1-A no determinado:** §9 lista *"eliminación de Empresa"* como decisión no tomada. OR-001
>   fija el destino `Business` pero no define si el renombrado es físico o conceptual. Ambigüedad preservada;
>   requiere decisión del Owner.

> **Propagación R3 (2026-09-30) — nota aditiva; ninguna línea anterior fue modificada ni borrada (se conservan como evidencia histórica de R1).**
> **Source / Authority:** `04-DECISIONS/18-R2-OWNER-DECISION-CLOSURE-REPORT.md` §1 y `04-DECISIONS/00-DECISION-REGISTER.md` §8.
> - **Atribución de re-login/invalidación — respaldada desde R2:** OR-002-E (Owner, 2026-09-30) establece
>   compatibilidad temporal de sesiones y tokens legacy, respetando la continuidad de Auth de OR-001 P3, y que
>   al finalizar la transición se invalidan las sesiones y se requiere un nuevo login. El rótulo de §10
>   *"DOCUMENTADO / OWNER RULING"* queda respaldado **solo en ese alcance conceptual**; diseño del token, formato,
>   duración y momento del corte siguen `OPEN` (no se infiere ningún mecanismo).
> - **Alcance de P1-A — determinado en destino:** P1-A opción C: `Empresa` → `Business` aplica a la terminología
>   documental y conceptual **y** al modelo persistente, como destino final. La ambigüedad sobre "eliminación de
>   Empresa" (§9) se limita ahora al **cuándo y el cómo**, que siguen `OPEN` (tablas, columnas, FK, índices,
>   constraints, compatibilidad, coexistencia, migración, rollback, deploy, cutover). No se autoriza ni se diseña
>   la migración física.
> - **Coexistencia — determinada en dirección:** OR-002-B: transición incremental, coexistencia temporal y
>   acotada, compatible con OR-001 P2-C; no prolongada ni permanente. Mecanismo técnico, duración y criterio de fin
>   siguen `OPEN`. Las alternativas A/B de §4, F0–F8, G0–G10, rollback (§5) y cutover siguen siendo **propuesta**.
> - **P3 sin propagar:** sigue sin propagarse a fases/gates de este documento; permanece como requisito de OR-001
>   que la especificación técnica deberá satisfacer.
> - **OR-002-F / P5-B:** `ESPECIFICACIÓN → APROBACIÓN → IMPLEMENTACIÓN`. Especificación técnica = `NOT APPROVED`;
>   implementación = `NOT AUTHORIZED`. Este documento sigue siendo `PROPOSAL — NOT APPROVED`.

## 1. Objetivo

Migrar progresivamente de `Usuario → Empresa` a `User → Membership → Business`, preservando datos históricos, aislamiento por Business, continuidad operativa y trazabilidad.

La coexistencia es temporal. El modelo final debe resolver autorización mediante User → Membership → Business.

## 2. Restricciones

- Preservar datos y relaciones existentes.
- Mantener el modelo AS-IS operativo durante la coexistencia.
- No eliminar estructuras legacy antes de reconciliar el modelo target.
- El cutover final invalida sesiones/tokens existentes y requiere re-login.
- Una identidad sin Membership válida no obtiene acceso al Business.
- No asumir compatibilidad indefinida entre JWT legacy y target.

## 3. Fases

### F0 — Baseline

Registrar:

- Empresa
- Usuario
- UsuarioPermiso
- Permiso
- Cliente
- Invitacion
- entidades con `empresaId`
- relaciones de Legajo

Detectar inconsistencias: referencias rotas, permisos duplicados, roles no esperados, problemas de identidad y clientes sin cuenta.

**Salida:** snapshot reproducible y excepciones documentadas.

### F1 — Target structures

Agregar conceptualmente junto al legacy:

- Business
- User
- Membership
- Role
- Permission / reutilización de Permiso
- RolePermission
- Customer con vínculo opcional a User

Durante esta etapa Empresa, Usuario y `empresaId` permanecen.

No generar todavía una migration Prisma a partir de este documento.

### F2 — Backfill

Mapping propuesto:

| AS-IS | Target |
|---|---|
| Empresa | Business |
| Usuario | User |
| Usuario + empresaId | Membership |
| Usuario.rol | Membership.role |
| Permiso | Permission |
| Cliente | Customer |
| Invitacion.empresaId | Invitacion.businessId |
| empresaId de recursos | businessId |

El mapping de permisos directos y roles queda abierto.

Los IDs legacy deben permanecer trazables durante la migración.

No crear automáticamente un User para cada Customer sin decisión explícita.

### F3 — Reconciliación

Checks mínimos:

1. Cada Empresa válida tiene Business equivalente.
2. Cada Usuario tiene User equivalente.
3. Cada relación Usuario→Empresa válida tiene Membership.
4. Cada Membership apunta a Business existente.
5. Cada Membership tiene Role válido.
6. Los permisos efectivos AS-IS son comparables con los target.
7. Cada Customer conserva su Business.
8. Cada recurso comercial conserva exactamente un Business owner.
9. Legajo no sufre reasignaciones no documentadas.

No avanzar si falla un check crítico.

### F4 — Compatibility Layer

Durante la coexistencia puede existir una traducción temporal:

`legacy empresaId → Business Context`

y:

`legacy Usuario → User + Membership`

Debe ser explícita, acotada y temporal. No debe convertirse en una segunda fuente de verdad permanente.

### F5 — Auth Context

El contexto target debe resolverse conceptualmente como:

`Authenticated User → Membership → Business → Role → Permission`

El JWT no debe ser la fuente definitiva de autorización del Business.

Debe verificarse identidad, Membership, Business contextual, Role y Permission.

### F6 — Cutover

Secuencia propuesta:

1. reconciliación final;
2. activar resolución por User → Membership → Business;
3. invalidar sesiones/tokens existentes;
4. requerir re-login;
5. validar nuevos tokens;
6. validar acceso al Business correcto;
7. validar rechazo de acceso a otros Business.

### F7 — Migración comercial

Migrar progresivamente `empresaId → businessId`.

Orden a validar contra dependencias reales:

1. referencias;
2. catálogo;
3. clientes;
4. inventario;
5. compras;
6. ventas;
7. pedidos;
8. pagos/caja;
9. auditoría;
10. invitaciones.

No realizar un cambio monolítico de todas las relaciones.

### F8 — Legacy cleanup

Sólo después de reconciliación, validación funcional, autorización target estable y ausencia de consumidores legacy conocidos:

1. retirar compatibility layer;
2. retirar columnas legacy;
3. retirar relaciones Empresa;
4. retirar enums/roles legacy sin consumidores;
5. eliminar estructuras legacy cuando corresponda.

Cada eliminación debe ser independiente y verificable.

## 4. Dual-read / dual-write

No se asume dual-write por defecto.

**Alternativa A:** backfill + read target + write target. Menor coexistencia, pero exige migrar rápidamente consumidores.

**Alternativa B:** dual-write temporal. Facilita transición gradual, pero introduce riesgo de divergencia y requiere reconciliación continua.

La elección debe hacerse con evidencia de dependencias reales.

## 5. Rollback

### Antes del cutover

Mantener AS-IS como fuente operativa, conservar target y corregir/repetir backfill.

### Durante el cutover

Debe existir procedimiento para restaurar el contrato anterior si falla la validación, invalidar tokens del intento y preservar los datos target.

### Después del cutover

La eliminación de legacy se considera irreversible. Por ello cleanup requiere validación completa y una ventana de observación definida.

## 6. Pruebas obligatorias

### Identity

- User puede tener múltiples Memberships.
- Membership pertenece a un único Business.
- Business puede tener múltiples Users.
- Sin Membership no hay acceso.

### Isolation

- Membership de A no permite datos de B.
- User con A+B sólo opera sobre el Business contextual.
- Customer y stock no cruzan Business.

### Authorization

- Role pertenece a Membership.
- Permisos efectivos se conservan.
- Cambiar Membership cambia el contexto.
- Tokens legacy dejan de ser válidos después del cutover.

### Data preservation

Validar ventas, pedidos, pagos, caja, compras, inventario, clientes, proveedores y auditoría.

## 7. Riesgos que bloquean la implementación

### R-01 — Mapping de roles

AS-IS: OWNER, ASISTENTE_LOCAL, PROVEEDOR, REPARTIDOR.

TO-BE documentado: Owner/Admin, Vendedor, Gestor de Stock, Cliente/Comprador, Proveedor.

No existe mapping uno-a-uno verificado.

### R-02 — Permisos

Debe decidirse entre:

`Membership → Role → Permission`

y:

`Membership → Role → Permission + permisos adicionales directos`

### R-03 — Legajo

Definir qué parte pertenece a User, Membership, Customer o una entidad operativa separada.

### R-04 — Proveedor

Definir si representa entidad comercial externa, identidad Wapsell, Membership o combinación.

### R-05 — Customer ↔ User

Definir qué evidencia permite asociar un Customer existente a un User.

## 8. Gates técnicos propuestos

| Gate | Condición |
|---|---|
| G0 | Baseline reproducible |
| G1 | Target structures creadas |
| G2 | Backfill completado |
| G3 | Reconciliación aprobada |
| G4 | Compatibility validada |
| G5 | Auth target validada |
| G6 | Re-login + invalidación validado |
| G7 | Business isolation validado |
| G8 | Referencias comerciales migradas |
| G9 | Operación target estable |
| G10 | Legacy cleanup autorizado |

Estos gates son propios de esta propuesta; no constituyen una secuencia canónica previamente aprobada.

## 9. Decisiones no tomadas

Este documento no decide:

- nombres físicos finales;
- IDs definitivos;
- mapping definitivo de roles;
- Role/Permission final;
- diseño de Legajo;
- Customer/User;
- dual-write;
- RLS;
- eliminación de Empresa;
- formato definitivo del JWT;
- selección de Business en UI/API;
- migrations concretas.

## 10. Evidencia

- Usuario → Empresa: **VERIFICADO POR CÓDIGO**.
- JWT con empresaId/rol/permisos: **VERIFICADO POR CÓDIGO**.
- Tenant scope por empresaId: **VERIFICADO POR CÓDIGO**.
- User + Membership + Customer separado: **DOCUMENTADO / DIRECCIÓN**.
- Coexistencia: **DOCUMENTADO / OWNER RULING**.
- Invalidación de sesiones/tokens y re-login: **DOCUMENTADO / OWNER RULING**.
- Fases, backfill, gates y rollback: **PROPUESTA — NO APROBADA**.

## 11. Próximo artefacto

Antes de Prisma migrations o cambios runtime: **Identity & Tenancy Migration Contract**, con contratos verificables para mapping, invariantes, autorización, Business Context, sesiones/tokens, compatibilidad, reconciliación y cutover.

No implementar la migration física hasta cerrar R-01 a R-05 que afecten el contrato.
