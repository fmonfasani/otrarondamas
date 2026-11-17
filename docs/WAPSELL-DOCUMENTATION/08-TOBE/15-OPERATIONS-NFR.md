# TO-BE — Operación y requisitos no funcionales

**Estado:** TO-BE v2 — DRAFT FOR OWNER APPROVAL (OR-B4-043) | **Fecha:** 2026-11-16 | **Autoridad:** subordinado a los Owner Rulings, al Decision Register y a la SPEC General (ISS-08). Cada regla vale por el ruling que cita; lo no decidido figura `OPEN`.

**Fuente en la SPEC General:** SPEC §13, §14

## Propósito

Cómo se mantiene Wapsell funcionando y recuperable.

## Reglas

- Modular Monolith con REST. `[OR-B2-024, OR-B4-019]`
- Deploy a producción con aprobación manual del environment `production`. `[OR-B4-001]`
- Backups cada 6 horas de la base y de los archivos (chat, legajos), con prueba de restauración. `[OR-B4-042]`
- Email transaccional desde `no-reply@wapsell.com`.

## Estado actual (AS-IS, 2026-11-16)

Backups funcionando desde 2026-11-16, solo en el servidor. Faltan: copia externa, monitoreo con alertas, RPO/RTO y retirar módulos sin uso (`kafka`, `alerts`, `tenants`, `sms-notifications`).

## Abierto

- Destino de la copia externa
- RPO/RTO
- Monitoreo y alertas
- Kubernetes / GraphQL (siguen `OPEN`)
