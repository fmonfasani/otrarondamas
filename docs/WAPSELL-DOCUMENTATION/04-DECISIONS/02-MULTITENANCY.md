# DEC-001 — Alcance de producto: Wapsell como plataforma multi-tenant de comercio conversacional

**Estado:** APPROVED (dirección de producto) · **Fecha:** 2026-09-25 · **Decisor:** fmonfasani (dueño)
**Resuelve:** `03-CONFLICTS/00-CONFLICT-REGISTER.md` → CON-001

## Qué se decidió

Se adopta como dirección de producto la visión completa descrita en SRC-012
(`WAPSELL SPEC General v1.0.docx`) y SRC-013 (`Wapsell_Informe_Integral_de_Producto.docx`):

- **Wapsell = Platform.** No es una aplicación vertical para un solo negocio; es la infraestructura
  que aloja múltiples negocios.
- **Business = Tenant.** Cada negocio (ej. Otra Ronda Más) es un tenant dentro de la plataforma, con
  su propia identidad comercial, catálogo, clientes, ventas, etc.
- **Brand** = identidad comercial visible del Business ante sus clientes.
- **User = identidad global.** Una persona tiene una única identidad en Wapsell, independiente de a
  cuántos negocios esté vinculada.
- **Membership = User ↔ Business.** Relación N:N; los roles y permisos viven en el contexto de esa
  membership, no en el usuario global.
- **La conversación es la interfaz comercial central**, no un canal secundario ni un módulo aparte.
  El ERP/comercio (catálogo, ventas, pagos, inventario, compras, entregas) es el motor operativo
  detrás de esa conversación.
- **Asistentes de IA son parte del producto**, no un descarte del MVP — esto revierte explícitamente
  el criterio de trabajo inicial de la Fase 1 ("los asistentes de IA están fuera del MVP actual salvo
  que una fuente demuestre lo contrario"): SRC-012/013, ahora aprobadas, son esa fuente.
- **Otra Ronda Más pasa a ser el primer Business/tenant** de Wapsell, no una aplicación
  independiente con su propio dominio de código separado.

## Qué queda explícitamente superado (no descartado — ver AS-IS)

- La premisa de SRC-001 §7 ("Otra Ronda Más como aplicación independiente... sin dependencias de
  código con el repo wapsell") queda **superada como dirección de producto**, aunque el propio SDD
  se conserva íntegro como fuente histórica/AS-IS — no se reescribe ni se borra.
- La decisión de arquitectura de SRC-003/SRC-004 (monorepo propio `OtraRondaMas`, Postgres propio,
  sin integración de código con `wapsell`) queda en tensión directa con esta decisión: si Otra Ronda
  Más es un Business dentro de Wapsell, el monorepo y la base de datos separados dejan de tener
  sentido como arquitectura final, aunque puedan seguir sirviendo como AS-IS transitorio.

## Evidencia que esta decisión no resuelve, solo reconoce

SRC-011 (auditoría técnica de solo lectura sobre el repo real de Wapsell, 2026-09-24) confirmó por
código que, a esa fecha, Wapsell:
- No tiene messaging, conversaciones ni asistentes.
- No tiene Membership (usuario↔negocio N:N) ni administración de negocios.
- No tiene configuración de marca por negocio.
- Es, en el propio texto de esa auditoría, "un producto específico: agente de ventas con IA para
  inmobiliarias", no un hub SaaS genérico.

Esta decisión **no cambia esos hechos verificados por código** — solo fija que la construcción futura
debe ir en esa dirección. La distancia entre el AS-IS real (confirmado por SRC-011) y este TO-BE de
producto es, en sí misma, el trabajo más grande que se abre a partir de esta decisión.

## Qué NO decide este documento (pendiente, a numerar como DEC-002 en adelante)

1. **Modelo de datos concreto.** Cómo se relacionan exactamente `Business`/`Membership` con las 42
   tablas ya existentes en `apps/api/prisma/schema.prisma`, en particular `Empresa` (hoy 1:1 con
   `Usuario` vía `empresaId`) y si `Empresa` se renombra/fusiona a `Business` o convive con él.
2. **Plan de migración.** Qué pasa con los datos de seed y la estructura ya implementada (auth,
   catálogo, ventas, caja, compras — ver SRC-004/SRC-011): reescritura, migración incremental, o
   convivencia temporal de ambos modelos.
3. **Alcance funcional de messaging y asistentes de IA.** SRC-012/013 son visión de producto, no
   especificación funcional al nivel de detalle de SRC-001/SRC-007. Falta definir: canales
   soportados, qué hace un asistente de IA concretamente, límites de automatización vs. intervención
   humana (coherente con el criterio general ya usado en `criterios-diseno-dueno-D01-D19.md`:
   automatizar lo determinístico, pedir intervención humana ante ambigüedad).
4. **Qué pasa con el repositorio.** Si `OtraRondaMas` (este repo) se convierte en el primer Business
   dentro de un monorepo/plataforma `Wapsell` más amplio, se fusiona con el repo `wapsell` existente,
   o mantiene código propio que luego se integra — no decidido.
5. **Impacto en las specs ya escritas bajo premisa standalone** (SRC-005, 006, 007 — catálogo, login
   y roles, ventas): cuáles de sus requisitos siguen siendo válidos tal cual (ej. reglas de negocio
   de ventas, invariantes de stock) versus cuáles dependen de un modelo de identidad/tenancy que
   cambia de raíz (ej. todo lo de "Usuario" e "invitación" en SRC-006 asume un solo Business).

## Próximo paso recomendado (documental, no de código)

Antes de tocar `schema.prisma` o cualquier código de `apps/api`/`apps/pos-admin`, se recomienda
completar Fase 2 (AS-IS Reconstruction) sobre el estado real actual (que sigue siendo el modelo
standalone, código y specs incluidos), para tener una línea base clara contra la cual medir la
Transformation hacia este nuevo TO-BE. Migrar el schema antes de tener ese AS-IS documentado corre
el riesgo de perder trazabilidad sobre qué invariantes y reglas de negocio ya validadas (INV-01 a
INV-14 de SRC-001, RN-VTA-01 a 18 de SRC-007) deben preservarse durante la migración.
