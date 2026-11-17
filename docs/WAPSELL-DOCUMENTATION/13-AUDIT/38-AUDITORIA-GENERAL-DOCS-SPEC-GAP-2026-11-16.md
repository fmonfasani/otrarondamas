# Auditoría general — documentación, SPEC General v0.5 y brecha AS-IS → TO-BE

**Fecha:** 2026-11-16 | **Estado:** AUDIT — NON-NORMATIVE (evidencia; no decide nada) | **Pedido del Owner:** "Hace una auditoría general de todos los documentos y spec de wapsell y vamos actualizar el spec general .5 y vamos a mejorar el tobe y achicar el gap del Assis actual, hace una auditoría profunda"

> Según ISS-08 este documento es AUDIT: describe lo que hay y propone; no reemplaza un Owner Ruling, el Decision Register ni la SPEC. Las propuestas que requieren decisión del Owner están en §9.

---

## 1. Alcance y método

| Fuente | Cómo se revisó | Etiqueta |
|---|---|---|
| `docs/WAPSELL-DOCUMENTATION/` (502 `.md`) | Inventario completo; estado declarado y fecha del último cambio en git de cada SPEC canónica, especializada, TO-BE, AS-IS, Requirements y estado del proyecto | `DOCUMENTADO` |
| SPEC General v0.5 | Lectura completa (§0–§21) | `DOCUMENTADO` |
| Decision Register | OR-B4-024 … OR-B4-041 (posteriores a la v0.5) | `DOCUMENTADO` |
| Código de `main` (`03f912a`, 2026-11-16) | `schema.prisma` (81 modelos), módulos de `apps/api/src`, 56 rutas de `apps/wapsell-remix` | `VERIFICADO POR CÓDIGO` |
| Tests | Lo que corre en B4 (integración en `enforce` y `shadow`) y Remix | `VERIFICADO POR TEST` |
| Producción | Health, variables (solo nombres), cron, volúmenes | `VERIFICADO POR EJECUCIÓN` |
| Issues #157–#171 (backlog del §21) | Estado en GitHub contra el código | `VERIFICADO POR CÓDIGO` |

---

## 2. Resumen ejecutivo

1. **La SPEC General quedó atrás de lo decidido.** Después de la v0.5 el Owner dictó **18 rulings** (OR-B4-024 … 041) que la SPEC no refleja: tienda por negocio, carrito del cliente, Mercado Pago por negocio, devoluciones (dos rondas de reglas: OR-B4-034 y las 13 de OR-B4-035), reportes, venta en la conversación, administración de la plataforma (3 etapas) y auditoría. Solo 3 documentos de los 502 los mencionan (el registro, la spec de autorización y este).
2. **Riesgo operativo crítico — no hay backups de producción.** El cron `0 */6 * * * /opt/wapsell/scripts/backup-db.sh` falla cada 6 horas: el script no existe. La base ya tiene el negocio real Otra Ronda Más. Los volúmenes `wapsell_mensajes_data` y `wapsell_legajos_data` (archivos de chat y legajos) tampoco tienen copia. `VERIFICADO POR EJECUCIÓN`.
3. **Contradicción de seguridad abierta.** OR-B4-009 exige MFA activo para Owner/Admin **antes de sumar un segundo Business** y ya para el Owner de Otra Ronda Más. El MFA no existe (#163) y OR-B4-039 ya permite crear negocios desde la plataforma.
4. **Dos capacidades del MVP no están implementadas:** Accounts Receivable / Cuenta corriente (MVP por OR-B4-021: existen los modelos `CuentaCorriente` y `Deuda`, pero no hay cobranza de deudas; la caja cuenta `DeudaCobro` en 0) y Fulfillment (MVP por D-016: solo existen las transiciones `CONFIRMADO` y `CANCELADO`; un pedido nunca llega a `ENTREGADO`).
5. **El backlog del §21 está desactualizado.** #160 cerrado; #161, #157, #158 y #159 están **sustancialmente hechos** en código pero siguen abiertos; #162–#169 siguen abiertos y son brechas reales.
6. **La documentación tiene deuda alta:** las specs especializadas de Identity, Commerce, Operations y Messaging siguen `DRAFT — NOT APPROVED` y son previas a OR-B2 (#170); el estado del proyecto está fechado 2026-10-03 (#171); el TO-BE tiene archivos duplicados y numeración repetida; hay 52 documentos sin estado declarado.
7. **Sin cobertura en la SPEC ni en el TO-BE:** facturación fiscal (AFIP/ARCA), fidelización, mayoristas, promociones, notificaciones y backups/continuidad. Algunos ya tienen código parcial (precio mayorista, invitación mayorista, módulo `loyalty`).

---

## 3. Salud de la documentación

### 3.1 Estado de los documentos rectores

| Documento | Estado declarado | Último cambio | Diagnóstico |
|---|---|---|---|
| `00-WAPSELL-SPEC-GENERAL.md` | v0.5 APPROVED | 2026-11-10 | Vigente, pero no incorpora OR-B4-024…041 |
| `00-WAPSELL-SPEC-GENERAL-v0.4.md` | DRAFT | 2026-11-10 | Copia histórica en la carpeta canónica: confunde. Mover a `15-HISTORY` |
| `01-IDENTITY-AND-TENANCY-SPEC.md` | DRAFT — NOT APPROVED | 2026-10-03 | Previa a OR-B2/R8; roles históricos; único con codificación dañada (`Ã`) |
| `02-COMMERCE-SPEC.md` | DRAFT — NOT APPROVED | 2026-10-03 | Previa a OR-B4-028…037 |
| `03-OPERATIONS-SPEC.md`, `04-MESSAGING-SPEC.md` | DRAFT — NOT APPROVED (v0.1) | 2026-10-03 | Sin reconciliar con la v0.5 ni con OR-B4-031/037 |
| `05-PLATFORM-AND-GOVERNANCE-SPEC.md` | DRAFT — NOT APPROVED (59 líneas) | 2026-11-03 | Hay 3 rulings implementados (OR-B4-038/039/040) que no recoge |
| `06-…`, `07-EXPERIENCE…` | DRAFT — OWNER REVIEW | 2026-10-20 | Sin decisión; el frontend real avanzó (Figma replicado, panel) |
| `07-WAPSELL-MVP-CONSOLIDATED-SPEC-BASELINE-v0.1.md` | DRAFT | 2026-10-04 | Comparte prefijo `07-` con otro doc; rol poco claro frente a la SPEC General |
| `08-ACCOUNTING…`, `09-TAX…` | DRAFT — FOR OWNER REVIEW | 2026-11-13 | Sin decisión; nada implementado |
| `05-AUTHORIZATION-SPEC.md` | APPROVED | 2026-11-16 | Vigente. **Defecto:** el encabezado dice v0.3; el changelog llega a v0.5 |
| `05a-AUTHORIZATION-CUTOVER-PLAN.md` | sin estado | 2026-11-11 | Aprobado por OR-B4-026 pero el archivo no lo dice |
| `08-TOBE/*` (21 archivos) | mayormente sin estado o OPEN | 2026-10-03 | Ver §3.2 |
| `00-WAPSELL-RELEVAMIENTO-ROADMAP-STATUS.md` | — | 2026-10-03 | Desactualizado 6 semanas (#171) |
| `05-REQUIREMENTS/…-001-490.md` | DRAFT / PROCESS ARTIFACT | 2026-10-03 | Correcto como artefacto de proceso |

### 3.2 TO-BE

- **Duplicados:** `01-IDENTITY-AND-TENANCY.md` y `01-IDENTITY-AND-TENANCY-RECONCILED.md`; `04-IDENTITY.md` repite el mismo tema; `06-BRANDING-AND-EXPERIENCE.md` y `09-BRANDING.md`.
- **Numeración repetida:** dos `01-`, dos `02-`, dos `03-`, dos `04-`, dos `05-`, dos `06-`, dos `07-`, dos `08-`.
- **Sin TO-BE** para dominios que ya están en producción o decididos: Store / tienda online (OR-B4-030), Payments por negocio (OR-B4-032/033), Returns & Refunds (OR-B4-034/035), Reports (OR-B4-036), Business Audit (OR-B4-041), Platform admin (OR-B4-038…040), Notifications al cliente (OR-B4-037), Fiscal, Loyalty, Wholesale, Operación (backups, monitoreo).
- El TO-BE de Messaging figura `OPEN` y no recoge OR-B4-031 (chat con el Owner) ni OR-B4-037 (vender en la conversación).

### 3.3 Higiene general

- **52 documentos sin estado declarado**, lo que contradice `00-GOVERNANCE/04-VERSIONING.md`.
- Las carpetas `AUDITORIAS/`, `P5-…`, `P6-…`, `P7-…` y `SPRINTS/` están fuera de la numeración canónica: son artefactos de ejecución sin rótulo de autoridad.
- Los 7 documentos de `00-GOVERNANCE` siguen `PROPOSED` (§2 de la SPEC).

---

## 4. Desfasaje SPEC General v0.5 ↔ decisiones posteriores

| SPEC v0.5 | Dice hoy | Decidido después | Cambio propuesto en la v0.6 |
|---|---|---|---|
| §1.3 "Reports, Audit, Notifications" | `OPEN DETAIL` | OR-B4-036 (qué cuenta como vendido), OR-B4-041 (auditoría), OR-B4-037 (avisos al cliente en el chat) | En alcance MVP, con su ruling |
| §1.3 "SaaS Admin" | Fuera del MVP operativo | OR-B4-038/039/040: lectura, alta de negocios, salud, actividad, uso, auditoría | Primera etapa de plataforma **en uso interno**; el resto sigue fuera del MVP |
| §6.1 Authorization | Catálogo y matriz en spec especializada | OR-B4-024/025/026 (spec aprobada, corte a `enforce`), OR-B4-033 (`PAYMENTS_CONFIGURE` solo Owner), OR-B4-041 (`AUDIT_VIEW_ALL` solo Owner) | Registrar que la matriz canónica decide en producción |
| §7 Roles | Transición ASISTENTE_LOCAL → VENDEDOR con fecha | OR-B4-027 (cerrado #160; alias hasta 2026-12-31) | Marcar como implementado |
| §10.1 Catalog | Product/BusinessProduct por etapas | OR-B4-028 (categorías y código interno) | Agregar la regla |
| §10.2 Cart | Consumidor Final, Cart anónimo | OR-B4-029 (Cart del Customer autenticado, en el servidor) | Agregar; Cart anónimo sigue pendiente |
| — | (no existe) | OR-B4-030: una tienda por Business y una cuenta de cliente por tienda | Nueva subsección **Store** |
| §10.5 Payments | Mercado Pago (OR-B4-016) | OR-B4-032: cada Business cobra en su propia cuenta; el cliente paga después de que el Business confirma | Agregar |
| §10.6 / §10.10 Returns, Refunds | Specialized Spec | OR-B4-034/035: registran el equipo y el cliente; inspección antes de reponer; reembolso por el medio original; plazo configurable (10 días por defecto) | Agregar las reglas |
| §12 Messaging | 1:1, sin WhatsApp | OR-B4-031 (el chat del cliente abre con el Owner), OR-B4-037 (catálogo, carrito, pedido y avisos en el chat) | Agregar; registrar el conflicto OR-B4-031 vs I-2 |
| §14 Security | MFA Owner/Admin | OR-B4-009 sin implementar y OR-B4-039 ya habilitado | Ver §5.2 |
| §15 Open | 12 + 15 ítems | Varios cerrados (Reports, Audit, catálogo de permisos, enforcement) | Depurar |
| §21 Backlog | 15 filas al 2026-11-10 | Ver §5 | Reemplazar por la tabla verificada |

---

## 5. Brecha AS-IS → SPEC/TO-BE verificada (2026-11-16)

### 5.1 Backlog del §21, re-verificado

| # | Área | Estado real en `main` | Evidencia | Acción |
|---|---|---|---|---|
| #157 | POS / tienda sobre la API | **Hecho** (tienda por slug, cuenta, carrito, pedidos, chat, devoluciones) | rutas `_customer.tienda_*`; suites p3/p6/p13 | Cerrar |
| #158 | Mercado Pago real | **Hecho en código**: OAuth por negocio, checkout y webhook firmado. En producción queda inerte hasta cargar la app de MP | `payments/mercadopago/*`; p11-4 | Cerrar el código y abrir uno de activación |
| #159 | Dashboard Remix | **Hecho** para Inicio, Pedidos, Ventas, Devoluciones, Clientes, Caja, Catálogo, Inventario, Compras, Reportes, Equipo, Auditoría, Cobros y Ajustes. **Faltan:** Fidelización, Mayoristas, onboarding | 27 rutas `dashboard.*` | Cerrar y abrir los faltantes |
| #160 | Roles canónicos | Cerrado; alias ASISTENTE_LOCAL hasta 2026-12-31 | `LEGACY_ROLE_MAP` | — |
| #161 | Autorización canónica | **Sustancialmente hecho:** matriz fija y motor único; `enforce` por defecto y en producción. **Resto:** tablas legacy (`UsuarioPermiso`, `RoleTemplate`/`Capability`/`Grant`) siguen vivas para `shadow` | `authorization-engine.ts`; B4 en dos modos | Achicar a "retirar legacy" (necesita OR-B4-010) |
| #162 | Membership INACTIVE | Brecha: `enum MembershipStatus { ACTIVE SUSPENDED }` | `schema.prisma` | Pendiente |
| #163 | MFA | **Brecha crítica:** no existe | sin código | Pendiente — prioridad 1 |
| #164 | Cut-over legacy | Brecha: `Usuario`/`Empresa` conviven con `User`/`Membership` | `schema.prisma` | Pendiente (criterios OR-B4-010) |
| #165 | Reserva de stock | Brecha: se descuenta al confirmar; no hay reserva | sin modelo de reserva | Pendiente |
| #166 | Location MAIN | Brecha: no hay `Location`; `Lote` existe | `schema.prisma` | Pendiente |
| #167 | Consumidor Final / Cart anónimo | Parcial: "Consumidor Final" solo existe en Devoluciones; no hay Cart anónimo | grep | Pendiente |
| #168 | 10 estados de Order | Brecha: solo `CONFIRMADO` y `CANCELADO`. `ORDER_CONFIRM` está mapeado | `ORDER_TRANSITIONS` | Pendiente (va con Fulfillment) |
| #169 | Product global | Brecha esperada (por etapas, OR-B4-011) | — | Sigue diferido |
| #170 | Specs especializadas | Brecha documental | §3.1 | Pendiente |
| #171 | Estado del proyecto | Brecha documental | 2026-10-03 | Pendiente |

### 5.2 Brechas nuevas, fuera del §21

| Prioridad | Área | SPEC / ruling | AS-IS | Riesgo |
|---|---|---|---|---|
| **P0** | Backups y continuidad | §14 "trazabilidad" y NFR `OPEN` | El cron de backup falla (falta el script); sin copia de chat ni legajos | Pérdida total de datos del negocio real |
| **P0** | MFA antes del segundo negocio | OR-B4-009, OR-B3-014 | No existe; el alta de negocios ya está habilitada | Toma de cuenta del Owner o del admin de plataforma |
| P1 | Cuenta corriente / AR | OR-B4-021 (MVP) | Modelos sin flujo; caja con `DeudaCobro` = 0 | Ventas fiadas sin control |
| P1 | Fulfillment | D-016 (MVP, dentro de Orders) | Un pedido no pasa de `CONFIRMADO` | Reportes y avisos incompletos; stock sin salida física |
| P1 | Facturación fiscal | `OPEN` (CON-003); spec 09 en DRAFT | Nada | Cumplimiento fiscal para vender en Argentina |
| P2 | Mayoristas | No está en la SPEC | Precio mayorista e invitación mayorista sueltos | Funcionalidad a medias |
| P2 | Fidelización | No está en la SPEC | Módulo `loyalty` registrado sin pantalla | Código sin dueño |
| P2 | Promociones / listas de precios | §10.6 "Specialized Spec" | Solo `descuentoPorcentaje` por producto | — |
| P2 | Auditoría: completar la cobertura | OR-B4-041 "still open" | Faltan stock, descuentos, conexión de MP e ingresos fallidos | Huecos de trazabilidad |
| P3 | Módulos sin uso | §13 Modular Monolith | `kafka`, `alerts`, `tenants`, `sms-notifications` sin consumidor claro | Superficie y mantenimiento |

### 5.3 Ya alineado (se conserva del §21)

Aislamiento por Business; `Customer ≠ User`; Messaging por Business con Customer sin User; Sale `CONFIRMADA/ANULADA`; ciclo de Caja; stock nunca negativo; Modular Monolith con REST; autorización canónica en `enforce`; tienda por negocio; Mercado Pago por negocio; devoluciones; reportes; auditoría del negocio; plataforma en uso interno; email transaccional (Resend con `no-reply@wapsell.com`).

---

## 6. Propuesta de TO-BE mejorado

Se propone un TO-BE **por dominio**, cada uno con el mismo formato (Propósito · Reglas con su ruling · Estados · Permisos · Fuera de alcance · Estado AS-IS). Nombres y numeración únicos:

| # | TO-BE | Fuente principal | Cambio |
|---|---|---|---|
| 01 | Identity, Tenancy y Membership | OR-B2, R8-ID, OR-B4-008/010/027 | Fusiona los 3 documentos de identidad |
| 02 | Authorization | Authorization SPEC v0.5 | Pasa a referencia de la spec aprobada |
| 03 | Catalog y Pricing (incluye mayoristas y promociones) | OR-B2-010, OR-B4-011/028 | Nuevo: mayorista y promociones |
| 04 | Store y Cart | OR-B4-029/030, OR-B4-014/022 | Nuevo |
| 05 | Orders y Fulfillment | R8-ORD-002, D-016, OR-B4-013 | Agrega el ciclo de entrega |
| 06 | Inventory | OR-B2-014…018, OR-B4-012/015 | Sin cambio de fondo |
| 07 | Sales, Payments y AR | OR-B4-016/021/032/033 | Agrega AR operativo |
| 08 | Cash | D-013, OR-B4-023 | — |
| 09 | Returns y Refunds | OR-B4-034/035 | Nuevo |
| 10 | Messaging y Selling in conversation | OR-B2-019/021, OR-B4-031/037 | Actualiza |
| 11 | Reports y Business Audit | OR-B4-036/041 | Nuevo |
| 12 | Platform (Wapsell) | OR-B3-003, OR-B4-020/038/039/040 | Nuevo |
| 13 | Fiscal | spec 09 | Nuevo (OPEN) |
| 14 | Loyalty | — | Nuevo (OPEN) |
| 15 | Operations y NFR (backups, monitoreo, RPO/RTO, seguridad) | §13/§14 | Nuevo |

---

## 7. Plan para achicar la brecha (propuesto; la secuencia pertenece al Plan, no a la SPEC)

| Etapa | Qué | Por qué primero |
|---|---|---|
| **0 — Ya** | Backups de base y volúmenes, con prueba de restauración | P0: hoy no hay copia |
| **1** | MFA para Owner/Admin y para el admin de plataforma | P0: condición de OR-B4-009 antes del segundo negocio |
| **2** | Fulfillment (estados de entrega) + reserva de stock (#165, #168) | Cierra el ciclo pedido → entrega; reportes y avisos correctos |
| **3** | Cuenta corriente (AR) operativa | MVP por OR-B4-021 |
| **4** | Consumidor Final + Membership INACTIVE (#167, #162) | Chicos y desbloquean ventas de mostrador |
| **5** | Mayoristas y Fidelización | Pantallas pendientes con código parcial |
| **6** | Fiscal (decisión + spec) | Requiere decisión del Owner y tal vez un proveedor |
| **Docs** | SPEC v0.6 + TO-BE por dominio + estado del proyecto + reconciliar especializadas (#170, #171) | Que la documentación vuelva a ser fuente de verdad |
| **Limpieza** | Retirar legacy de autorización (#161 resto, #164) y módulos sin uso | Necesita OR-B4-010 |

---

## 8. Defectos documentales concretos (corregibles sin decisión)

1. `05-AUTHORIZATION-SPEC.md`: el encabezado dice `0.3`; el changelog llega a `0.5`.
2. `05a-AUTHORIZATION-CUTOVER-PLAN.md`: no declara su aprobación (OR-B4-026).
3. `00-WAPSELL-SPEC-GENERAL-v0.4.md` está en `CANONICAL/`: moverlo a `15-HISTORY/`.
4. `01-IDENTITY-AND-TENANCY-SPEC.md`: tiene codificación dañada.
5. Issues #157, #158, #159 y #160: cerrar o reabrir con el alcance restante (ver §5.1).
6. 52 documentos sin estado: rotularlos (`HISTORICAL`, `PROCESS ARTIFACT`, `AUDIT`, etc.).

---

## 9. Decisiones del Owner necesarias

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| D1 | Aprobar la SPEC General v0.6 (propagación de OR-B4-024…041 + §21 verificado) | Aprobar / Revisar primero | Aprobar: no agrega reglas nuevas, solo incorpora rulings ya dictados |
| D2 | Backups de producción | Arreglar ya (script + prueba de restauración) / Más adelante | **Ya** |
| D3 | MFA vs segundo negocio | Bloquear el alta de negocios hasta tener MFA / Permitir altas y hacer MFA en paralelo | Bloquear hasta tener MFA (es lo que dice OR-B4-009) |
| D4 | Reestructurar el TO-BE por dominio (§6) | Sí / Mantener el actual | Sí |
| D5 | Orden del plan (§7) | Como está / Otro orden | Como está |
| D6 | Fiscal: ¿entra al MVP? | Sí (definir proveedor) / Después del MVP | A decidir con el contador; hoy está `OPEN` |
