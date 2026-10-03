# AS-IS — Overview
**Fase:** 05-ASIS · **Fecha de reconstrucción:** 2026-09-25 · **Estado:** DRAFT

## Qué es este AS-IS y qué no es

Este conjunto de documentos reconstruye el **estado real actual** del código y la documentación del
repositorio `OtraRondaMas`, tal como existen hoy — **no** el estado deseado bajo DEC-001 (Wapsell
como plataforma multi-tenant conversacional). DEC-001 fija una dirección de producto; este AS-IS es
la línea base contra la cual se medirá la Transformation hacia ese TO-BE en una fase posterior
(Fase 6). Confundir ambos es exactamente el error que el protocolo de esta documentación busca
evitar (`00-GOVERNANCE/01-SOURCE-OF-TRUTH.md`: "una especificación no es prueba de que la
funcionalidad esté implementada").

## Fuente principal y método

La columna vertebral de este AS-IS es **SRC-011** (`Auditoría técnica y funcional.docx`), una
auditoría de solo lectura sobre el repositorio real, fechada 2026-09-24, referenciada contra el
commit `HEAD 066bb91` en la rama `deploy/otrarondamas-wapsell-com`, con 309 archivos trackeados al
momento de la auditoría. Se adoptó como base (no como referencia secundaria) porque:

- Fue producida por lectura directa de código, no por relectura de especificaciones.
- Ya trae su propia matriz AS-IS (ítems A01–A40), su propio registro de contradicciones (C01–C24) y
  de riesgos (R01–R18), con evidencia citada a nivel de archivo y función.
- Su sección 21 ("Preguntas que requieren decisión") incluye D-WAP-001/002, que apuntan exactamente
  al mismo conflicto de alcance de producto que se resolvió en `04-DECISIONS/02-MULTITENANCY.md`
  (DEC-001) — confirma independientemente que la tensión detectada en Fase 1 (CON-001) es real y
  visible también a nivel de código, no solo de documentos.

Esta base se complementa y se contrasta con verificación directa de código (lectura de
`schema.prisma`, módulos de `apps/api/src`, estructura de los frontends, git log, tests) para
confirmar, actualizar o matizar sus hallazgos donde corresponda. Cada afirmación en los documentos
05-ASIS-* se marca con su clasificación de evidencia (`VERIFIED BY CODE`, `VERIFIED BY EXECUTION`,
`DOCUMENTED`, `NOT DETERMINABLE`) según `00-GOVERNANCE/02-EVIDENCE-POLICY.md`.

## Resumen ejecutivo (heredado de SRC-011 §1, cifras no re-verificadas salvo que se indique lo contrario)

Un ERP/POS comercial construido y en producción para un solo negocio real — Otra Ronda Más — con
arquitectura de aislamiento por empresa a nivel de datos, pero **sin** onboarding de negocios, sin
gestión de negocios como entidad operable, y **sin ningún componente de mensajería o asistentes**.

| Métrica | Valor (SRC-011, 2026-09-24) |
|---|---|
| Módulos backend (`apps/api/src`) | 19 |
| Handlers de ruta HTTP | 84 |
| Modelos de base de datos (`schema.prisma`) | 42 |
| Enums | 10 |
| Migraciones | 17 (19/09 → 24/09/2026) |
| Tests | 0 archivos, 0% cobertura, sin CI/CD |
| Riesgos verificados por lectura de código | 18 (R01–R18) |
| Contradicciones código-vs-documentación | 24 (C01–C24) |
| Productos en seed | 4.342, jerarquía de catálogo de 4 niveles |

**Qué existe realmente (verificado por código, según SRC-011):** autenticación JWT (8h) con
password y Google OAuth; permisos granulares en el token; aislamiento por `empresaId` vía Prisma
Client Extension; catálogo con jerarquía de 4 niveles; inventario por lotes FIFO con ajustes y
alertas; ventas presenciales con cotización, idempotencia, número correlativo, pagos mixtos y
comprobante imprimible; caja con apertura, movimientos, arqueo doble y cierre; compras con recepción
parcial, pagos y devoluciones a proveedor; tienda pública con catálogo, checkout sin pago y
seguimiento de pedido; clientes con niveles de fidelidad; invitaciones y legajo (RF-17); email vía
Resend (solo invitaciones).

**Qué NO existe (verificado por código, según SRC-011):** messaging, conversaciones, asistentes,
WhatsApp; Memberships (usuario↔negocio N:N) y administración de negocios; configuración de marca
por negocio; cuenta corriente operativa, entregas, notificaciones reales, reportes reales, anulación
de ventas, Mercado Pago; gestión de usuarios y permisos por API/UI; tests y CI/CD.

## Estructura de este AS-IS

| Documento | Contenido |
|---|---|
| `01-ASIS-PRODUCT.md` | Qué hace el producto hoy, funcionalmente |
| `02-ASIS-ARCHITECTURE.md` | Stack real, estructura de monorepo, comunicación entre apps |
| `03-ASIS-DATA.md` | Modelo de datos real (42 modelos) |
| `04-ASIS-IDENTITY.md` | Identidad, autenticación, ausencia de Business/Membership |
| `05-ASIS-AUTHORIZATION.md` | Permisos, guards, protección de endpoints |
| `06-ASIS-MODULES.md` | Módulos backend con sus endpoints reales |
| `07-ASIS-FLOWS.md` | Flujos end-to-end soportados hoy |
| `08-ASIS-INTEGRATIONS.md` | Integraciones externas reales vs. placeholder |
| `09-ASIS-UI.md` | Pantallas reales de pos-admin y tienda-online |
| `10-ASIS-BRANDING.md` | Branding real, hardcodeado, sin sistema configurable |
| `11-ASIS-QUALITY.md` | Tests, cobertura, CI/CD |
| `12-ASIS-EVIDENCE.md` | Evidencia de ejecución real documentada (comandos, resultados) |

## Relación con las decisiones ya tomadas

Este AS-IS no reabre `DEC-001`. Su función es la opuesta: fijar con precisión la distancia real
entre lo que existe hoy (esta documentación) y lo que DEC-001 aprobó como dirección (documento
`04-DECISIONS/02-MULTITENANCY.md`), para que esa distancia se pueda planificar en Fase 6
(Transformation) sin sorpresas. La propia SRC-011, en su sección 16 ("AS-IS → Wapsell") y sección 21
("Preguntas que requieren decisión"), ya adelanta buena parte de ese análisis de brecha — se
referencia desde `07-TOBE` y `06-TRANSFORMATION` cuando esas fases se aborden, no se duplica aquí.

## Limitaciones conocidas de este AS-IS (a la fecha de esta reconstrucción)

- Basado en el estado del repositorio al commit `066bb91` (2026-09-24) más verificación adicional de
  esta sesión (2026-09-25) — cualquier commit posterior no está reflejado.
- SRC-011 declara explícitamente varios puntos como `NOT DETERMINABLE` (estado real de producción,
  si las migraciones 14–17 están aplicadas, si `password123` sigue siendo la credencial activa,
  volumen de datos real) — este AS-IS hereda esas mismas incertidumbres, no las resuelve.
- No se ejecutó ningún comando contra una base de datos real ni un servidor corriendo durante esta
  reconstrucción — toda verificación de código de esta fase es lectura estática de archivos fuente,
  salvo la evidencia de ejecución ya documentada previamente en SRC-004 (`scaffolding-notas.md`).
