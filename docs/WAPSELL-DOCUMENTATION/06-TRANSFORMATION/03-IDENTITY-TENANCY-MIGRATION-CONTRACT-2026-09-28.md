# Identity & Tenancy — Migration Contract

**Fecha:** 2026-09-28  
**Estado:** PROPOSAL — NOT APPROVED  
**Tipo:** Transformation / Contract  
**Dependencia:** 01-PHYSICAL-TARGET-MODEL-IDENTITY-TENANCY-2026-09-28.md + 02-IDENTITY-TENANCY-COEXISTENCE-MIGRATION-STRATEGY-2026-09-28.md

> Este contrato traduce la estrategia de migración en invariantes y criterios verificables. No autoriza migrations Prisma ni cambios runtime.

## 1. Alcance

Cubre exclusivamente Identity & Tenancy: User global, Business, Membership, Role, Permission, Customer, autenticación, Business Context, aislamiento y migración AS-IS → TO-BE.

## 2. Modelo contractual

### C-UT-01 — User global

Un User representa una identidad global de Wapsell.

User != Business. User != Membership.

Un User no debe contener la pertenencia a un único Business como propiedad estructural del modelo target.

### C-UT-02 — Membership

La relación User ↔ Business se expresa mediante Membership.

Membership = User + Business + Role + State.

Una Membership válida es necesaria para operar dentro de un Business.

### C-UT-03 — Business Context

Toda operación autenticada que acceda a recursos tenant-scoped debe resolverse con un Business Context válido.

Authenticated User → Membership → Business Context.

El Business Context no debe derivarse exclusivamente de un empresaId legacy.

### C-UT-04 — Role contextual

El Role utilizado para autorización pertenece a la Membership activa.

Un Role de Business A no se aplica automáticamente a Business B.

### C-UT-05 — Customer independiente

Customer es una identidad comercial separada de User.

Un Customer puede existir sin User.

Un vínculo Customer → User no crea Membership.

### C-UT-06 — Business ownership

Todo recurso tenant-scoped pertenece a exactamente un Business.

No debe existir una operación válida que permita que una Membership de A opere sobre recursos de B.

## 3. Contrato de autenticación

### C-AUTH-01 — Identity

El token identifica al User.

### C-AUTH-02 — Membership

El acceso a un Business requiere Membership válida.

### C-AUTH-03 — Permission

La autorización efectiva debe considerar:

User → Membership → Role → Permission.

El mecanismo exacto para permisos adicionales directos queda abierto hasta resolver R-02.

### C-AUTH-04 — Token legacy

Los tokens AS-IS pueden existir únicamente durante la coexistencia si la implementación lo requiere.

Después del cutover:
- tokens legacy son inválidos;
- usuarios deben autenticarse nuevamente;
- ningún endpoint target debe depender de un empresaId legacy contenido en el token.

### C-AUTH-05 — Business selection

El mecanismo exacto para seleccionar Business cuando un User tenga múltiples Memberships queda abierto.

Pero la selección debe terminar resolviendo una Membership válida.

## 4. Contrato de aislamiento

### C-ISO-01

Una Membership de Business A no puede leer datos de Business B.

### C-ISO-02

Una Membership de Business A no puede crear recursos pertenecientes a Business B.

### C-ISO-03

Una Membership de Business A no puede modificar, eliminar o procesar recursos de Business B.

### C-ISO-04

Customer, catálogo, stock, ventas, pedidos, compras, caja y pagos deben conservar aislamiento por Business cuando sean tenant-scoped.

### C-ISO-05

Los mecanismos de scope existentes no deben considerarse compatibles con TO-BE sólo por renombrar empresaId.

El Business Context debe ser la fuente del scope target.

## 5. Contrato de migración de identidad

### C-MIG-01 — Empresa → Business

Toda Empresa válida debe tener una representación Business equivalente.

### C-MIG-02 — Usuario → User

Todo Usuario válido debe tener una identidad User equivalente.

### C-MIG-03 — Usuario + Empresa → Membership

Toda relación válida Usuario→Empresa debe producir una Membership target.

### C-MIG-04 — Customer

Todo Cliente debe conservar su Business.

No se crea User automáticamente salvo decisión explícita.

### C-MIG-05 — Trazabilidad

Debe existir mapping verificable entre IDs legacy y target mientras ambas estructuras coexistan.

### C-MIG-06 — Idempotencia

La operación de backfill debe poder ejecutarse nuevamente sin crear duplicados.

### C-MIG-07 — Reconciliación

La migración sólo puede avanzar al siguiente gate si los invariantes críticos pasan.

## 6. Contrato de roles

El mapping de roles permanece bloqueado.

AS-IS:
- OWNER
- ASISTENTE_LOCAL
- PROVEEDOR
- REPARTIDOR

TO-BE documentado:
- Owner/Admin
- Vendedor
- Gestor de Stock
- Cliente/Comprador
- Proveedor

No se permite inferir:
ASISTENTE_LOCAL = VENDEDOR
ni REPARTIDOR = Gestor de Stock
ni otra equivalencia no aprobada.

El mapping debe quedar registrado antes de F2/F3 de la migración física.

## 7. Contrato de permisos

El modelo actual es:
Usuario → UsuarioPermiso → Permiso

El modelo target propuesto es:
Membership → Role → Permission

Queda pendiente resolver si el target permite permisos adicionales directos por Membership.

Hasta cerrar esta decisión:
- no eliminar UsuarioPermiso;
- no convertir automáticamente UsuarioPermiso en RolePermission;
- no alterar permisos efectivos.

## 8. Contrato de Legajo

Legajo permanece en AS-IS durante la migración inicial.

No se autoriza moverlo automáticamente a User, Membership o Customer.

Antes de modificarlo debe existir contrato específico que defina ownership, estados, documentos, reglas de aprobación, relación con empleados y relación con clientes.

## 9. Contrato de Proveedor

Proveedor mantiene su comportamiento AS-IS durante la coexistencia.

No se convierte automáticamente en Membership.

Debe definirse si el Proveedor es entidad comercial externa, identidad de usuario, Membership o combinación.

## 10. Contrato de Customer ↔ User

El vínculo sólo puede establecerse mediante una regla de identificación explícita y verificable.

No se debe asociar por coincidencia aproximada de nombre, email o teléfono sin una regla aprobada.

## 11. Contrato de coexistencia

Durante coexistencia pueden coexistir AS-IS + Target + Mapping.

Debe existir una fuente operativa definida para cada dato.

No se permite que dos modelos reciban escrituras independientes sin estrategia de reconciliación.

La elección entre single-write target y dual-write requiere análisis de dependencias.

## 12. Contrato de cutover

El cutover requiere:
1. baseline;
2. backfill;
3. reconciliación;
4. validación de aislamiento;
5. validación de autorización;
6. activación target;
7. invalidación de tokens;
8. re-login;
9. validación post-cutover.

Si falla una validación crítica, no se declara completado el cutover.

## 13. Invariantes verificables

| ID | Invariante |
|---|---|
| I-UT-01 | Cada operación tenant-scoped tiene Membership válida |
| I-UT-02 | Membership A no accede a Business B |
| I-UT-03 | Role pertenece a Membership |
| I-UT-04 | User puede tener múltiples Memberships |
| I-UT-05 | Customer puede existir sin User |
| I-UT-06 | Customer → User no implica Membership |
| I-UT-07 | Recurso tenant-scoped pertenece a un único Business |
| I-UT-08 | Backfill es idempotente |
| I-UT-09 | Mapping legacy → target es trazable |
| I-UT-10 | Token legacy no autoriza después del cutover |
| I-UT-11 | Re-login genera contexto target |
| I-UT-12 | Permisos efectivos no se pierden durante migración |

## 14. Evidencia requerida

Cada gate debe producir evidencia clasificable como:
- VERIFICADO POR CÓDIGO;
- VERIFICADO POR TEST;
- VERIFICADO POR EJECUCIÓN;
- DOCUMENTADO;
- NO DETERMINABLE.

No se considera suficiente que una migration compile.

## 15. Gates contractuales

| Gate | Evidencia mínima |
|---|---|
| C0 | Baseline reproducible |
| C1 | Target structures verificadas |
| C2 | Mapping completo |
| C3 | Backfill + idempotencia |
| C4 | Reconciliación |
| C5 | Auth target |
| C6 | Isolation |
| C7 | Cutover + re-login |
| C8 | Operación comercial |
| C9 | Legacy cleanup autorizado |

## 16. Bloqueantes

No avanzar a implementation si siguen abiertos:
- R-01 mapping de roles;
- R-02 permisos directos;
- R-03 Legajo;
- R-04 Proveedor;
- R-05 Customer ↔ User,

cuando afecten el contrato físico o de autorización.

## 17. No decidido

Este contrato no fija:
- nombres Prisma;
- columnas finales;
- IDs;
- índices;
- FKs concretas;
- RLS;
- JWT definitivo;
- mecanismo UI/API de selección de Business;
- migration SQL/Prisma;
- dual-write;
- cleanup final.

## 18. Próximo paso

Cerrar primero los cinco bloqueantes de diseño.

Después:

Physical Target Model aprobado → Migration Contract aprobado → Prisma migration design → runtime contract → tests → implementación incremental.

Hasta entonces, no tocar schema ni autorización productiva.
