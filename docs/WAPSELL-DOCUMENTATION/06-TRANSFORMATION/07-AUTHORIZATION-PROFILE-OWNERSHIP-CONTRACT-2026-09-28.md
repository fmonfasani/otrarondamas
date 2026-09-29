# 07 — Authorization + Profile Ownership Contract

**Fecha:** 2026-09-28  
**Estado:** PROPOSAL — NOT APPROVED  
**Tipo:** Transformation Contract  
**Ámbito:** Identity & Tenancy

> Este contrato propone límites conceptuales para preparar el modelo físico. No autoriza cambios de Prisma, migraciones, runtime ni contratos canónicos.

## 1. Propósito

Cerrar las fronteras de ownership que quedaron abiertas después del análisis de Roles, Membership y Legajo.

La regla central es:

`User` identifica a la persona global.  
`Membership` representa su relación con un `Business`.  
El perfil operativo describe capacidades/datos necesarios para actuar dentro de esa relación.  
`Customer` y `Supplier` siguen siendo entidades comerciales independientes.

## 2. Ownership contractual

| Concepto | Representa | Scope | NO debe contener |
|---|---|---|---|
| User | Identidad global de una persona | Platform | rol de Business, stock, datos comerciales de Customer |
| Business | Negocio/tenant y propietario de recursos comerciales | Platform | identidad de personas |
| Membership | Relación User ↔ Business + contexto de autorización | Business | datos fiscales de Customer/Supplier |
| Role | Perfil de responsabilidades/autorización | Membership | identidad |
| Permission | Capacidad atómica | Membership/Role | datos de negocio |
| Operational Profile | Datos necesarios para operar dentro de un Business | Business/Membership, pendiente de modelo físico | identidad global |
| Customer | Relación comercial comprador ↔ Business | Business | rol laboral |
| Supplier | Entidad comercial proveedora | Business | Membership implícita |
| Fiscal Profile | Datos fiscales de la entidad que los requiere | Según entidad | autorización |
| Delivery Profile | Capacidades/datos específicos de reparto | Business/Membership, pendiente | User global |

## 3. User

### Ownership

El User es global a Wapsell.

Debe contener únicamente atributos necesarios para representar y autenticar la identidad global, salvo futuras decisiones explícitas.

### No pertenece al User

No deben migrarse automáticamente a User:

- rol dentro de un Business;
- permisos;
- Business activo;
- datos de vehículo;
- licencia de conducir;
- documentación laboral;
- datos fiscales de Supplier;
- datos comerciales de Customer.

### Datos aún OPEN

No se decide aquí el ownership definitivo de:

- teléfono;
- dirección;
- DNI.

La decisión debe considerar que un mismo User puede tener Memberships en múltiples Businesses.

## 4. Membership

Membership representa:

`User ↔ Business`

y es el límite principal de pertenencia y autorización.

Debe poder expresar conceptualmente:

- User;
- Business;
- Role;
- estado de la relación;
- autorización derivada.

No debe almacenar directamente:

- CUIT de Customer;
- razón social de Supplier;
- stock;
- vehículo;
- documentos sensibles, salvo que el modelo físico final determine una referencia a un perfil operativo.

## 5. Role y Permission

Dirección contractual propuesta:

`User → Membership → Business → Role → Permission`

Un Permission aislado no concede acceso a otro Business.

El catálogo de roles Wapsell continúa siendo el definido en la especificación/proyecto:

- Owner/Admin
- Vendedor
- Gestor de Stock
- Cliente/Comprador
- Proveedor

Los roles AS-IS:

- OWNER
- ASISTENTE_LOCAL
- PROVEEDOR
- REPARTIDOR

no se deben convertir automáticamente uno a uno.

El análisis anterior mantiene R-01 OPEN.

## 6. Operational Profile

El Operational Profile representa información necesaria porque el User desempeña una función dentro de un Business.

Debe poder cubrir conceptualmente:

- datos personales necesarios para operar;
- compliance;
- información requerida por la función;
- estado de habilitación;
- extensiones especializadas.

### Principio

No asumir:

`User = Employee Profile`

ni:

`Membership = Operational Profile`

La relación exacta entre ambos queda pendiente del modelo físico.

## 7. Delivery Profile

Los datos de repartidor requieren tratamiento especializado:

- vehículo;
- licencia;
- documentación requerida;
- estado de habilitación.

Estos datos no deben ser atributos universales de User.

La capacidad de reparto debe depender de una relación/rol/capacidad dentro del Business.

El modelo físico queda OPEN.

## 8. Customer

Customer es una entidad comercial separada de User.

Puede:

- existir sin User;
- estar vinculada opcionalmente a un User;
- tener historial comercial;
- tener pedidos;
- tener ventas;
- tener cuenta corriente/deuda;
- tener condiciones comerciales.

### Fiscal data

Cuando CUIT, razón social y condición IVA representan al Customer, pertenecen conceptualmente al Customer o a su perfil fiscal.

No deben migrarse a User por el mero hecho de que Customer tenga un User vinculado.

## 9. Supplier

Supplier/Proveedor es una entidad comercial del Business.

Puede participar en:

- compras;
- productos/proveedor;
- pagos;
- devoluciones.

La existencia de Supplier no crea automáticamente una Membership.

Si posteriormente un Supplier necesita autenticarse, deberá existir una relación explícita entre identidad y Business, preservando la separación entre:

`Supplier` y `Membership`.

## 10. Fiscal Profile

Los datos actuales de Legajo:

- CUIT;
- razón social;
- condición IVA;
- tipo de factura;

no forman un único perfil universal.

Su ownership depende del contexto:

| Contexto | Owner conceptual |
|---|---|
| Owner / entidad del Business | Business / fiscal profile del Business |
| Customer mayorista | Customer / fiscal profile |
| Supplier | Supplier / fiscal profile |

La forma física definitiva queda OPEN.

## 11. Sensitive Documents

Los documentos de Legajo no deben considerarse atributos de User.

Debe preservarse:

- tipo;
- vencimiento;
- metadata;
- almacenamiento protegido;
- autorización de acceso;
- asociación con el perfil que los requiere.

La migración debe impedir pérdida o exposición de documentos.

El histórico de documentos reemplazados queda OPEN.

## 12. Authorization Contract

Toda operación protegida debe resolverse conceptualmente mediante:

`Authenticated User`
→ `Business Context`
→ `Membership`
→ `Role / Permission`
→ `Business Rule`
→ `Resource`
→ `Action`

Reglas mínimas:

1. Un JWT válido no implica autorización sobre un Business.
2. El Business Context debe validarse contra una Membership válida.
3. Un User sin Membership válida no tiene acceso al Business.
4. Un Permission de Business A no autoriza Business B.
5. El recurso comercial debe pertenecer al Business Context.
6. Las reglas de dominio pueden imponer restricciones adicionales al Permission.
7. Los documentos sensibles requieren autorización específica; no deben quedar accesibles solo por autenticación.

## 13. Business Context

El Business activo no debe depender únicamente de un `businessId` enviado por el cliente.

Debe existir una comprobación equivalente a:

`User`
+ `Business`
+ `Membership válida`
+ `Permission requerido`

antes de ejecutar una operación protegida.

El mecanismo técnico concreto queda OPEN.

## 14. Mapping de Legajo

| AS-IS | Destino conceptual |
|---|---|
| Legajo.usuarioId | User + Operational Profile |
| Legajo.clienteId | Customer |
| CUIT de Customer | Customer / Fiscal Profile |
| CUIT de Supplier | Supplier / Fiscal Profile |
| razón social de Customer | Customer / Fiscal Profile |
| razón social de Supplier | Supplier / Fiscal Profile |
| condición IVA | Fiscal Profile según contexto |
| tipoFactura | Supplier / Fiscal Profile |
| DNI | Operational/Profile o User, OPEN |
| teléfono | User o Operational Profile, OPEN |
| dirección | User o Operational Profile, OPEN |
| vehículo | Delivery Profile |
| licencia | Delivery Profile / compliance |
| DocumentoLegajo | Operational/Compliance Document |

## 15. Invariantes propuestas

### I-PO-01 — Global User
Un User representa una única identidad global.

### I-PO-02 — Membership contextual
Todo acceso Business-scoped requiere Membership válida.

### I-PO-03 — Role contextual
El Role pertenece al contexto de Membership.

### I-PO-04 — Business isolation
Un recurso comercial no puede cruzar Business.

### I-PO-05 — Customer independence
Customer puede existir sin User.

### I-PO-06 — Supplier independence
Supplier no implica Membership.

### I-PO-07 — Operational separation
Datos específicos de una función operativa no se convierten automáticamente en atributos globales de User.

### I-PO-08 — Sensitive-document protection
Los documentos sensibles requieren autorización y no pueden exponerse por una referencia directa.

### I-PO-09 — No destructive migration
La transformación no puede perder Customer, Supplier, Legajo ni documentos históricos.

## 16. Decisiones que permanecen abiertas

Este contrato NO cierra:

1. modelo físico de Operational Profile;
2. ownership definitivo de teléfono;
3. ownership definitivo de dirección;
4. ownership definitivo de DNI;
5. modelo físico de Delivery Profile;
6. modelo físico de Fiscal Profile;
7. histórico/versionado de documentos;
8. mapping definitivo AS-IS → roles Wapsell;
9. catálogo físico de Permission;
10. formato definitivo de sesión/token.

## 17. Gate para modelo físico

No iniciar migración Prisma de Identity/Tenancy hasta que como mínimo estén resueltos:

- R-01 Role mapping;
- R-03 Operational Profile;
- ownership de datos personales;
- Delivery Profile;
- fiscal ownership;
- política de documentos;
- autorización sobre documentos sensibles.

## 18. Evidencia

**VERIFICADO POR CÓDIGO**

- `apps/api/prisma/schema.prisma`
- `apps/api/src/legajo/legajo.service.ts`
- `apps/api/src/legajo/dto/actualizar-legajo.dto.ts`
- Auth/JWT/Permissions actuales.

**DOCUMENTADO**

- Identity & Tenancy Spec.
- Decision Register.
- Physical Target Model.
- Migration Contract.
- Blocker Analysis.
- Role/Membership Mapping Analysis.
- Legajo / Operational Profile Transformation Analysis.

**PROPUESTA / NO APROBADO**

Todo el modelo contractual de este documento.

## 19. Conclusión

La frontera contractual queda propuesta de esta manera:

`Platform`
→ `User`

`User`
→ `Membership`
→ `Business`
→ `Role / Permission`

`Membership`
→ `Operational Profile`
→ `Delivery Profile` cuando corresponda

`Business`
→ `Customer`
→ `Supplier`
→ recursos comerciales

`Customer / Supplier / Business`
→ sus respectivos perfiles fiscales

Esta separación permite transformar el sistema sin convertir el actual `Legajo` en un nuevo punto de acoplamiento.

**No se realizaron cambios de Prisma, migraciones, runtime ni datos.**
