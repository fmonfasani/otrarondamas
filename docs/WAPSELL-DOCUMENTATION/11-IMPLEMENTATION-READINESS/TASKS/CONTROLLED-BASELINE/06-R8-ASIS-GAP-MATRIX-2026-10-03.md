# WAPSELL — R8 AS-IS → CANONICAL GAP MATRIX — 2026-10-03

**Status:** DONE — GAP MAPPING
**Basis:** R8 AS-IS Evidence Pack + current canonical SPEC/TO-BE
**Purpose:** Separate verified implementation gaps from unresolved specification/architecture decisions.

## 1. Reading rule

A GAP means the inspected AS-IS does not currently realize a canonical target concept.
A gap does not authorize implementation and does not mean that the missing behavior has a closed technical solution.

Status vocabulary:
- IMPLEMENTATION GAP: canonical concept is closed enough conceptually; AS-IS does not realize it.
- SPECIFICATION GAP: canonical target exists, but physical/behavioral details remain OPEN.
- ARCHITECTURE BLOCKER: implementation cannot be safely derived before architecture closes.
- EVIDENCE GAP: repository inspection is insufficient to establish the fact.
- HISTORICAL / SUPERSEDED: old AS-IS or task wording must not drive current implementation.

## 2. Identity & Tenancy
| Canonical target | AS-IS | Gap | Classification |
|---|---|---|---|
| Global User | Usuario has direct Empresa relation | Identity is physically Business-bound | IMPLEMENTATION GAP + ARCHITECTURE BLOCKER |
| User↔Business N:N Membership | No Membership model evidenced | No physical Membership boundary | IMPLEMENTATION GAP + SPECIFICATION/ARCHITECTURE BLOCKER |
| Membership ACTIVE/INACTIVE | No Membership lifecycle | Cannot verify physical lifecycle | SPECIFICATION GAP |
| Multiple Business memberships / Business Switch | JWT carries one empresaId | Current token model is single-Business | IMPLEMENTATION GAP + ARCHITECTURE BLOCKER |
| Business isolation | EmpresaScopedPrismaService exists | Current mechanism is Empresa-scoped Prisma, not final Business isolation model | IMPLEMENTATION GAP / ARCHITECTURE DETAIL |
| Global normalized email uniqueness | Usuario.email unique | Current uniqueness exists, normalization mechanism not evidenced | PARTIAL — implementation detail OPEN |

## 3. Authorization
| Canonical target | AS-IS | Gap | Classification |
|---|---|---|---|
| Membership→Role→Permission | RoleUsuario + UsuarioPermiso + JWT permissions | Authorization is attached directly to Usuario | IMPLEMENTATION GAP + SPECIFICATION/ARCHITECTURE BLOCKER |
| MVP roles | OWNER, ASISTENTE_LOCAL, PROVEEDOR, REPARTIDOR | Canonical Owner/Admin/Vendedor/Gestor de Stock not physically represented | IMPLEMENTATION GAP |
| Customer/Supplier not Membership Roles | Supplier is currently a Usuario role | Role boundary differs | IMPLEMENTATION GAP |
| Repartidor excluded from MVP Membership Roles | Repartidor exists in current role enum | Historical/AS-IS artifact; removal requires approved transformation | IMPLEMENTATION GAP |
| Permission catalogue/matrix | Current permission model exists but not canonical matrix | Exact final catalogue/matrix remains OPEN | SPECIFICATION GAP |
| Token alone not sufficient | Permissions/role embedded in JWT | Technical enforcement and freshness remain implementation detail | PARTIAL / ARCHITECTURE DETAIL |
| MFA Owner/Admin | No canonical mechanism established in inspected evidence | Required target, mechanism OPEN | SPECIFICATION/ARCHITECTURE BLOCKER |

## 4. Customer / Catalog / Cart
| Canonical target | AS-IS | Gap | Classification |
|---|---|---|---|
| Customer distinct from User | Cliente is separate model | Conceptually aligned | NO GAP |
| Controlled Customer↔User association | Current schema has optional account-related fields but no canonical controlled association model evidenced | Association mechanics unresolved | SPECIFICATION GAP |
| Global Product | Producto is Empresa-scoped | Product identity is not global | IMPLEMENTATION GAP + ARCHITECTURE BLOCKER |
| BusinessProduct | No model evidenced | Commercial Business relation absent | IMPLEMENTATION GAP + SPECIFICATION BLOCKER |
| Anonymous Cart | No persistent Cart model evidenced in inspected backend excerpt | Physical Cart boundary not established | EVIDENCE/SPECIFICATION GAP |
| Customer required before Order | Pedido currently has required clienteId | Current AS-IS is stricter than anonymous-cart target but consistent at Order boundary | NO DIRECT GAP; migration behavior requires design |

## 5. Inventory
| Canonical target | AS-IS | Gap | Classification |
|---|---|---|---|
| Business-owned stock | Producto/Lote/MovimientoStock carry empresaId | Conceptually aligned | NO GAP |
| Negative stock prohibited | Atomic adjustment + insufficient-stock rejection | Strongly evidenced | NO GAP — AS-IS behavior |
| Generic Location, MAIN minimum | No Location model evidenced | Physical location boundary absent | IMPLEMENTATION GAP + SPECIFICATION BLOCKER |
| Order confirmation reserves stock | Order confirmation directly decrements stock | Reservation boundary is not represented separately | IMPLEMENTATION GAP + SPECIFICATION BLOCKER |
| Physical stock-out movement | MovimientoStock created on decrement | Conceptually aligned | NO GAP — AS-IS behavior |
| FEFO/FIFO | Lots ordered by expiration | Current code is expiration-first for all lots; no explicit no-expiry FIFO branch evidenced | PARTIAL / SPECIFICATION GAP |
| Inventory transaction boundaries | Caller transaction used for decrement | Technical behavior exists but final architecture boundary not approved | ARCHITECTURE DETAIL |

## 6. Order / Sale
| Canonical target | AS-IS | Gap | Classification |
|---|---|---|---|
| Order ≠ Sale | Separate models | Aligned | NO GAP |
| Business authorization ORDER_CONFIRM | Pedido uses pedidos.gestionar | Canonical permission not evidenced | IMPLEMENTATION GAP + SPECIFICATION BLOCKER |
| Confirmed Order reserves stock | Confirmation decrements stock | Reservation effect differs from canonical conceptual boundary | IMPLEMENTATION GAP |
| Sale born at commercial confirmation | Pedido confirmation does not create Venta | Critical missing conversion boundary | IMPLEMENTATION GAP + SPECIFICATION BLOCKER |
| Confirmed Sale immutable | Venta can be ANULADA | Current correction semantics require comparison with canonical reversal/refund model | SPECIFICATION GAP |
| Order/Sale state/effect matrices | Simple current states | Canonical full state/effect model remains OPEN | SPECIFICATION BLOCKER |

## 7. Payments / Cash / AR
| Canonical target | AS-IS | Gap | Classification |
|---|---|---|---|
| Payment separate from Sale | Pago separate | Aligned | NO GAP |
| Payment lifecycle/reconciliation | Manual payments immediately APROBADO | No canonical lifecycle/reconciliation model evidenced | SPECIFICATION GAP |
| Payment↔Cash effects | Cash movement can be generated for effective payments | Current behavior differs between payment paths and is explicitly incremental | SPECIFICATION GAP |
| AR in MVP | CuentaCorriente/Deuda/AplicacionPago exist | Physical semantics need canonical reconciliation | SPECIFICATION GAP |
| Sensitive Cash permissions | caja.gastos on selected operations | Canonical specific Permissions not closed | IMPLEMENTATION/SPECIFICATION GAP |
| Cash state machine | Current states exist | Final canonical state/adjustment semantics OPEN | SPECIFICATION GAP |

## 8. Fulfillment
| Canonical target | AS-IS | Gap | Classification |
|---|---|---|---|
| Fulfillment under Orders | Pedidos service explicitly says preparation/asignación/entrega are not implemented | Lifecycle incomplete | IMPLEMENTATION GAP + SPECIFICATION BLOCKER |
| Repartidor not MVP Membership Role | Current Usuario enum includes REPARTIDOR | AS-IS legacy role | IMPLEMENTATION GAP / TRANSFORMATION |

## 9. Messaging
| Canonical target | AS-IS | Gap | Classification |
|---|---|---|---|
| Messaging first-class MVP domain | No inspected API messaging module | Domain backend implementation absent from inspected tree | IMPLEMENTATION GAP |
| Conversation belongs one Business | No physical model evidenced | Physical boundary OPEN | SPECIFICATION/ARCHITECTURE BLOCKER |
| Customer may participate without User | No physical model evidenced | Participant model OPEN | SPECIFICATION GAP |
| Wapsell messaging independent of WhatsApp | Current code only has historical canalOrigen=WhatsApp references | No dependency evidenced | NO GAP on dependency |
| Messaging↔Commerce boundary | No implementation | Integration contracts absent | SPECIFICATION/ARCHITECTURE BLOCKER |
| AI inactive MVP | No AI execution path identified in inspected API | Consistent with inactive MVP | NO GAP |

## 10. Brand / Cross-cutting
| Canonical target | AS-IS | Gap | Classification |
|---|---|---|---|
| Business Brand configurable | No final Brand physical model verified in this pass | Evidence insufficient | EVIDENCE GAP |
| Auditability | AuditLog exists in sales/payment paths | Partial implementation | PARTIAL |
| Notifications | No final canonical physical model established | OPEN | SPECIFICATION GAP |

## 11. Critical gaps for planning
1. User / Business / Membership physical boundary.
2. Authorization Membership→Role→Permission.
3. Product + BusinessProduct physical boundary.
4. Order confirmation → Sale conversion boundary.
5. Inventory reservation vs physical stock-out semantics.
6. Location model.
7. Payment/Cash/AR effect model.
8. Messaging physical domain and Commerce integration.
9. Architecture closure for the first implementation slice.

## 12. What this matrix does NOT do
- It does not approve architecture.
- It does not define schemas.
- It does not define API endpoints.
- It does not choose Prisma/Postgres/JWT/RLS/etc.
- It does not create new normative requirements.
- It does not declare historical modules deleted.
- It does not authorize migrations or code changes.

## 13. Gate
**R8 AS-IS/GAP REVIEW: PASS WITH BLOCKERS**

The evidence is sufficient to identify the principal transformation gaps. The next stage is controlled closure of the blockers in the order required by the transformation plan.