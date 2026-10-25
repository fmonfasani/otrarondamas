# VentaItem → ReglaFidelizacion — Gate 6.3 Audit
## Relation Isolation Capability Expansion — 2026-10-04

**Estado:** AUDIT COMPLETED — TEST DESIGN REQUIRED  
**Gate:** 6 — Coverage Expansion  
**Slice:** 6.3 — VentaItem → ReglaFidelizacion  
**Scope:** Wapsell Core — Multi-Tenant Persistence / Relation Isolation  
**Baseline:** `fe34d70b26691f93775329b060408bff902fc953`  
**Previous slices:** Gate 6.1 — PedidoItem → Producto — VERIFIED [E]; Gate 6.2 — PedidoItem → ReglaFidelizacion — VERIFIED [E]

## 1. Objetivo

Auditar exclusivamente la relación **VentaItem → ReglaFidelizacion** después del cierre de Gate 6.2.

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

El schema establece que `VentaItem` contiene:

- `ventaId` → `Venta.id`;
- `productoId` → `Producto.id`;
- `reglaFidelizacionId` → `ReglaFidelizacion.id`;
- `reglaFidelizacionId` es nullable;
- `reglaFidelizacion` es una relación opcional;
- `VentaItem` no tiene `empresaId`.

`ReglaFidelizacion` es un recurso tenant-aware con `empresaId` directo.

Por lo tanto, el ownership esperado para esta relación es:

```
Business A
 ├── Venta A
 │    └── VentaItem A
 │         └── ReglaFidelizacion A     ✓
 │
 └── ReglaFidelizacion A

Business B
 └── ReglaFidelizacion B

Business A
 └── Venta A
      └── VentaItem A
           └── ReglaFidelizacion B    ✗
```

La FK de `VentaItem.reglaFidelizacionId` utiliza `onDelete: Restrict`.

## 3. Protection AS-IS

### 3.1 Persistence relation registry

En el baseline actual, el registry contiene:

```ts
RELACIONES_CON_OWNERSHIP = {
  VentaItem: ['producto'],
  PedidoItem: ['producto', 'reglaFidelizacion'],
};
```

No contiene:

```ts
VentaItem: ['producto', 'reglaFidelizacion']
```

Por tanto, aunque el mecanismo reusable existe y `ReglaFidelizacion` es tenant-aware, la relación **VentaItem → ReglaFidelizacion no está actualmente registrada para ownership verification**.

Esto constituye una observación de código [C], no todavía un gap confirmado [E].

## 4. Ownership boundary

`VentaItem` es un modelo derivado sin `empresaId`. Su aislamiento efectivo depende de:

1. ownership del `Venta` padre;
2. ownership de `Producto`;
3. ownership de cualquier recurso tenant-aware relacionado que se persista mediante FK/nested write.

Gate 6.1 ya cubre `VentaItem → Producto`.

Por lo tanto, Gate 6.3 debe aislar específicamente:

> **Venta A + Producto A + Regla B**

para evitar que un eventual rechazo sea atribuido a la relación `VentaItem → Producto`.

## 5. Service-level considerations

El código existente de ventas calcula/aplica información de fidelización al construir los items de una venta y persiste `reglaFidelizacionId`.

Estas validaciones de servicio no se consideran garantía suficiente del persistence boundary.

El objetivo de esta slice es comprobar directamente que una operación Prisma que intente establecer:

```
Venta A
 └── VentaItem
      ├── Producto A
      └── Regla B
```

no pueda persistir una relación cross-Business.

No se infiere desde el comportamiento del servicio que la frontera de persistencia esté protegida.

## 6. Gap classification

La evidencia disponible permite clasificar actualmente:

**REQUIRES TEST — HIGH CONFIDENCE EXPOSURE**

Razón:

- `VentaItem → ReglaFidelizacion` no figura en `RELACIONES_CON_OWNERSHIP`;
- `ReglaFidelizacion` tiene ownership directo por `empresaId`;
- `VentaItem` no tiene `empresaId`;
- el mecanismo de relation ownership es opt-in;
- no se ha ejecutado todavía una prueba específica de persistencia cross-Business para esta relación.

No se clasifica como **CONFIRMED GAP** hasta ejecutar contra PostgreSQL.

## 7. Escrituras a verificar

### 7.1 Nested Venta.create

Debe verificarse la escritura principal:

```
Venta.create
 └── ventaItems.create[]
      ├── productoId
      └── reglaFidelizacionId
```

La prueba debe utilizar `Producto A` y variar únicamente `ReglaFidelizacion`.

### 7.2 Direct VentaItem.create

Debe verificarse que una llamada directa al persistence boundary no permita:

```
VentaItem.create(
  ventaId = Venta A,
  productoId = Producto A,
  reglaFidelizacionId = Regla B
)
```

### 7.3 Direct VentaItem.createMany

Debe verificarse la misma frontera mediante `createMany`.

### 7.4 Nested Venta.update

Debe verificarse que una `Venta A` existente no pueda recibir un nuevo `VentaItem` que referencie `Regla B`.

### 7.5 Interactive transaction

Debe comprobarse que la regla se mantiene dentro de `$transaction`, incluyendo rollback del caso negativo y persistencia del caso positivo.

## 8. Required test candidates

### V-01 — Positive same-Business

```
Venta A
 └── VentaItem
      ├── Producto A
      └── Regla A
```

**Expected:** persistir Venta, VentaItem y referencia a Regla A.

### V-02 — Negative nested create cross-Business

```
Venta A
 └── VentaItem
      ├── Producto A
      └── Regla B
```

**Expected:** reject; no persistir Venta ni VentaItem inválido.

### V-03 — Negative direct VentaItem.create

Con Venta A y Producto A existentes:

```
VentaItem.create(
  ventaId = Venta A,
  productoId = Producto A,
  reglaFidelizacionId = Regla B
)
```

**Expected:** reject; no persistir el item.

### V-04 — Negative direct VentaItem.createMany

Misma relación A→B mediante `createMany`.

**Expected:** reject; no persistir ningún item inválido.

### V-05 — Mixed nested write

Una Venta A contiene:

- Item 1 → Producto A + Regla A;
- Item 2 → Producto A + Regla B.

**Expected:** rechazar toda la operación y verificar ausencia de la Venta y sus items generados por la operación.

### V-06 — Nested Venta.update

Una Venta A existente recibe un VentaItem con:

- Producto A;
- Regla B.

**Expected:** reject; no persistir el nuevo item.

### V-07 — Optional relation / null control

```
reglaFidelizacionId = null
```

**Expected:** continuar siendo válido.

Esta prueba evita que el enforcement convierta accidentalmente la relación opcional en obligatoria.

### V-08 — Interactive transaction

Dentro de `$transaction`:

1. caso negativo A→Regla B → reject + rollback;
2. caso positivo A→Regla A → persist.

Debe verificarse el estado persistido después de cada caso.

## 9. Fixture requirements

La suite debe crear dinámicamente, sin IDs hardcoded:

- Business A;
- Business B;
- Venta A;
- Producto A;
- ReglaFidelizacion A;
- ReglaFidelizacion B.

La prueba negativa debe mantener `Producto A` para aislar la relación bajo análisis.

Las reglas deben ser mínimas. Sus condiciones de alcance no forman parte del objetivo de Gate 6.3.

## 10. Interaction with Gate 6.1

Gate 6.1 ya verificó:

```
Venta/PedidoItem → Producto
```

Para Gate 6.3, el test debe utilizar exclusivamente recursos del Business A para Producto y Venta.

Por tanto:

```
Producto A ✓
Regla A ✓
Regla B ✗
```

Si V-02…V-08 fallan porque la operación es aceptada, la clasificación debe ser atribuida a la ausencia de enforcement de `VentaItem → ReglaFidelizacion`, siempre que la evidencia de ejecución confirme que las demás referencias pertenecen a Business A.

## 11. Candidate mechanism

El mecanismo existente es técnicamente aplicable:

```
RELACIONES_CON_OWNERSHIP
        +
Prisma DMMF traversal
        +
verificarOwnershipRelacional()
```

La modificación candidata, **solo si la ejecución confirma el gap**, sería:

```ts
VentaItem: ['producto', 'reglaFidelizacion']
```

No se implementa en este audit.

La regla del gate es:

> **test first → classify → minimal fix only if confirmed.**

## 12. Known limitations

Se mantienen las limitaciones ya documentadas del mecanismo:

1. el preflight sobre otra conexión puede no observar recursos creados y aún no confirmados dentro de la misma transacción;
2. existe riesgo TOCTOU teórico;
3. no existe una garantía equivalente mediante FK compuesta a nivel PostgreSQL;
4. el registry es opt-in;
5. la relación nullable no debe dejar de aceptar `null`;
6. esta slice no pretende cerrar otras relaciones de `VentaItem` ni la relation-isolation capability global.

Estas limitaciones no se resuelven dentro de este audit.

## 13. Evidence classification

### VERIFICADO POR CÓDIGO [C]

- `VentaItem` posee `reglaFidelizacionId` nullable;
- `VentaItem.reglaFidelizacion` referencia `ReglaFidelizacion`;
- `ReglaFidelizacion` posee `empresaId`;
- el registry actual registra `VentaItem → Producto`, pero no `VentaItem → ReglaFidelizacion`;
- el mecanismo reusable de relation ownership inspecciona relaciones registradas mediante DMMF.

### DOCUMENTADO [D]

- Gate 1 identifica `VentaItem → ReglaFidelizacion` como relación que requiere test;
- T-01 establece que las relaciones tenant-aware deben respetar Business Context;
- Gate 6 define expansión incremental mediante matriz;
- Gate 6.1 y Gate 6.2 ya están cerrados individualmente.

### NO DETERMINABLE TODAVÍA [ND]

- si `VentaItem → ReglaFidelizacion` cross-Business puede persistirse actualmente;
- si todas las superficies de escritura presentan el mismo comportamiento;
- si existe una protección indirecta no observada que impida el vínculo.

## 14. Gate 6.3 Audit Result

**AUDIT COMPLETED.**

Clasificación:

```
VentaItem → ReglaFidelizacion
        ↓
REQUIRES TEST — HIGH CONFIDENCE EXPOSURE
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
- seed;
- existing Gate 6.1/6.2 tests.

### Próximo paso controlado

Ejecutar V-01…V-08 contra PostgreSQL descartable.

Si la ejecución demuestra el gap:

1. clasificar **CONFIRMED GAP [E]**;
2. aplicar únicamente la extensión mínima del registry;
3. repetir V-01…V-08;
4. verificar persistencia;
5. documentar evidencia;
6. cerrar Gate 6.3.

Si la ejecución no demuestra el gap:

1. registrar PASS AS-IS;
2. no modificar production code;
3. cerrar Gate 6.3 como verificado por ejecución;
4. seleccionar el siguiente candidato de la matriz.

