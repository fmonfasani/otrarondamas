# Fase 5 — Reconciliación controlada

**Estado:** R0 parcial — GitHub verificado; LOCAL y HETZNER pendientes de acceso/evidencia.  
**Fecha:** 2026-11-04  
**Rama base:** `main`  
**Rama de auditoría:** `audit/phase5-r0-github-baseline-20261104`

## Propósito

Ejecutar la línea base previa a la reconciliación, sin modificar código funcional ni producción. El alcance actual es la inspección remota de GitHub y la documentación de divergencias.

## Evidencia disponible

- [00 — Baseline GitHub 2026-11-04](00-GITHUB-REMOTE-BASELINE-2026-11-04.md)

## Estado de R0

| Fuente | Estado | Evidencia |
|---|---|---|
| GitHub | VERIFICADO | SHA main, refs, PRs, comparación de ramas, CI y branch protection |
| LOCAL (PC del propietario) | NO VERIFICADO | No hay acceso al filesystem/checkout local desde esta ejecución |
| HETZNER | NO VERIFICADO | No hay sesión SSH/terminal ni conector de infraestructura autorizado disponible |

## Reglas de ejecución

1. No hacer merge de PR #100.
2. No hacer rebase/reset/clean de checkouts locales.
3. No sincronizar ni desplegar Hetzner todavía.
4. Preservar todos los worktrees, ramas, stashes y archivos untracked hasta inventariarlos.
5. Resolver primero la fuente de verdad y el estado de las ramas activas.
6. Cualquier operación sobre producción requiere backup verificable y plan de rollback.

## Siguiente gate

R0 solo puede cerrarse cuando los tres entornos tengan una captura comparable. La evidencia de GitHub no sustituye el estado real del PC ni de Hetzner.
