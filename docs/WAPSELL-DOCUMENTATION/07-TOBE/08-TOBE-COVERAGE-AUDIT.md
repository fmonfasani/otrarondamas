# Wapsell — TO-BE Coverage Audit
**Fecha:** 2026-09-29  
**Estado:** AUDIT — READ-ONLY / NON-NORMATIVE  
**Scope:** `07-TOBE/`  
**Objetivo:** verificar cobertura documental del TO-BE antes de Contracts → Invariants → Tests → Plan.

> Este documento no aprueba requisitos, no crea decisiones y no modifica el alcance funcional.
> Clasifica únicamente lo que existe actualmente en el repositorio.

---

## 1. Resultado ejecutivo

**Resultado: TO-BE COVERAGE — PASS WITH FINDINGS**

La capa `07-TOBE/` ya contiene documentación sustantiva para:

1. Foundation / Overview
2. Identity & Tenancy
3. Commerce
4. Inventory
5. Cash
6. Messaging
7. Branding & Experience
8. Platform & Governance

La cobertura funcional es suficiente para comenzar una revisión transversal previa a Contracts, pero
**no corresponde declarar el TO-BE completamente cerrado**.

Los principales findings son documentales y de definición:

- el Overview quedó desactualizado respecto de los nuevos documentos creados después de Fase 6.0;
- no existe un TO-BE independiente de Payments, aunque Payments está tratado dentro de Commerce;
- varios dominios del mapa general siguen siendo propuestas o OPEN DETAIL;
- las decisiones D-003…D-018 continúan siendo DERIVED / RECONSTRUCTED y no OWNER-VERBATIM;
- Contracts, Invariants y Tests todavía no existen como capa normativa posterior;
- algunos conflictos continúan OPEN;
- el modelo físico y múltiples detalles de implementación siguen deliberadamente abiertos.

**No se encontró motivo para inventar otra capa TO-BE de dominio antes de esta auditoría.**

---

## 2. Inventario físico verificado

| Archivo | Cobertura | Estado |
|---|---|---|
| `00-TOBE-OVERVIEW.md` | Gobierno, conceptos, mapa general | DRAFT |
| `01-IDENTITY-AND-TENANCY.md` | User, Business, Membership, Customer, autorización | DRAFT |
| `02-COMMERCE.md` | Customer, Catalog, Pricing, Orders, Sales, Payments, AR, Purchases/AP, Fulfillment | DRAFT |
| `03-INVENTORY.md` | Stock, movimientos, integridad, aislamiento | DRAFT |
| `04-CASH.md` | Caja, apertura, movimientos, arqueo, cierre | DRAFT |
| `05-MESSAGING.md` | Conversation/Messaging, relación con Commerce, AI scope | DRAFT |
| `06-BRANDING-AND-EXPERIENCE.md` | Brand, Design System, Customer/Staff experience | DRAFT |
| `07-PLATFORM-AND-GOVERNANCE.md` | Architecture, CI/CD, Platform, Audit, Reports, Notifications, Security, Observability | DRAFT |

**Resultado:** 8 documentos TO-BE sustantivos verificados por lectura del repositorio.

---

## 3. Cobertura por dominio

| Dominio conceptual | Documento principal | Cobertura |
|---|---|---|
| Identity | 01 | CUBIERTO |
| Tenancy | 01 | CUBIERTO |
| Authorization | 01 + 06 | CUBIERTO CON OPEN DETAIL |
| Branding | 06 | CUBIERTO CON OPEN DETAIL |
| Customers | 02 + 01 | CUBIERTO |
| Catalog | 02 | CUBIERTO CON OPEN DETAIL |
| Pricing | 02 | CUBIERTO CON OPEN DETAIL |
| Messaging | 05 | CUBIERTO CON OPEN DETAIL |
| Orders | 02 + 05/16 boundary | CUBIERTO CON OPEN DETAIL |
| Sales | 02 | CUBIERTO CON OPEN DETAIL |
| Payments | 02 | CUBIERTO; NO TO-BE INDEPENDIENTE |
| Cash | 04 | CUBIERTO CON OPEN DETAIL |
| Inventory | 03 | CUBIERTO CON OPEN DETAIL |
| Purchases | 02 | CUBIERTO CON OPEN DETAIL |
| Suppliers | 02 | CUBIERTO CON OPEN DETAIL |
| Accounts Receivable | 02 | CUBIERTO CON OPEN DETAIL |
| Accounts Payable | 02 | CUBIERTO CON OPEN DETAIL |
| Fulfillment | 02 | CUBIERTO CON OPEN DETAIL |
| Notifications | 07 | DIRECCIÓN / OPEN DETAIL |
| Reports | 07 | DIRECCIÓN / OPEN DETAIL |
| Audit | 07 | DIRECCIÓN / OPEN DETAIL |
| Platform | 07 | DIRECCIÓN / OPEN DETAIL |
| Architecture | 07 | CUBIERTO POR D-017 CON OPEN DETAIL |
| CI/CD | 07 | CUBIERTO POR D-018 CON OPEN DETAIL |

---

## 4. Payments — situación real

No existe `07-TOBE/04-PAYMENTS.md`.

Esto **no constituye automáticamente un gap funcional**, porque el TO-BE Commerce ya trata
Payments dentro de su alcance y utiliza D-011 como autoridad.

Por tanto:

- Payments tiene cobertura TO-BE en Commerce.
- No debe crearse un documento independiente solo por simetría de nombres.
- Si posteriormente Contracts requiere separar el dominio de Payments, esa separación debe justificarse
  por límites de contrato, no por una convención documental.

---

## 5. Findings

### F-TOBE-001 — Overview desactualizado

**Severidad:** MEDIA — documental.

`00-TOBE-OVERVIEW.md` fue escrito durante Fase 6.0 y su sección de cobertura documental todavía
describe varios documentos posteriores como stubs/placeholders.

Actualmente existen documentos sustantivos para:

- Inventory;
- Cash;
- Messaging;
- Branding & Experience;
- Platform & Governance.

El Overview debe actualizarse para representar el estado físico real del repositorio.

**No implica modificar requisitos.**

---

### F-TOBE-002 — Estado de aprobación

**Severidad:** ALTA — trazabilidad.

Los documentos TO-BE permanecen DRAFT — NOT APPROVED.

Además:

- D-001/D-002/D-002-bis son OWNER-VERBATIM;
- D-003…D-018 son DERIVED / RECONSTRUCTED;
- implementation detail permanece OPEN.

Por lo tanto, TO-BE no debe presentarse como SPEC aprobada ni como autorización de implementación.

---

### F-TOBE-003 — Open Detail sigue siendo significativo

**Severidad:** INFORMATIVA / estructural.

Los documentos no intentan cerrar artificialmente:

- modelos físicos;
- estados exactos;
- permisos concretos;
- mecanismos de aislamiento;
- lifecycle detallado;
- APIs;
- infraestructura;
- tokens;
- CI provider;
- observability;
- AI activation;
- Messaging channels.

Esto es consistente con la gobernanza D-009 y con la separación TO-BE vs implementation.

---

### F-TOBE-004 — Conflictos abiertos

**Severidad:** MEDIA.

Continúan abiertos conflictos documentados como:

- CON-002 / CON-026 — arquitectura;
- CON-011 — Messaging detail;
- CON-012 — Branding / Design System;
- CON-018 — Authorization / role experience;
- CON-020/021/022 — Payments/Cash boundaries and Cash detail;
- CON-027 — CI/CD.

La existencia de estos conflictos no bloquea necesariamente la documentación conceptual, pero sí debe
ser considerada antes de cerrar contratos o invariantes afectados.

---

### F-TOBE-005 — No existe todavía la capa posterior

**Severidad:** ALTA — roadmap.

No deben producirse aún implementaciones basadas únicamente en estos documentos.

La cadena posterior prevista por D-009 continúa:

`TO-BE → CONTRACTS → INVARIANTS → TESTS → PLAN → IMPLEMENTATION`

Contracts, Invariants y Tests deben transformar las direcciones TO-BE en reglas verificables antes de
modificar código de forma sustantiva.

---

## 6. Duplicaciones y fronteras

No se detecta una duplicación funcional que requiera eliminar documentos.

Las fronteras actuales son razonables:

- Commerce contiene Payments, AR, AP y Fulfillment porque esos temas forman parte de su alcance
  documental actual.
- Cash tiene documento independiente porque posee lifecycle propio respaldado por D-013.
- Messaging tiene documento independiente porque DEC-001/D-003 lo convierten en interfaz comercial
  central.
- Branding & Experience tiene documento independiente porque D-004 define una dirección transversal.
- Platform & Governance reúne capacidades transversales sin convertirlas artificialmente en módulos
  funcionales aprobados.

No se recomienda dividir documentos únicamente por cantidad de dominios.

---

## 7. Decisiones todavía relevantes para Contracts

Antes de contratos, las siguientes decisiones requieren especial atención:

| Decisión | Área | Estado |
|---|---|---|
| D-001 | Business / tenancy | aprobado; implementation OPEN |
| D-002 | User / Membership | aprobado; implementation OPEN |
| D-002-bis | Customer / User | OWNER-VERBATIM; implementation OPEN |
| D-003 | Messaging / AI | DERIVED; implementation OPEN |
| D-004 | Branding | DERIVED; implementation OPEN |
| D-005 | Roles / permissions | DERIVED; implementation OPEN |
| D-006 | Authorization | DERIVED; implementation OPEN |
| D-007 | Order / Sale | DERIVED; implementation OPEN |
| D-008 | Sale lifecycle/effects | DERIVED; implementation OPEN |
| D-010 | Inventory integrity | OWNER-RULED; implementation GAP |
| D-011 | Payments | DERIVED; implementation OPEN |
| D-012 | AR | DERIVED; implementation OPEN |
| D-013 | Cash | DERIVED; implementation OPEN + pending ruling |
| D-014 | Inventory ownership | OWNER-RULED; implementation OPEN |
| D-015 | Purchases/AP | DERIVED; implementation OPEN |
| D-016 | Fulfillment | DERIVED; implementation OPEN |
| D-017 | Architecture | DERIVED; implementation OPEN |
| D-018 | CI/CD | DERIVED; implementation OPEN |

---

## 8. Evidence

| Finding | Evidence |
|---|---|
| 8 TO-BE documents exist | VERIFIED BY CODE / repository read |
| Payments has no independent TO-BE | VERIFIED BY CODE / repository path inventory |
| Commerce contains Payments | DOCUMENTED in Commerce TO-BE |
| Cash has independent TO-BE | VERIFIED BY CODE |
| Messaging has independent TO-BE | VERIFIED BY CODE |
| Branding has independent TO-BE | VERIFIED BY CODE |
| Platform & Governance has independent TO-BE | VERIFIED BY CODE |
| TO-BE documents remain DRAFT | VERIFIED BY CODE |
| AS-IS lacks CI/CD | DOCUMENTED + VERIFIED BY CODE in AS-IS Quality |
| D-017 modular monolith | DOCUMENTED — Decision Register |
| D-018 CI/CD direction | DOCUMENTED — Decision Register |

---

## 9. Verdict

### **PASS WITH FINDINGS**

The TO-BE layer has sufficient conceptual coverage to proceed to the next documentation layer,
subject to correcting the stale Overview coverage table.

The audit does **not** authorize implementation.

### Required before Contracts

1. Correct `00-TOBE-OVERVIEW.md` so its coverage table reflects the eight actual TO-BE documents.
2. Preserve all DRAFT / OPEN DETAIL / DERIVED provenance.
3. Do not create a separate Payments TO-BE unless a contract boundary later demonstrates the need.
4. Carry unresolved conflicts into the Contracts/Invariants traceability.
5. Do not convert OPEN DETAIL into implementation assumptions.

### Next layer

**CONTRACTS**.

Recommended first contract group:

`Identity/Tenancy → Authorization → Commerce → Inventory → Payments/Cash → Messaging`

Platform/CI contracts should follow where they are actually testable.

**No code implementation should begin from this audit alone.**
