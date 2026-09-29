# Documentación — mapa y estado

**Fecha:** 2026-09-28 · **Estado:** CURRENT

Esta carpeta contiene material de orígenes y momentos distintos. Este índice existe para que no haya duda sobre **qué es canónico y qué es insumo**.

## Regla

> **Canónico:** [`WAPSELL-DOCUMENTATION/`](WAPSELL-DOCUMENTATION/) — proceso documental gobernado, con IDs, evidencia clasificada y registro de conflictos.
>
> **Todo el resto de `docs/`:** material fuente, insumo o activos. Ya inventariado como SRC-001…SRC-024. **No es autoridad documental.**

Frente a una contradicción entre `WAPSELL-DOCUMENTATION/` y cualquier otra carpeta, gana `WAPSELL-DOCUMENTATION/`. Frente a una contradicción entre `WAPSELL-DOCUMENTATION/` y **el código**, gana el código: así lo fija [`00-GOVERNANCE/01-SOURCE-OF-TRUTH.md`](WAPSELL-DOCUMENTATION/00-GOVERNANCE/01-SOURCE-OF-TRUTH.md).

## Contenido

| Ruta | Qué es | Estado | Fuentes |
|---|---|---|---|
| [`WAPSELL-DOCUMENTATION/`](WAPSELL-DOCUMENTATION/) | **Documentación canónica.** Gobernanza, inventario de fuentes, SPEC canónica, conflictos, decisiones, AS-IS, Transformation, TO-BE, trazabilidad, auditorías. | **CURRENT / CANÓNICO** | — |
| [`WapSell docs/`](WapSell%20docs/) | **Insumo histórico crudo.** Ver nota abajo. | **HISTORICAL** — no editar | SRC-010…SRC-017 |
| [`Design/`](Design/) | System Design v2.0 (PDF, propuesta **no aprobada**) + ~40 mockups de Wapsell. | Fuente / PROPOSED | SRC-018, SRC-023 |
| [`Funcional Analysis/`](Funcional%20Analysis/) | Informe funcional y SPEC del módulo de Ventas (`.docx`). Insumo de los incrementos Inc-1…Inc-4. | Fuente / PROPOSED | SRC-008, SRC-009 |
| [`Research/`](Research/) | Research de terceros (documento fiscal de PedidoYa). Sin relación con el producto. | Fuente / contexto | SRC-019 |
| [`pos-admin-files/`](pos-admin-files/) | Snippets `.tsx` de una entrega externa de UI, con instrucciones de integración manual. **Excluido del inventario de fuentes** por ser código, no documentación. | NOT DETERMINABLE — ver deuda técnica | — |

## Nota sobre `WapSell docs/`

Es el **material fuente crudo** del que se derivó `WAPSELL-DOCUMENTATION/`, probablemente producido en otra herramienta o sesión. Se conserva sin modificar por trazabilidad, pero no debe tratarse como documentación viva:

- Su `00-DOCUMENT-GOVERNANCE.md.txt` está **vacío (0 bytes)** — inventariado como SRC-010, `NOT DETERMINABLE`. Señala un proceso iniciado ahí y abandonado en favor de `WAPSELL-DOCUMENTATION/`.
- Su `Idea/Auditoría técnica y funcional.docx` es **SRC-011**, la columna vertebral del AS-IS actual: fue leído, citado y superado por [`05-ASIS/`](WAPSELL-DOCUMENTATION/05-ASIS/), que además lo verificó contra el código.
- Sus 4 `.xlsx` "REENGINEERED" (SRC-014…SRC-017) están inventariados pero **su contenido de hojas no fue leído**. `Wapsell_Sistema_Unificado_REENGINEERED.xlsx` contiene una hoja `16_CONFLICTOS_PENDIENTES` que sigue marcada como punto de atención pendiente.
- Contiene además `WAPSELL-DOCUMENTATION-STARTER/`, el andamio original de la estructura canónica.

**No editar archivos acá.** Un cambio en `WapSell docs/` no propaga a la documentación canónica y crea una divergencia silenciosa. Si una de estas fuentes debe corregirse, la corrección va en `WAPSELL-DOCUMENTATION/` citando la fuente.

## Documentos históricos movidos

Los `.md` que antes vivían sueltos en `docs/` (`SDD-especificacion-funcional-v0.1.md`, `criterios-diseno-dueno-D01-D19.md`, `prompt-scaffolding-opencode.md`, `scaffolding-notas.md`, `spec-catalogo-productos.md`, `spec-login-roles.md`, `spec-modulos_ventas.md`) fueron reclasificados a [`WAPSELL-DOCUMENTATION/01-SOURCE-INVENTORY/SOURCES/HISTORICAL/`](WAPSELL-DOCUMENTATION/01-SOURCE-INVENTORY/SOURCES/HISTORICAL/) como SRC-001…SRC-007.

**No se perdió ninguno.** Aparecen como borrados en `git status` porque el movimiento todavía no fue commiteado. Enlaces a sus rutas viejas están rotos: usar las rutas nuevas.

## Por dónde empezar

1. [`05-ASIS/00-ASIS-OVERVIEW.md`](WAPSELL-DOCUMENTATION/05-ASIS/00-ASIS-OVERVIEW.md) — qué existe realmente hoy.
2. [`03-CONFLICTS/00-CONFLICT-REGISTER.md`](WAPSELL-DOCUMENTATION/03-CONFLICTS/00-CONFLICT-REGISTER.md) — las 27 contradicciones abiertas.
3. [`04-DECISIONS/00-DECISION-REGISTER.md`](WAPSELL-DOCUMENTATION/04-DECISIONS/00-DECISION-REGISTER.md) — qué está decidido y qué no.
4. [`02-CANONICAL-SPEC/00-WAPSELL-SPEC-GENERAL.md`](WAPSELL-DOCUMENTATION/02-CANONICAL-SPEC/00-WAPSELL-SPEC-GENERAL.md) — hacia dónde va el producto.
