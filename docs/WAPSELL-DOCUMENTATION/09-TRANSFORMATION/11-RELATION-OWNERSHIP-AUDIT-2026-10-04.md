# Relation Ownership Audit v0.1 — Gate 1

**Fecha:** 2026-10-04  
**Estado:** COMPLETED — GATE 1 / IMPLEMENTATION NOT STARTED  
**Tipo:** Transformation Analysis / AS-IS Audit  
**Scope:** Wapsell Core — Multi-Tenant Persistence / Relation Isolation

## 1. Resultado

El audit confirma que TE-B3-001 no es un defecto aislado de VentaItem. Es la primera falla ejecutada de un patrón más amplio: recursos tenant-aware pueden relacionarse mediante FK/nested writes sin que la frontera de persistencia compruebe ownership del recurso relacionado.

No se modificó código de producción ni schema.

## 2. AS-IS verificado

La empresa-scope extension:

- fuerza empresaId en create/createMany;
- agrega empresaId a operaciones con where;
- post-verifica findUnique/findUniqueOrThrow;
- rechaza operaciones no contempladas.

No establece automáticamente ownership para modelos derivados sin empresaId ni para las relaciones FK de otros modelos.

El propio código documenta como no cubiertos, entre otros:

- VentaItem;
- CompraItem;
- AperturaCaja;
- MovimientoCaja;
- ArqueoCaja;
- CierreCaja;
- Legajo;
- DocumentoLegajo.

La lista de modelos de la extension además está desalineada con el schema actual; queda registrada como deuda documental adyacente, no se corrige aquí.

## 3. Relation Ownership Matrix

| Relación | Ownership | Mecanismo actual | Estado |
|---|---|---|---|
| Venta → VentaItem → Producto | Child sin empresaId; Producto scoped | parent scoped; nested FK sin enforcement genérico | **CONFIRMED GAP** |
| VentaItem → ReglaFidelizacion | regla scoped | nested FK sin enforcement genérico | REQUIRES TEST |
| Pedido → PedidoItem → Producto | child sin empresaId | servicio prevalida productos; boundary no genérico | REQUIRES TEST |
| PedidoItem → ReglaFidelizacion | regla scoped | nested FK sin enforcement genérico | REQUIRES TEST |
| Compra → CompraItem → Producto | child sin empresaId | servicio prevalida productos | REQUIRES TEST |
| ProductoProveedor → Producto/Proveedor | ambos scoped | direct scope; FK consistency no genérica | REQUIRES TEST |
| Producto → Familia/Subfamilia/Tipo/Subtipo | todos scoped | direct scope; hierarchy consistency no genérica | REQUIRES TEST |
| Presentacion → Producto | ambos scoped | direct scope; FK consistency no genérica | REQUIRES TEST |
| Lote → Producto | ambos scoped | direct scope; FK consistency no genérica | REQUIRES TEST |
| MovimientoStock → Producto/Lote | scoped | direct scope + raw SQL con empresaId donde aplica | REQUIRES TEST |
| DevolucionProveedor → Item → Producto | child sin empresaId | nested FK sin prevalidación equivalente observada | **HIGH RISK** |
| DevolucionProveedorItem → Lote | Lote scoped | update posterior scoped; relation no genérica | REQUIRES TEST |
| Pago → Venta/Pedido/CuentaCorriente/Usuario | direct scoped | algunas prevalidaciones de servicio | REQUIRES TEST |
| AplicacionPago → Pago/Deuda | child sin empresaId | sin relation enforcement | REQUIRES TEST |
| CuentaCorriente → Cliente | ambos scoped | direct scope | REQUIRES TEST |
| Deuda → Cliente/Venta/CuentaCorriente | scoped | direct scope | REQUIRES TEST |
| AperturaCaja → Caja/Usuario | child sin empresaId | service deriva ownership | REQUIRES TEST |
| MovimientoCaja → Caja/Apertura/Usuario | child sin empresaId | service deriva ownership | REQUIRES TEST |
| ArqueoCaja → Caja/Apertura/Usuarios/Autorizacion | child sin empresaId | service deriva/valida ownership | REQUIRES TEST |
| CierreCaja → Apertura/Usuario | child sin empresaId | service deriva ownership | REQUIRES TEST |
| Entrega → Pedido/Usuarios | direct scoped | direct scope; FK consistency no genérica | REQUIRES TEST |
| Notificacion → Pedido | direct scoped | direct scope | REQUIRES TEST |
| AuditLog → Venta/Usuario/Autorizacion | direct scoped | direct scope | REQUIRES TEST |
| PagoProveedor → Compra/Proveedor/Usuario | direct scoped | direct scope | REQUIRES TEST |
| DevolucionProveedor → Compra/Proveedor/Usuario | direct scoped en schema | extension coverage discrepancy | OUT-OF-SCOPE ADJACENT |
| Legajo → Usuario/Cliente | indirect ownership | LegajoService usa Prisma base | OPEN / ADJACENT |
| DocumentoLegajo → Legajo | indirect ownership | Prisma base | OPEN / ADJACENT |
| UsuarioPermiso → Usuario/Permiso | no relation isolation target | permiso global + usuario | OUT-OF-SCOPE |

## 4. Evidencia específica del gap confirmado

VentasService:

- obtiene cliente scoped;
- valida productos con db.producto.findMany;
- crea Venta mediante nested ventaItems.create.

Sin embargo, el test B3 accede al persistence boundary directamente y logró:

Business A → Venta A → VentaItem → Producto B.

Resultado ejecutado:

- Venta.empresaId = A;
- VentaItem.productoId = B;
- operación resuelta;
- relación cross-Business persistida.

**Clasificación:** IMPLEMENTATION GAP — VERIFIED BY EXECUTION.

## 5. Familias estructurales

### A — Derived child ownership
VentaItem, PedidoItem, CompraItem, DevolucionProveedorItem, AplicacionPago y modelos de caja derivados.

### B — Direct tenant model + cross-tenant FK
ProductoProveedor, Presentacion, Lote, MovimientoStock, Pago, Deuda, Entrega, AuditLog, PagoProveedor, DevolucionProveedor y otros.

### C — Hierarchical ownership
Subfamilia → Familia; Tipo → Subfamilia; Subtipo → Tipo; Producto → jerarquía; ReglaFidelizacion → nodos de jerarquía.

Estas familias son alcance de auditoría y cobertura futura, no autorización para implementarlas todas en este incremento.

## 6. Service findings

- VentasService: nested VentaItem; compensating product prevalidation existe, pero no es una garantía reusable de persistence boundary.
- TiendaService: nested PedidoItem; product prevalidation existe.
- ComprasService: nested CompraItem; product prevalidation existe.
- ComprasService.crearDevolucion(): nested DevolucionProveedorItem sin equivalente de prevalidación de producto observado.
- CajaService: deriva ownership mediante Caja.
- InventarioService: raw SQL incluye empresaId explícitamente en el WHERE.
- PagosService: resuelve Venta dentro de la transacción scoped antes de crear Pago.
- LegajoService: usa PrismaService base y no la scoped factory; queda como hallazgo adyacente.

## 7. Prisma design constraint

Prisma Client Extensions documenta que el componente query no soporta nested read/write operations como hooks independientes.

Conclusión: no debemos diseñar la solución suponiendo que un segundo $allModels.$allOperations interceptará cada nested operation automáticamente.

Sí puede existir una solución sobre la operación top-level que inspeccione explícitamente el payload relacional; el contrato y mecanismo exactos quedan para Gate 2/3.

## 8. Adjacent findings — no remediation here

1. lista de modelos de empresa-scope.extension.ts desactualizada;
2. discrepancia de cobertura directa de DevolucionProveedor;
3. LegajoService usa Prisma base;
4. Legajo/DocumentoLegajo tienen ownership indirecto;
5. varios modelos directos poseen FKs tenant-aware sin enforcement relacional genérico.

Se registran, pero no se corrigen en esta transformación salvo que una dependencia demostrada lo requiera.

## 9. Gate 1 conclusion

**COMPLETED.**

La siguiente etapa es Gate 2: definir el contrato técnico de relation isolation.

No corresponde todavía modificar production code, schema o migrations.
