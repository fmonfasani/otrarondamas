# Identity & Tenancy — Coexistence and Migration Strategy

**Fecha:** 2026-09-28  
**Base:** `main @ b6646e70b0fa43862f5a0d1db0c3cd22aed3537`  
**Estado:** PROPOSAL — NOT APPROVED  
**Tipo:** Transformation Design / Migration Strategy

> Documento de diseño propuesto. No modifica Prisma, runtime, datos ni contratos. No autoriza ninguna implementación.

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
