# TO-BE — Inventario

**Estado:** TO-BE v2 — DRAFT FOR OWNER APPROVAL (OR-B4-043) | **Fecha:** 2026-11-16 | **Autoridad:** subordinado a los Owner Rulings, al Decision Register y a la SPEC General (ISS-08). Cada regla vale por el ruling que cita; lo no decidido figura `OPEN`.

**Fuente en la SPEC General:** SPEC §11

## Propósito

El stock de cada Business: cuánto hay, dónde está y cómo se mueve.

## Reglas

- Stock exclusivo de cada Business; sin stock compartido ni transferencias entre Business. `[D-014]`
- Una o más Locations; al menos MAIN por Business, con los lotes asociados. `[R8-INV-003, OR-B4-015]`
- `disponible = existente − reservado`; nunca stock negativo. `[OR-B2-014, OR-B2-018]`
- FEFO con vencimiento, FIFO sin vencimiento. `[OR-B2-016]`
- Operaciones atómicas y seguras ante concurrencia. `[D-010]`
- Una devolución vuelve al stock solo si pasa la inspección. `[OR-B4-034]`

## Permisos

| Acción | Permiso |
|---|---|
| Ver | `INVENTORY_VIEW` |
| Mover | `INVENTORY_MOVE` |
| Ajustar | `INVENTORY_ADJUST` |

## Estado actual (AS-IS, 2026-11-16)

Lotes, FEFO/FIFO y no-negativo: hechos. Faltan: reserva (#165) y Location MAIN (#166). Los ajustes de stock todavía no quedan en la auditoría.

## Abierto

- Asociación física Location ↔ lote
