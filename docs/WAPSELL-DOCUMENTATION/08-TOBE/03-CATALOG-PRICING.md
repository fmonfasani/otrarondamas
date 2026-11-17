# TO-BE — Catálogo, precios, promociones y mayoristas

**Estado:** TO-BE v2 — DRAFT FOR OWNER APPROVAL (OR-B4-043) | **Fecha:** 2026-11-16 | **Autoridad:** subordinado a los Owner Rulings, al Decision Register y a la SPEC General (ISS-08). Cada regla vale por el ruling que cita; lo no decidido figura `OPEN`.

**Fuente en la SPEC General:** SPEC §10.1, §10.6

## Propósito

Qué vende cada Business y a qué precio.

## Reglas

- `Product` global + `BusinessProduct` por Business, por etapas; hoy `Producto` opera como `BusinessProduct`. `[OR-B2-010, OR-B4-011]`
- Categoría y subcategoría por Business; código interno automático (p. ej. `BEB-0001`), editable y único. `[OR-B4-028]`
- Desactivar un producto no lo borra. `[OR-B2-010]`
- Precio minorista obligatorio; precio mayorista y descuento por producto existen en el AS-IS.
- Pricing y Promotions: dirección del MVP; reglas especializadas pendientes. `[OR-B2-026]`

## Permisos

| Acción | Permiso |
|---|---|
| Ver catálogo | `CATALOG_VIEW` |
| Editar productos | `CATALOG_MANAGE` |
| Cambiar precios | `PRICING_CHANGE` |

## Estado actual (AS-IS, 2026-11-16)

Catálogo y categorías hechos. Cambios de precio auditados. Faltan: Product global (#169, diferido), listas de precios, promociones y la experiencia mayorista.

## Abierto

- Mayoristas: quién es mayorista, cómo ve precios y cómo compra (`OPEN — Owner Decision`)
- Promociones y listas de precios
- Imágenes de producto
