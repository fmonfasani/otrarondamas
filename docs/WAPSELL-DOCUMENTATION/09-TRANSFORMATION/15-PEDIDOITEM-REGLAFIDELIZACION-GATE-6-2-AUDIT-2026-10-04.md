# PedidoItem → ReglaFidelizacion — Gate 6.2 Audit
## Relation Isolation Capability Expansion — 2026-10-04

**Estado:** AUDIT COMPLETED — TEST DESIGN REQUIRED  
**Gate:** 6 — Coverage Expansion  
**Slice:** 6.2 — PedidoItem → ReglaFidelizacion  
**Scope:** Wapsell Core — Multi-Tenant Persistence / Relation Isolation  
**Baseline:** a404eb17ac77835dfd3a3fe0e8c5b11009926ca0  
**Previous slice:** Gate 6.1 — PedidoItem → Producto — VERIFIED [E]

## 1. Objetivo

Auditar exclusivamente la relación **PedidoItem → ReglaFidelizacion** después del cierre de Gate 6.1.

El objetivo es determinar:

- ownership efectivo;
- FK y cardinalidad;
- superficies de escritura;
- protección AS-IS;
- cobertura actual del registry de relation ownership;
- exposición por servicios y persistence boundary;
- casos mínimos necesarios para verificar la relación.

Este audit **no modifica production code, schema, migrations, seed, CI ni tests**.

## 2. Modelo Prisma verificado

En `apps/api/prisma/schema.prisma`:

### PedidoItem

- `pedidoId` → `Pedido.id`;
- `productoId` → `Producto.id`;
- `reglaFidelizacionId` → `ReglaFidelizacion.id`;
- `reglaFidelizacionId` es nullable;
- la relación `reglaFidelizacion` es opcional;
- `PedidoItem` no tiene `empresaId`.

### ReglaFidelizacion

- tiene `empresaId` directo;
- `empresa` referencia `Empresa`;
- puede tener reglas de alcance opcionales sobre Familia/Subfamilia/Tipo/Subtipo;
- tiene relación inversa `pedidoItems`;
- la FK desde PedidoItem usa `onDelete: Restrict`.

Por lo tanto, el ownership efectivo esperado es:

```
Business A
 ├── Pedido A
 │    └── PedidoItem A
 │         └── ReglaFidelizacion A     ✓
 │
 └── ReglaFidelizacion A

Business B
 └── ReglaFidelizacion B

Business A
 └── Pedido A
      └── PedidoItem A
           └── ReglaFidelizacion B    ✗
```

## 3. Protección AS-IS

### 3.1 Persistence relation registry

El registry actual de `apps/api/src/prisma/relation-ownership.ts` contiene:

```ts
{
  VentaItem: ['producto'],
  PedidoItem: ['producto'],
}
```

No contiene:

```ts
PedidoItem: ['reglaFidelizacion']
```

Por tanto, el mecanismo reusable actualmente **no verifica** esta relación.

### 3.2 Direct tenant scope

`ReglaFidelizacion` tiene `empresaId`, por lo que el modelo destino sí es tenant-aware.

`PedidoItem` no tiene `empresaId`, por lo que el scope directo por modelo no puede imponer ownership sobre `PedidoItem`.

La relación depende de enforcement relacional.

### 3.3 Service-level validation

`FidelizacionService` usa `EmpresaScopedPrismaService.forEmpresa(empresaId)` para listar/obtener/crear/actualizar reglas.

También valida los IDs de Familia/Subfamilia/Tipo/Subtipo contra el Business efectivo.

Esto protege el CRUD normal de reglas, pero **no demuestra protección de la FK PedidoItem → ReglaFidelizacion en el persistence boundary**.

### 3.4 Venta/Pedido service behavior

`VentasService.resolverItems()` obtiene las reglas activas usando el contexto del Business y calcula `reglaFidelizacionId`.

`TiendaService.crearPedido()` también obtiene reglas activas del Business y genera `reglaFidelizacionId` antes del nested `Pedido.create`.

Estas prevalidaciones reducen el riesgo en esos call-sites, pero no constituyen enforcement reusable del persistence boundary.

## 4. Gap classification

La evidencia estática permite clasificar:

**REQUIRES TEST — HIGH CONFIDENCE EXPOSURE**

No se clasifica todavía como CONFIRMED GAP porque no se ejecutó una operación PostgreSQL/Prisma que intente:

```
Business A → Pedido A → PedidoItem → Regla B
```

La prueba debe aislar esta relación de `PedidoItem → Producto`, que ya está protegida y verificada en Gate 6.1.

## 5. Escrituras relevantes

### 5.1 Nested Pedido.create

Existe en `TiendaService.crearPedido()`:

```
Pedido.create
 └── pedidoItems.create[]
      ├── productoId
      └── reglaFidelizacionId
```

Esta es una superficie primaria de Gate 6.2.

### 5.2 Direct PedidoItem.create

El modelo Prisma permite crear directamente un `PedidoItem` con:

- `pedidoId`;
- `productoId`;
- `reglaFidelizacionId`.

Debe verificarse independientemente porque el servicio no puede considerarse frontera de seguridad.

### 5.3 Direct PedidoItem.createMany

Debe verificarse porque representa otra forma de escritura directa sobre el modelo derivado.

### 5.4 Nested Pedido.update

Un Pedido existente puede recibir un nuevo `PedidoItem` mediante nested create.

Debe comprobarse que la regla B no pueda incorporarse a un Pedido A.

### 5.5 Interactive transaction

Debe comprobarse el comportamiento dentro de `$transaction`, manteniendo la misma expectativa de RI-08.

## 6. Lecturas

La relación no introduce una nueva lectura principal para esta slice.

El hecho de que `Pedido` sea scoped por `empresaId` no demuestra por sí mismo que una FK de `PedidoItem` hacia una `ReglaFidelizacion` de otra empresa no pueda persistirse.

La propiedad a verificar es de **integridad de ownership en escritura**.

## 7. Casos de prueba requeridos

### R-01 — Positive same-Business

Business A:

```
Pedido A
 └── PedidoItem
      ├── Producto A
      └── Regla A
```

Debe persistir Pedido, PedidoItem y la referencia a Regla A.

### R-02 — Negative nested create cross-Business

```
Pedido A
 └── PedidoItem
      ├── Producto A
      └── Regla B
```

Debe rechazarse.

Debe verificarse:

- no queda Pedido;
- no queda PedidoItem.

El Producto A debe permanecer intacto.

### R-03 — Negative direct PedidoItem.create

Con Pedido A y Producto A existentes:

```
PedidoItem.create(
  pedidoId = Pedido A,
  productoId = Producto A,
  reglaFidelizacionId = Regla B
)
```

Debe rechazarse y no persistir el item.

### R-04 — Negative direct PedidoItem.createMany

Misma relación A→B mediante `createMany`.

Debe rechazarse y no persistir ningún item inválido.

### R-05 — Mixed nested write

Un Pedido A contiene:

- Item 1 → Producto A + Regla A;
- Item 2 → Producto A + Regla B.

Debe rechazarse toda la operación.

Debe verificarse ausencia del Pedido y de sus items.

### R-06 — Nested Pedido.update

Un Pedido A existente recibe un PedidoItem con:

- Producto A;
- Regla B.

Debe rechazarse y no persistir el nuevo item.

### R-07 — Optional relation / null control

Debe verificarse que:

```
reglaFidelizacionId = null
```

continúe siendo válido.

Esto evita convertir accidentalmente la relación opcional en obligatoria como efecto colateral del enforcement.

### R-08 — Interactive transaction

Dentro de `$transaction`:

1. caso negativo A→Regla B → reject + rollback;
2. caso positivo A→Regla A → persist.

Debe verificarse estado persistido después de cada caso.

## 8. Fixture requirements

La suite debe crear dinámicamente:

- Business A;
- Business B;
- Pedido A;
- Producto A;
- ReglaFidelizacion A;
- ReglaFidelizacion B.

No debe depender de IDs hardcoded ni del seed.

Las reglas pueden ser mínimas porque el alcance de esta slice es ownership, no cálculo de descuentos.

Fixture conceptual:

```
Regla A:
  empresaId = A
  nivelRequerido = NUEVO
  descuentoPorcentaje = 10
  activo = true

Regla B:
  empresaId = B
  nivelRequerido = NUEVO
  descuentoPorcentaje = 20
  activo = true
```

Los campos de alcance de catálogo pueden permanecer `null`, porque no son parte del comportamiento que se verifica.

## 9. Interaction with Gate 6.1

Gate 6.1 ya verifica:

```
PedidoItem → Producto
```

Gate 6.2 debe usar Producto A para que un eventual rechazo no pueda atribuirse a la relación Producto.

Por tanto:

```
Producto A ✓
Regla A ✓
Regla B ✗
```

El test negativo debe fallar exclusivamente por ownership de `Regla B`.

## 10. Mecanismo candidato

El mecanismo ya existente es técnicamente aplicable:

```
RELACIONES_CON_OWNERSHIP
        +
Prisma DMMF traversal
        +
verificarOwnershipRelacional()
```

La extensión candidata sería:

```ts
PedidoItem: ['producto', 'reglaFidelizacion']
```

**No se implementa en este audit.**

Primero debe ejecutarse R-01…R-08 con el registry actual.

## 11. Riesgos / limitaciones

Se mantienen las limitaciones conocidas del mecanismo:

1. preflight sobre otra conexión puede no observar recursos creados y aún no confirmados dentro de la misma transacción;
2. existe riesgo TOCTOU teórico;
3. no existe garantía equivalente mediante FK compuesta a nivel PostgreSQL;
4. el registry es opt-in;
5. agregar la relación no debe alterar el comportamiento de `reglaFidelizacionId = null`.

Estas limitaciones no se resuelven dentro del audit.

## 12. Evidencia

### VERIFICADO POR CÓDIGO [C]

- `PedidoItem.reglaFidelizacionId` es nullable;
- `PedidoItem.reglaFidelizacion` referencia `ReglaFidelizacion`;
- `ReglaFidelizacion.empresaId` es directo;
- `TiendaService.crearPedido()` persiste `reglaFidelizacionId` en nested PedidoItem;
- `VentasService` calcula y persiste `reglaFidelizacionId`;
- el registry actual no contiene `PedidoItem → ReglaFidelizacion`.

### DOCUMENTADO [D]

- Relation Ownership Matrix de Gate 1 clasifica esta relación como REQUIRES TEST;
- T-01 exige enforcement de relaciones tenant-aware;
- Gate 6 establece expansión incremental;
- Gate 6.1 está cerrado y no debe mezclarse con esta slice.

### NO DETERMINABLE TODAVÍA [ND]

- si la FK cross-Business actualmente persiste;
- si todas las formas de escritura presentan el mismo comportamiento;
- si existe alguna protección indirecta no observada que impida el vínculo.

## 13. Resultado Gate 6.2 Audit

**AUDIT COMPLETED.**

Clasificación:

```
PedidoItem → ReglaFidelizacion
        ↓
REQUIRES TEST
        ↓
IMPLEMENTATION NOT AUTHORIZED YET
```

No se modifica:

- schema;
- migrations;
- production code;
- relation registry;
- services;
- auth;
- CI;
- seed.

### Próximo paso controlado

Ejecutar R-01…R-08 contra PostgreSQL descartable.

Si el test demuestra el gap:

1. clasificar CONFIRMED GAP [E];
2. aplicar únicamente la extensión mínima del registry;
3. repetir R-01…R-08;
4. verificar persistencia;
5. registrar evidencia;
6. cerrar Gate 6.2.

Si no demuestra el gap, registrar PASS AS-IS y no modificar production code.
