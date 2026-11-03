# Wapsell — Platform and Governance Specification

**Version:** 0.2  
**Status:** DRAFT — NOT APPROVED  
**Reconciled:** 2026-11-03

> This document remains a specification placeholder. The Owner Rulings below establish conceptual direction only; they do not approve a technical specification or authorize implementation. Detailed platform, governance and operational contracts remain to be specified and, where required, approved.

## 1. Normative sources

Apply the approved precedence in ISS-08 / OR-B2-023:

**Owner Ruling → Decision Register → Canonical SPEC → TO-BE → Audit (evidence only) → Workshop / Preparation → Historical.**

The latest applicable Owner Ruling prevails over earlier conflicting text. Preserve historical artifacts as evidence; do not treat their existence as normative approval.

Relevant rulings:
- **OR-B2-023:** formally approves ISS-08 documentary precedence.
- **OR-B2-024:** approves Modular Monolith as an architectural direction. It does not approve NestJS, PostgreSQL, Docker, VPS, GraphQL, Kubernetes or another stack choice.
- **OR-B3-003:** SaaS Admin exists conceptually at platform level but is outside the operational MVP.
- **OR-B3-012:** Kubernetes and GraphQL are neither approved nor prohibited; their adoption remains an open technical decision.
- **OR-B3-013:** G001–G105 are a secondary functional source and do not override Owner Rulings or the approved precedence.
- **OR-B3-014:** MFA/2FA is mandatory for Owner and Admin roles in the MVP security direction. Enrollment, recovery and enforcement details remain open.

The authoritative decision text is in `03-DECISIONS/22-OR-B3-OWNER-DECISIONS-2026-10-03.md` and the corresponding entries in `03-DECISIONS/00-DECISION-REGISTER.md`.

## 2. Scope and boundaries

This specification is intended to cover platform lifecycle and governance, platform-level administration, auditability, notifications, reporting, security, observability and operational governance.

Current approved conceptual boundaries:
- SaaS Admin is outside the operational MVP; no operational SaaS Admin feature or permission model is approved by OR-B3-003.
- Modular Monolith is the approved architectural direction. Concrete stack and infrastructure selections remain separate technical decisions.
- MFA/2FA is mandatory for Owner and Admin roles in the MVP security direction.
- G001–G105 may inform functional discovery but are not normative decision authority.

## 3. Open specification work

The following technical and functional details are not defined by the rulings above and must not be inferred:
- Platform administration capabilities, actors, permissions and lifecycle beyond the SaaS Admin scope boundary.
- Audit event taxonomy, required events, retention, access and tamper-resistance.
- Notification channels, templates, delivery guarantees, retries and preferences.
- Reporting definitions, metrics, access scope and calculation rules.
- Security controls beyond the approved conceptual MFA direction, including enrollment, recovery, session policy, enforcement and evidence.
- Observability signals, service-level objectives, alerting and operational ownership.
- Concrete stack, deployment topology, infrastructure and CI/CD design.
- Governance workflow, approval evidence, versioning and change control.

Each area requires a specialized specification or an explicit decision where the missing detail is an Owner decision. No implementation detail is approved by this placeholder.

## 4. Approval and implementation gates

**Technical Specification: NOT APPROVED.**

**Implementation authorization:** not granted by this document. Where an applicable Owner Ruling requires `specification → Owner approval → implementation`, that sequence remains mandatory. A conceptual Owner Ruling, draft document, audit, roadmap or existing code does not waive the gate.

## 5. Reconciliation notes

This version corrects historical statements that no rulings existed for SaaS Admin, MFA/2FA, architectural direction or governance-source authority. It does not silently close unrelated open decisions and does not convert this draft into an approved specification.
