# PedidoItem → Producto — Gate 6.1 Audit
## Relation Isolation Capability Expansion — 2026-10-04

**Estado:** AUDIT COMPLETED — IMPLEMENTATION NOT STARTED  
**Gate:** 6 — Coverage Expansion  
**Slice:** 6.1 — PedidoItem → Producto  
**Scope:** Wapsell Core — Multi-Tenant Persistence / Relation Isolation  
**Baseline:** d03dc55808b848327376f45ba1b6ee2f32994754

## 1. Objetivo

Auditar exclusivamente la relación PedidoItem → Producto antes de modificar production code.

El objetivo es determinar ownership efectivo, mecanismo AS-IS, superficies de escritura, superficies de lectura relevantes, protección existente, gap verificable y cobertura necesaria para Gate 6.1.

No se implementa todavía ninguna corrección.

## 2. Modelo Prisma verificado

En apps/api/prisma/schema.prisma:

- Pedido tiene empresaId directo y relación con Empresa.
- PedidoItem NO tiene empresaId.
- PedidoItem.pedidoId referencia Pedido.id.
- PedidoItem.productoId referencia Producto.id.
- Producto tiene empresaId directo y relación con Empresa.

Por tanto, el ownership efectivo de un PedidoItem se deriva de su Pedido, mientras que el recurso relacionado Producto tiene ownership directo por empresa.

### Ownership esperado

Business A
  └── Pedido A
       └── PedidoItem
            └── Producto A

Business B
  └── Producto B

Debe rechazarse:

Business A
  └── Pedido A
       └── PedidoItem
            └── Producto B   ❌

## 3. Superficies de escritura verificadas

### 3.1 TiendaService.crearPedido()

Archivo:

apps/api/src/tienda/tienda.service.ts

El flujo:

1. obtiene empresaId desde TIENDA_EMPRESA_ID;
2. usa EmpresaScopedPrismaService.forEmpresa(empresaId);
3. valida previamente que los productoId existan en esa empresa;
4. abre una transacción;
5. crea/reusa Cliente;
6. ejecuta tx.pedido.create();
7. crea pedidoItems mediante nested create;
8. cada item contiene productoId.

La prevalidación de productos existe, pero no constituye una garantía reusable de persistence boundary.

El boundary recibe conceptualmente:

Pedido.create
  └── pedidoItems.create[]
       └── productoId

La relación PedidoItem → Producto no está registrada actualmente en RELACIONES_CON_OWNERSHIP.

### 3.2 Escritura directa de PedidoItem

El modelo permite operaciones Prisma directas sobre PedidoItem.

Como PedidoItem no tiene empresaId, el scope actual no puede imponer directamente empresaId sobre ese modelo.

El mecanismo introducido para B3 actualmente registra únicamente:

VentaItem → Producto

No registra:

PedidoItem → Producto

Por lo tanto, la superficie directa también requiere prueba.

## 4. Superficies de lectura verificadas

### PedidosService

apps/api/src/pedidos/pedidos.service.ts

Las lecturas de Pedido utilizan EmpresaScopedPrismaService.forEmpresa(empresaId) y cargan:

pedido
 └── pedidoItems
      └── producto

Esto protege el Pedido por empresaId.

Sin embargo, el audit de esta slice no considera que la lectura anidada por sí sola demuestre enforcement de ownership en escrituras. La propiedad a demostrar en Gate 6.1 es que una relación cross-Business no pueda persistirse.

## 5. Protección AS-IS observada

Actualmente existen dos capas:

### Servicio

TiendaService.crearPedido() prevalida:

productoIds
   ↓
db.producto.findMany()
   ↓
solo productos de la empresa efectiva

Esto reduce el riesgo en ese servicio concreto.

### Persistence extension

empresaScopeExtension protege modelos con empresaId directo.

PedidoItem no tiene empresaId, por lo que no recibe ese filtro directamente.

La protección relacional declarativa existente contiene solamente:

VentaItem: ['producto']

No existe una entrada equivalente para PedidoItem.

## 6. Gap esperado / hipótesis a verificar por test

El audit permite formular una hipótesis concreta:

> Una operación directa sobre PedidoItem, o una operación nested sobre Pedido, puede intentar vincular un Producto de Business B desde el contexto de Business A sin que el persistence boundary actual verifique ownership de ese Producto.

Esto debe clasificarse como REQUIRES TEST, no como VERIFIED GAP, hasta ejecutar la prueba contra PostgreSQL.

La evidencia estática es suficiente para justificar el test, pero no para declarar el comportamiento ejecutado.

## 7. Casos de prueba requeridos

Gate 6.1 debe cubrir como mínimo:

### P-01 — Positive same-Business

Business A
  Pedido A
    PedidoItem
      Producto A
        ↓
      PASS

Debe persistir Pedido A, PedidoItem y relación con Producto A.

### P-02 — Negative cross-Business nested create

Business A
  Pedido.create
    PedidoItem.create
      Producto B
        ↓
      P2025 / rechazo

Debe quedar:

- Pedido: 0;
- PedidoItem: 0.

### P-03 — Negative direct PedidoItem.create

Con un Pedido de A existente:

PedidoItem.create(
  pedidoId = Pedido A,
  productoId = Producto B
)

Debe rechazarse y no persistir el item.

### P-04 — Negative direct PedidoItem.createMany

Misma relación A→B mediante createMany.

Debe rechazarse y no persistir ningún item cross-Business.

### P-05 — Mixed nested write

Pedido A
  ├── Producto A ✓
  └── Producto B ✗

Debe rechazarse toda la operación.

Debe verificarse ausencia del Pedido y de todos sus PedidoItem.

### P-06 — Nested write through Pedido.update

Un Pedido A existente recibe un nuevo PedidoItem apuntando a Producto B.

Debe rechazarse y no crear el item.

### P-07 — Transaction

Repetir un caso negativo dentro de $transaction y comprobar que falla, no queda Pedido y no queda PedidoItem.

También debe existir un caso positivo A→A dentro de transacción.

## 8. Formas relacionales adicionales

PedidoItem también tiene:

PedidoItem → Pedido
PedidoItem → ReglaFidelizacion

Esta slice NO las implementa.

Su estado queda:

| Relación | Estado |
|---|---|
| PedidoItem → Producto | Gate 6.1 target |
| PedidoItem → Pedido | REQUIRES SEPARATE AUDIT/TEST |
| PedidoItem → ReglaFidelizacion | REQUIRES SEPARATE AUDIT/TEST |

No se amplía el alcance por proximidad estructural.

## 9. Riesgos específicos

### 9.1 Prevalidación dependiente del servicio

La validación de TiendaService no debe considerarse garantía global.

Otro caller puede utilizar Prisma directamente o un servicio diferente.

### 9.2 Transacción

TiendaService.crearPedido() utiliza transacción interactiva.

El mecanismo actual de relation ownership verifica referencias utilizando otra conexión.

Por analogía con Gate 4, una referencia creada dentro de la misma transacción podría no ser visible al preflight y fallar cerrado.

Esto es una limitación que debe mantenerse explícita y no resolverse en esta slice salvo que el test demuestre una necesidad diferente.

### 9.3 TOCTOU

Existe la misma consideración teórica entre la verificación de ownership y la escritura posterior.

No se considera motivo suficiente para rediseñar el mecanismo en Gate 6.1 sin evidencia adicional.

## 10. Mecanismo candidato

No se implementa todavía, pero el audit identifica el mecanismo existente como candidato:

RELACIONES_CON_OWNERSHIP
        +
Prisma DMMF traversal
        +
verificarOwnershipRelacional()

La extensión natural para esta slice sería registrar:

PedidoItem → producto

pero la decisión de implementación queda para la fase posterior al test design.

No se autoriza todavía modificar código solo por este audit.

## 11. Evidencia

### VERIFICADO POR CÓDIGO

- Pedido tiene empresaId.
- PedidoItem no tiene empresaId.
- PedidoItem.productoId referencia Producto.
- Producto tiene empresaId.
- TiendaService.crearPedido() hace prevalidación de productos.
- TiendaService.crearPedido() realiza nested pedidoItems.create.
- empresaScopeExtension registra actualmente VentaItem → Producto, no PedidoItem → Producto.

### DOCUMENTADO

- Relation Ownership Matrix del Gate 1 clasifica Pedido → PedidoItem → Producto como REQUIRES TEST.
- El plan de transformación establece expansión incremental de cobertura.

### NO DETERMINABLE CON AUDIT ESTÁTICO

- si la operación cross-Business actualmente persiste efectivamente;
- si todas las formas de nested write tienen el mismo comportamiento;
- si existe algún mecanismo indirecto no observado que bloquee el caso.

Estos puntos requieren ejecución contra PostgreSQL.

## 12. Resultado Gate 6.1 Audit

**AUDIT COMPLETED.**

Clasificación de la relación:

PedidoItem → Producto
        ↓
REQUIRES TEST
        ↓
NO IMPLEMENTATION YET

No se modifica:

- schema;
- migrations;
- production code;
- services;
- auth;
- CI;
- seed.

### Próximo gate

Gate 6.1 — Test Design / Execution

Primero ejecutar los casos P-01…P-07 contra PostgreSQL descartable.

Solo si se demuestra el gap, pasar a implementación de la misma capability reutilizable utilizada en Gate 4.

## 13. Baseline

Audit realizado contra:

d03dc55808b848327376f45ba1b6ee2f32994754

Commit:
fix(b3): enforce nested product relation isolation

Este documento no declara B3 cerrado ni declara completa la capability de relation isolation.
