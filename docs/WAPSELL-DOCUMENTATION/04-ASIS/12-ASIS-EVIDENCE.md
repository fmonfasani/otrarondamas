# AS-IS — Evidence
**Evidencia:** VERIFIED BY EXECUTION (SRC-004, `scaffolding-notas.md`, leído en su totalidad — 939 líneas, secciones 1-37)

Este documento es el registro cronológico de evidencia de ejecución real (comandos corridos,
resultados HTTP observados, verificación directa en Postgres) que sustenta las afirmaciones
"VERIFIED BY EXECUTION" del resto de los documentos AS-IS. Complementa `01-ASIS-PRODUCT.md` a
`11-ASIS-QUALITY.md`, no los repite.

## Secciones 1-9 (ya cubiertas en Fase 1, resumen)

Decisiones técnicas iniciales (npm workspaces, SPA sin SSR para tienda-online, puerto 5500 para
Postgres local), reparación de un entorno que no compilaba, módulo `auth` (JWT + guards), login real
en `pos-admin`, aislamiento multiempresa (Prisma Client Extension, con un bug real de NestJS
encontrado y resuelto — `Scope.REQUEST` no compatible con el orden de guards), fricciones
documentadas con `spec-catalogo-productos.md`, CRUD de productos.

## Secciones 10-37 (leídas en esta sesión, no cubiertas en Fase 1)

- **§10 Importación de catálogo real** (20/09/2026): 4.342 productos importados desde un Excel real
  del negocio, excluyendo dos fuentes (Coca-Cola, DIPA MAX) por falta de precio confiable.
  **VERIFIED BY EXECUTION**: `SELECT COUNT(*)` → 4342; idempotencia confirmada (segunda corrida no
  duplicó); `GET /catalogo/productos` real → 200 con 4342 productos en 318ms; aislamiento
  multiempresa repetido sobre datos reales → 404 para empresa ajena.
- **§11 Módulo ventas**: descuento de stock FIFO transaccional. **VERIFIED BY EXECUTION**: total
  exacto verificado a mano, stock descontado exactamente lo vendido, atomicidad confirmada, 401/400
  en casos inválidos, `DELETE /ventas/:id` confirmado inexistente.
- **§12 Módulo pagos**: INV-04 (no exceder saldo) verificado con casos límite exactos, incluida
  concurrencia dentro de una misma transacción; Mercado Pago rechazado explícitamente por el DTO.
- **§13 Pantalla de venta en pos-admin**: sin navegador real (limitación reconocida) — verificado
  reproduciendo llamadas HTTP exactas con header `Origin` de Vite; flujo completo buscar→vender→
  pagar verificado contra el catálogo real de 4.342 productos.
- **§14 Módulo caja**: migración real de schema (`ArqueoCaja.usuarioEntranteId`) — en el mismo diff
  se descubrió y corrigió un índice único (`Caja.empresaId`) declarado en el schema desde el inicio
  pero **nunca aplicado a la base de datos**. Tabla de 13 casos HTTP verificados con resultado
  exacto.
- **§14.6 / §22 Gap de seguridad en `caja.controller.ts`**: detectado antes de integrar Google login
  — la mayoría de endpoints de caja sin `@RequierePermiso`. Resuelto tras releer RF-09
  explícitamente, con la decisión de qué proteger documentada, no un parche silencioso.
- **§15-16 Google OAuth + perfil**: alta automática condicionada a variable de entorno obligatoria;
  perfil expone solo lo que el scope `profile email` de Google permite — limitación real confirmada
  (sin teléfono/dirección/fecha de nacimiento), no asumida de antemano.
- **§17-20 Inventario Fases 1-4**: consulta de stock, ajustes manuales con `$executeRaw` atómico
  (evita condición de carrera sin necesidad de lock explícito), conexión con recepción de compras,
  alertas de bajo stock/vencimiento configurables por variable de entorno. Verificado contra base de
  datos real en cada fase, con casos límite (ajuste hasta 0 exacto, rechazo si dejaría stock
  negativo).
- **§19 Compras y proveedores**: recepción parcial validada contra el pendiente real, no contra un
  acumulado erróneo. Gap real encontrado en el seed (`upsert` con `update: {}` no propaga permisos
  nuevos a usuarios ya existentes) — documentado con honestidad explícita sobre el riesgo de un "fix
  obvio" mal aplicado, resuelto con un script aparte (`sync-permisos-owner.ts`).
- **§21 Autorización D-06**: ciclo completo de 8 pasos verificado de punta a punta — bloqueo →
  intento de auto-autorización rechazado → credenciales inválidas rechazadas → autorización exitosa
  → cierre.
- **§23 Inventario Fase 5**: venta de lote vencido se permite pero queda auditada
  (`loteVencidoAlMomento`) — verificado insertando un lote vencido a mano y confirmando el flag
  tanto en la respuesta HTTP como en la base de datos.
- **§24-27 Tienda Online Fases 1-6**: modelo de datos migrado en dos pasos, con verificación de
  datos existentes antes de aplicar `NOT NULL`. Gap real de `empresaScopeExtension` sin cubrir
  `upsert`, resuelto sin tocar el archivo compartido. Descuento por producto verificado con cálculo
  exacto (`1674.746 × 0.8`).
- **§26 Corte de dominios en producción**: ejecutado en el VPS real. Gap real encontrado: nginx
  servía el bundle equivocado en **ambos** dominios pese a un `git pull` exitoso — detectado
  comparando el hash del bundle JS realmente servido, no solo verificando `200 OK`. Corregido
  copiando manualmente los `.conf` de nginx.
- **§28-33 Fidelización Fases 1-5**: niveles calculados con umbrales confirmados por el dueño
  (0-2/3-9/10+ compras), verificado subiendo un cliente real a VIP con 10 compras que mezclan venta
  presencial y pedido online contando al mismo historial. Descuento combinado (producto +
  fidelización) verificado con cálculo exacto de 3 pasos.
- **§31 Categorización de catálogo**: migración de datos real sobre los 4.342 productos existentes,
  preservando IDs. Gap de seguridad real encontrado (5 modelos nuevos sin scope multiempresa),
  detectado por **comportamiento anómalo** (más filas de las esperadas en una consulta), no por
  revisión de código previa.
- **§34 Deploy a producción con migración de datos real**: ensayado primero contra una **copia
  restaurada de un backup real de producción**, no solo en local. 2 bugs reales encontrados y
  corregidos en el ensayo (`codigoInterno: { not: null }` inválido sobre un campo no-nullable) antes
  de tocar la base real. Permiso `fidelizacion.gestionar` faltante en producción, detectado y
  corregido con el script ya existente.
- **§35 Definición de RF-17** (22/09/2026): solo especificación, explícitamente sin código todavía
  — el propio documento nuevo (`docs/spec-login-roles.md`, = SRC-006) lo aclara.
- **§36-37 Implementación de RF-17** (22-23/09/2026): JWT con discriminador `type`,
  `LegajoAprobadoGuard`, flujo completo de invitación/legajo/aprobación para Usuario y Cliente
  mayorista. Corrección post-deploy real: `seller@otrarondamas.com` migró con `rol: OWNER` por el
  default del schema — detectado y corregido a `ASISTENTE_LOCAL` tras verificar primero en un
  entorno de ensayo (rehearsal), no directo en producción.

## Patrón de higiene de pruebas, consistente en todas las secciones

Todas las secciones documentan explícitamente "servidor detenido después de la verificación" y, en
varios casos, "datos de prueba revertidos/eliminados" — es un patrón consistente de higiene real
contra entornos reales, no simulacros dejados corriendo o datos de prueba mezclados con producción.

## Inconsistencia de nombre de la empresa (typo persistente, no corregido)

"Otra Ronda Más" (frontends, specs) vs. "**Otra Roonda Más**" (seed, API, emails, README) — el typo
es, literalmente, la clave de `upsert` usada en el seed (`Empresa.nombre @unique`). No se determinó
en esta sesión si esto se corrigió después del 24/09/2026 (fecha de SRC-011, que lo señala como
contradicción C20).

## Autoría del desarrollo

El git log muestra actividad concentrada en fechas de "hoy" simuladas por el entorno (19-24
septiembre de 2026), con un único autor humano (Federico Monfasani, fmonfasani@gmail.com) y
coautoría de "Claude Sonnet 4.6" en los commits recientes de Ventas — el desarrollo fue asistido por
IA de forma consistente y **documentada explícitamente en los propios commits**, no oculta.

## Lo que esta evidencia NO cubre

- No se leyó línea por línea cada `*.service.ts`/`*.dto.ts` del backend (decenas de archivos). La
  cobertura de endpoints y guards es completa (se abrieron todos los `*.controller.ts`), pero
  detalles internos de lógica de negocio más allá de lo citado aquí dependen de lo que SRC-004
  documenta como ejecutado, no de una relectura exhaustiva de cada archivo de servicio en esta
  sesión.
- No se determinó el estado real de producción a la fecha de esta reconstrucción (2026-09-25):
  cuáles migraciones están aplicadas, si `password123` sigue siendo la credencial activa de
  `owner`/`seller`, ni el volumen de datos real — mismo `NOT DETERMINABLE` que ya señalaba SRC-011.
