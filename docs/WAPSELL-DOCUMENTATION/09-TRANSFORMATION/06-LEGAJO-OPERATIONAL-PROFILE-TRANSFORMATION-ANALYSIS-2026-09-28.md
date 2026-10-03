# 06 — Legajo / Operational Profile Transformation Analysis

**Fecha:** 2026-09-28  
**Estado:** PROPOSAL — NOT APPROVED  
**Tipo:** Transformation Analysis / AS-IS → TO-BE  
**Ámbito:** Identity & Tenancy

> Este documento no autoriza cambios de Prisma, migraciones, endpoints ni contratos canónicos. Su objetivo es separar las responsabilidades actualmente concentradas en `Legajo` antes de diseñar el modelo físico objetivo.

## 1. Objetivo

Analizar el modelo actual `Legajo` y determinar, campo por campo y comportamiento por comportamiento, qué responsabilidades pertenecen conceptualmente a User, Membership, perfil operativo/laboral, Customer, Supplier/Proveedor y capacidades de Delivery/Fulfillment.

El objetivo es evitar una migración mecánica de `Legajo` que preserve el acoplamiento actual y contradiga el modelo Wapsell User + Membership + Business.

## 2. Evidencia AS-IS

### 2.1 Legajo actual

El modelo físico actual contiene:

- `usuarioId` opcional y único;
- `clienteId` opcional y único;
- `cuit`;
- `razonSocial`;
- `condicionIva`;
- `tipoFactura`;
- `dni`;
- `telefono`;
- `direccion`;
- `vehiculoDatos`;
- `licenciaConducir`;
- relación con `DocumentoLegajo`.

El diseño pretende que exactamente uno de `usuarioId` o `clienteId` esté informado, pero el XOR se controla en servicio y no mediante una restricción física de base de datos.

### 2.2 Reglas actuales por rol

El código de `LegajoService` mantiene una tabla explícita de campos obligatorios:

| Rol AS-IS | Campos requeridos |
|---|---|
| OWNER | CUIT, razón social, condición IVA |
| ASISTENTE_LOCAL | DNI, teléfono, dirección |
| PROVEEDOR | CUIT, razón social, tipo de factura |
| REPARTIDOR | DNI, teléfono, dirección, datos del vehículo, licencia |

Los roles `ASISTENTE_LOCAL` y `REPARTIDOR` requieren además antecedentes penales y constancia de CUIL.

Para Customer mayorista, el mismo servicio exige CUIT, razón social y condición IVA.

**Evidencia:** `apps/api/src/legajo/legajo.service.ts` y `apps/api/src/legajo/dto/actualizar-legajo.dto.ts`.

## 3. Problema estructural identificado

`Legajo` no representa una única entidad de negocio.

Actualmente concentra al menos cuatro dimensiones:

1. identificación/compliance de una persona que opera para un Business;
2. datos fiscales/comerciales;
3. perfil operativo de repartidor;
4. datos fiscales de Customer mayorista.

Además, el mismo modelo puede apuntar alternativamente a `Usuario` o `Cliente`.

Por lo tanto, la migración correcta no es `Legajo → nuevo Legajo asociado a User`, sino una descomposición conceptual previa.

## 4. Matriz campo → responsabilidad objetivo

| Campo AS-IS | Uso actual | Candidato conceptual TO-BE | Confianza | Tratamiento |
|---|---|---|---|---|
| `usuarioId` | Legajo de Usuario | User + perfil operativo/laboral contextual a Membership | Alta | No migrar como atributo de Membership sin definir perfil |
| `clienteId` | Legajo de Customer | Customer | Alta | Mantener relación con Customer |
| `cuit` | Owner / Proveedor / Customer mayorista | Perfil fiscal de la entidad correspondiente | Alta | Separar por contexto; no conservar como atributo genérico de Legajo |
| `razonSocial` | Owner / Proveedor / Customer mayorista | Perfil fiscal/comercial de la entidad correspondiente | Alta | Separar por contexto |
| `condicionIva` | Owner / Proveedor / Customer mayorista | Perfil fiscal de la entidad correspondiente | Alta | Separar por contexto |
| `tipoFactura` | Solo Proveedor | Proveedor / perfil fiscal del proveedor | Alta | No trasladar a User/Membership |
| `dni` | Asistente / Repartidor | Perfil personal/operativo | Alta | Separar de fiscalidad y Membership base |
| `telefono` | Asistente / Repartidor | Perfil de contacto personal/operativo | Media | Revisar si corresponde a User global o perfil Business |
| `direccion` | Asistente / Repartidor | Perfil personal/operativo | Media | No decidir todavía si es global o Business |
| `vehiculoDatos` | Solo Repartidor | Perfil/capacidad de Delivery | Alta | Separar de User y Membership base |
| `licenciaConducir` | Solo Repartidor | Perfil/compliance de Delivery | Alta | Separar de User y Membership base |
| `DocumentoLegajo` | Documentación sensible | Documentación de perfil operativo/compliance | Alta | Preservar; definir ownership y autorización antes de migrar |

## 5. Distinciones necesarias

### 5.1 User ≠ perfil operativo

El nuevo User debe representar la identidad global. Los datos que existen porque una persona trabaja/actúa dentro de un Business no deben convertirse automáticamente en atributos globales del User.

### 5.2 Membership ≠ Legajo

Membership representa la relación User ↔ Business y sus roles/permisos contextuales. No debe absorber automáticamente todos los datos actualmente almacenados en Legajo.

### 5.3 Customer ≠ User

Customer permanece como entidad comercial separada de User. El Legajo de Customer mayorista no debe transformarse en una variante del perfil laboral del User.

### 5.4 Proveedor ≠ Membership

`Proveedor` es una entidad comercial vinculada a compras, productos y pagos. Sus datos fiscales no deben trasladarse automáticamente al User ni a Membership.

### 5.5 Repartidor requiere una dimensión operativa propia

El rol actual `REPARTIDOR` tiene requisitos adicionales de vehículo, licencia y documentación. La migración debe preservar esta capacidad sin convertir estos campos en atributos universales del User.

## 6. DocumentoLegajo

AS-IS, `DocumentoLegajo` pertenece físicamente a `Legajo`. El servicio acepta PDF/JPG/PNG, genera nombre aleatorio, almacena fuera del webroot, conserva ruta relativa y reemplaza el documento previo del mismo tipo.

Los documentos requeridos actualmente son:

- `ANTECEDENTES_PENALES`;
- `CONSTANCIA_CUIL`.

TO-BE conceptual: la documentación debe pertenecer al perfil operativo/compliance que la necesita, no al concepto genérico de User.

Debe preservarse asociación, tipo, vencimiento, metadata, almacenamiento seguro, autorización de lectura y reemplazo. La forma física exacta queda OPEN.

## 7. Lo que NO debe hacerse

No realizar como migración mecánica:

1. Renombrar `Legajo` a `UserProfile`.
2. Mover todos sus campos directamente a `User`.
3. Mover todos sus campos directamente a `Membership`.
4. Convertir `usuarioId` en la única relación de identidad.
5. Eliminar `clienteId` y asumir que Customer siempre es User.
6. Convertir `Proveedor` en Membership automáticamente.
7. Mapear `ASISTENTE_LOCAL` automáticamente a `Vendedor`.
8. Mapear `ASISTENTE_LOCAL` automáticamente a `Gestor de Stock`.
9. Convertir `REPARTIDOR` en un simple atributo de User.
10. Eliminar documentación sensible durante la migración.

## 8. Decisiones que siguen OPEN

### R-03.1 — Modelo de perfil operativo

Definir si Wapsell tendrá un único perfil operativo por Membership, perfiles especializados por capacidad/rol, o una combinación de perfil base + extensiones especializadas.

### R-03.2 — Ownership de datos personales

Definir qué datos son globales de User, específicos de Membership/Business o específicos de una capacidad operativa. En particular: teléfono, dirección y DNI.

### R-03.3 — Delivery

Definir dónde viven vehículo, licencia, documentación asociada y estado de habilitación.

### R-03.4 — Fiscalidad

Definir ownership de CUIT, razón social, condición IVA y tipo de factura. El análisis indica que no todos pertenecen a la misma entidad.

### R-03.5 — Histórico

Definir si la transformación conserva snapshots históricos, documentos reemplazados, fechas de vigencia y auditoría de cambios.

## 9. Estado de blockers

| Blocker | Estado | Evidencia |
|---|---|---|
| R-01 Roles / Membership mapping | OPEN | análisis de roles anterior |
| R-03 Legajo / Operational Profile | OPEN | este documento |
| Customer ↔ User | Dirección resuelta; implementación OPEN | Identity/Tenancy analysis |
| Supplier ↔ Membership | Acotado; implementación OPEN | blocker analysis |
| Permissions target | Dirección resuelta; implementación OPEN | Membership → Role → Permission |

## 10. Siguiente artefacto

Antes de tocar Prisma, el siguiente documento debería ser:

**Authorization + Profile Ownership Contract**

Debe cerrar conceptualmente:

1. qué representa User;
2. qué representa Membership;
3. qué representa Customer;
4. qué representa Supplier;
5. qué representa un perfil operativo;
6. qué datos son globales;
7. qué datos son Business-scoped;
8. cómo se autorizan documentos sensibles;
9. cómo se preserva el histórico.

Después de ese contrato recién corresponde diseñar el modelo físico definitivo y la migración.

## 11. Evidencia

**VERIFICADO POR CÓDIGO**

- `apps/api/prisma/schema.prisma`
- `apps/api/src/legajo/legajo.service.ts`
- `apps/api/src/legajo/dto/actualizar-legajo.dto.ts`

**DOCUMENTADO**

- Identity & Tenancy TO-BE.
- Decision Register.
- Role/Membership Mapping Analysis.
- Identity/Tenancy Blocker Analysis.

**NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE**

- modelo físico definitivo del perfil operativo;
- ownership definitivo de teléfono/dirección/DNI;
- modelo definitivo de Delivery Profile;
- política definitiva de histórico documental;
- decisión final sobre fiscal profile.

## 12. Conclusión

El hallazgo principal es que **Legajo no debe migrarse como una entidad única del nuevo modelo Wapsell**.

La transformación debe conservar los datos y capacidades actuales, pero separar conceptualmente:

**User → Membership → perfil operativo**

y mantener fuera de esa cadena:

**Customer**  
**Supplier**  
**Delivery-specific data**  
**Fiscal profiles**  
**Sensitive compliance documents**

No se realizaron cambios de Prisma, migraciones, runtime ni datos.
