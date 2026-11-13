# Wapsell — Tax & Fiscal Compliance Specification

**Document ID:** WPS-SPEC-TAX-001  
**Version:** 0.1  
**Status:** DRAFT — FOR OWNER REVIEW  
**Date:** 2026-11-13  
**Normative parent:** Wapsell General Specification v0.5 (APPROVED — OR-B4, 2026-11-10)  
**Related specialized SPEC:** WPS-SPEC-FIN-001 — Accounting, Finance, Controlling & Valuation

> This document defines the proposed long-term Tax & Fiscal Compliance domain. It is a design specification only: it does not add functionality to the MVP, authorize implementation, establish tax treatment, or replace advice from qualified tax professionals or the relevant authorities.

---

## 0. Document control, authority and terminology

### 0.1 Purpose

Define a country-extensible tax and fiscal compliance capability that automates as much repetitive tax-administration work as legally and technically possible for businesses using Wapsell.

The product objective is to move routine work currently performed manually by accounting/tax offices into governed software workflows: collecting and reconciling source data, calculating tax positions under approved rules, preparing forms and supporting schedules, managing due dates, preparing payment instructions, submitting through official channels when available, retrieving acknowledgements and retaining evidence.

Where legislation or an authority requires a licensed professional, taxpayer, legal representative or other authorized person to review, certify, sign or submit, Wapsell must support that control. The intended reduction is in operational preparation and data-entry effort; the SPEC does not assume that every professional obligation can legally be delegated to software.

### 0.2 Authority and precedence

The approved General SPEC v0.5 remains the normative parent. This specialized SPEC has **DRAFT** authority only.

Precedence remains:

`OWNER RULING > DECISION REGISTER > GENERAL CANONICAL SPEC > SPECIALIZED SPEC > TO-BE > AS-IS`

This document:
- does not change the approved MVP or its delivery gates;
- does not approve any tax treatment, filing position or legal interpretation;
- does not authorize ARCA or other government integrations to be implemented now;
- does not authorize storing taxpayer credentials outside an approved security design;
- does not claim that every tax procedure is available through an API;
- does not certify compliance with any country's tax law.

### 0.3 Relationship to financial domains

Tax & Fiscal Compliance is an independent bounded domain. It consumes governed data; it does not own or replace:
- **Commerce / Operations:** sales, orders, returns, inventory and customer/supplier activity.
- **Finance:** cash, banks, collections, disbursements, settlements and liquidity.
- **Accounting:** chart of accounts, journal entries, general ledger, periods and accounting policies.
- **Controlling:** management costs, budgets, allocations and profitability.
- **Reporting & Valuation:** financial statements, management reporting and business valuation.

Accounting and tax are related but are not interchangeable. Accounting profit is not automatically taxable income; accounting classifications do not by themselves determine tax treatment. Tax calculations must apply jurisdiction- and taxpayer-specific rules, effective dates and approved tax positions.

### 0.4 Status vocabulary

- **APPROVED:** explicitly approved by the Owner with traceable authority.
- **PROPOSED:** recommendation awaiting Owner decision.
- **OPEN:** policy, scope or legal interpretation not determined.
- **FUTURE:** intentionally outside the current MVP and planned for a later phase.
- **BLOCKED BY EXTERNAL AUTHORITY:** dependent on a government service, enrollment, credential, authorization or procedure outside Wapsell's control.

---

## 1. Product vision and outcomes

### 1.1 Product vision

Wapsell should become the operational platform that prepares and coordinates a business's routine fiscal-compliance work using its own commercial, financial and accounting records.

The desired user experience is not simply a tax calculator. It is an end-to-end compliance workspace that can:
1. identify applicable obligations for a registered taxpayer;
2. collect and reconcile the data needed for each obligation;
3. calculate or import the relevant tax bases and amounts under a versioned rule set;
4. explain the calculation and identify missing or inconsistent evidence;
5. prepare forms, returns, supporting schedules and payment instructions;
6. route items for taxpayer or professional review, certification, signature or approval when required;
7. submit through an official integration where one is supported and authorized, or guide a controlled manual submission where it is not;
8. retrieve and retain filing receipts, acknowledgements, payment evidence and authority responses;
9. track the obligation through accepted, rejected, paid, amended or otherwise resolved states.

### 1.2 Target outcomes

- Reduce repetitive data entry, reconciliation and document preparation.
- Reduce missed filing and payment deadlines through obligation calendars and reminders.
- Reuse verified operational and accounting data rather than repeatedly requesting the same information.
- Make every tax calculation and submission explainable and auditable.
- Identify exceptions early and route them to the correct authorized person.
- Support multiple countries through jurisdiction-specific packs without embedding one country's tax logic in the global core.
- Allow accounting firms and authorized professionals to review and manage client workspaces, subject to explicit access grants.
- Preserve the taxpayer's control over authorizations, submissions and legally binding actions.

### 1.3 Explicit non-goal

The product must not promise that every company can dispense with an accountant, tax adviser or legally required representative. The product goal is to automate operational preparation and routine administration to the maximum lawful extent, while preserving mandatory professional judgment, certification, signature, representation and review.

---

## 2. Delivery sequencing and dependency gates

### 2.1 Strategic sequence

Tax & Fiscal Compliance is a later-stage capability, not part of the current MVP.

The proposed dependency sequence is:

1. **Operational source integrity:** reliable sales, returns, discounts, payments, customer/supplier identities and transaction timestamps.
2. **Finance foundation:** reliable cash, bank, collection, disbursement and settlement records.
3. **Accounting foundation:** chart of accounts, double-entry ledger, tax-relevant accounts, posting rules, periods and reconciliations.
4. **Controlling and Reporting:** management views and reconciled financial reports, where useful to tax preparation.
5. **Tax & Fiscal Compliance foundation:** taxpayer profiles, jurisdiction packs, tax calendars, evidence management and calculation/preparation workflows.
6. **Official authority integrations:** ARCA first, subject to official service availability, enrollment and authorization; other jurisdictions later.
7. **Advanced automation:** broader filing coverage, amendments, notices, reconciliation, multi-entity and professional-practice workflows.

This sequence is a dependency proposal, not an approved delivery schedule. The Owner must approve the phase plan separately.

### 2.2 Readiness gates before tax implementation

A tax workflow must not be enabled for a taxpayer until its required source data and controls are demonstrably available. Readiness checks should include:
- taxpayer/legal-entity identity and jurisdiction are established;
- required operational and accounting source feeds are mapped;
- relevant periods can be closed or frozen for calculation;
- source completeness and reconciliation exceptions are visible;
- tax rules and form versions have an identified authoritative source and effective dates;
- authorization and credential-handling design has passed security review;
- human review and signature requirements are known for the specific procedure.

If a gate is not met, Wapsell may provide an estimate or preparation draft only when clearly labeled as incomplete and not ready for filing.

---

## 3. Domain boundaries and core capabilities

### 3.1 Taxpayer & Registration Profile

Maintain a jurisdiction-specific taxpayer profile, linked to the relevant legal entity and Business.

Candidate data:
- legal name and registered identifiers;
- country, tax jurisdiction and applicable subnational jurisdictions;
- tax registrations and regimes;
- registered activities and tax categories;
- fiscal address and relevant establishment/branch data;
- tax-period frequency and applicable calendars;
- status and effective dates of registrations;
- authorized representatives and professional relationships;
- authority-specific service enrollments and permissions, represented without exposing secret credentials in ordinary business records.

Sensitive taxpayer identifiers and credentials require encryption, access minimization, masking and explicit retention policies.

A Business is not necessarily a legal entity or taxpayer. The model must support a Business being associated with one or more legal entities/taxpayers in future designs, without assuming a permanent one-to-one relationship.

### 3.2 Tax Obligation Management

Maintain an obligation register for each taxpayer and jurisdiction.

Each obligation should identify:
- authority and jurisdiction;
- tax type or procedure;
- applicable taxpayer and legal entity;
- reporting period and due date;
- filing frequency and recurrence rule;
- source-data requirements;
- calculation/rule-set version;
- responsible role and reviewer;
- current workflow status;
- filing, payment and acknowledgement references;
- evidence and audit history.

The obligation calendar should support configurable reminders, escalation, holidays and authority-specific deadline changes. Published due dates must be sourced and versioned; the system must not silently infer a statutory deadline from a generic calendar.

### 3.3 Tax Calculation & Determination

Provide a controlled calculation engine driven by jurisdiction-specific, versioned tax rules.

Requirements:
- separate tax base, rate, exemptions, deductions, credits, withholdings, adjustments, surcharges and rounding;
- support effective dates and reporting periods;
- preserve the rule version and source used for every calculation;
- distinguish source facts from derived values and manual adjustments;
- record who entered, reviewed or approved an adjustment and why;
- explain calculation steps and provide drill-down to source transactions;
- support recalculation without overwriting a previously submitted or approved result;
- distinguish estimates, draft calculations, reviewed calculations and final filed values;
- expose unresolved data gaps and assumptions.

No generic global tax formula is approved. Each country pack must define the tax types and calculation rules it actually supports, with professional/legal validation.

### 3.4 Return & Form Preparation

Prepare jurisdiction-specific forms, declarations and supporting schedules from validated source data.

Requirements:
- form schema and version must be explicit;
- map every populated field to its source or documented manual input;
- validate required fields, formats, totals and cross-form consistency;
- identify missing data, out-of-balance totals and unsupported cases;
- allow controlled manual corrections with reason and evidence;
- generate human-readable previews and machine-readable payloads when required;
- preserve an immutable snapshot of the version reviewed and submitted;
- distinguish preparation from legal certification, signature and submission.

A generated form is not evidence that the authority accepted it.

### 3.5 Filing & Authority Interaction

Where an official, documented and authorized API or web service exists, Wapsell may integrate with it through a jurisdiction adapter.

The adapter must:
- use official endpoints and supported authentication mechanisms;
- respect taxpayer enrollment, service authorization, rate limits and technical requirements;
- validate requests before transmission;
- use idempotency/correlation controls where supported;
- record request metadata and authority response without exposing secrets;
- handle timeouts and uncertain outcomes safely, avoiding duplicate submissions;
- distinguish transmitted, received, accepted, rejected, pending and unknown outcomes;
- retrieve official acknowledgements and filing identifiers where available;
- preserve evidence of the exact submitted payload or a secure, integrity-protected representation.

If no suitable official API exists, Wapsell must provide a guided manual workflow with downloadable/exportable documents and a place to record the official receipt. Browser automation or robotic process automation must not bypass access controls, CAPTCHAs, terms, required human actions or legal signature requirements.

### 3.6 Tax Payment Coordination

Where officially supported and legally authorized, the system may prepare payment instructions or integrate with approved payment rails.

Requirements:
- show tax authority, taxpayer, obligation, period, amount, currency and due date;
- distinguish tax amount, interest, penalties, fees and adjustments;
- require explicit approval before initiating a payment;
- route execution through Finance or an authorized payment provider rather than creating a competing cash ledger;
- reconcile payment status and authority acknowledgement;
- never mark an obligation paid solely because a payment instruction was generated;
- support manual evidence of payment where no API exists.

Tax payment execution is subject to separate authorization, payment-provider capabilities and applicable law. This SPEC does not authorize movement of funds.

### 3.7 Notices, Cases & Tax Correspondence

Future capability to register authority notices, requests for information, assessments, audits, objections, appeals and other correspondence.

Each case should capture:
- issuing authority and case/reference number;
- notice date, receipt date and response deadline;
- affected tax type and period;
- requested documents or action;
- assigned taxpayer/professional roles;
- status, communications and evidence;
- response history and outcome.

The system may organize information and deadlines, but must not autonomously provide legal representation, submit an appeal or make a legal admission without the required authorized human decision.

### 3.8 Tax Evidence & Document Repository

Maintain evidence linked to taxpayer, obligation, period, calculation and filing:
- invoices and credit/debit notes;
- receipts and payment proofs;
- bank/payment-provider statements;
- accounting extracts and reconciliations;
- withholding certificates and third-party statements;
- submitted forms, authority acknowledgements and notices;
- reviewer approvals and signature evidence.

Evidence must have source, upload/import time, owner, integrity metadata, access policy and retention classification. Corrections must preserve history.

### 3.9 Professional & Accounting-Firm Workspace

Proposed capability for accountants, tax advisers and accounting firms to manage multiple client taxpayers through explicit delegated access.

Requirements:
- taxpayer-controlled invitation and revocation;
- firm, professional and individual user identities;
- granular access by taxpayer, legal entity, obligation and action;
- review queues and exception lists;
- preparer/reviewer separation where configured;
- traceable comments, approvals and requests for information;
- no implicit cross-tenant access based on a professional's email domain or firm membership.

This is a proposed product opportunity, not an approved MVP feature or a decision to build a full practice-management system.

---

## 4. Argentina country pack — ARCA

### 4.1 Initial jurisdiction

Argentina is the proposed first country pack. The current federal tax authority is ARCA (Agencia de Recaudación y Control Aduanero), successor to AFIP.

The country pack must be based on current official documentation and the actual services enabled for each taxpayer. Availability, technical protocols, enrollment, authorization and legal requirements must be verified per service before implementation.

### 4.2 Candidate capability areas

Potential integration areas to investigate and support progressively:
- electronic invoicing and authorization of invoices through official web services, where applicable;
- invoice/receipt numbering, authorization codes and expiry metadata;
- consultation of taxpayer registration and tax status where an official service and permission exist;
- tax-return data preparation and filing for procedures exposed through official services;
- tax payment instructions, payment references and reconciliation where supported;
- withholding/perception information and certificates where accessible;
- official notices, acknowledgements and filing status where an authorized service exists.

This list is a discovery scope, not a claim that every procedure has an API or that Wapsell can access it for every taxpayer.

### 4.3 ARCA service inventory

Before each integration, maintain a verified service record:
- official service name and purpose;
- official documentation URL and version/date;
- environment (testing/production);
- protocol and endpoint;
- authentication and authorization model;
- taxpayer enrollment prerequisites;
- required certificate or credential type;
- available operations and data scope;
- rate limits and operational constraints;
- response/error catalogue;
- legal or professional signature requirement;
- evidence and acknowledgement behavior;
- test procedure and certification requirements, if any;
- last verification date and responsible owner.

No endpoint, API capability, credential requirement or filing automation must be assumed from an unofficial tutorial or a third-party library alone.

### 4.4 ARCA-specific human approval gates

For every procedure, determine whether the action may be:
- calculated automatically;
- prepared automatically;
- reviewed by the taxpayer;
- reviewed/certified/signed by a registered professional;
- submitted by the taxpayer or authorized representative;
- submitted by an authorized software integration;
- completed only through an official portal or another prescribed channel.

Wapsell must enforce the applicable gate. It must not simulate a professional's identity, signature or authorization.

### 4.5 Argentina-specific OPEN items

- Which taxpayer regimes and legal forms are in the first ARCA release?
- Which federal procedures are in scope first: invoicing, VAT, income tax, withholding/perception regimes, other declarations or payment workflows?
- Which provincial and municipal obligations are included, and in what order?
- How are gross-receipts taxes (Ingresos Brutos), local registrations and multi-jurisdiction regimes handled?
- Which procedures require a licensed accountant's certification or signature?
- Which official services can be called directly, and which require portal-based/manual interaction?
- What are the enrollment, certificate custody and delegated authorization policies?
- What retention periods and evidentiary requirements apply?

These questions require current official-source research and Argentine tax/legal professional review before the relevant feature is approved.

---

## 5. Internationalization — Country Tax Packs

### 5.1 Global core and local adapters

The global Tax domain should provide reusable workflow primitives:
- taxpayer profiles;
- obligation calendar;
- period and status management;
- evidence repository;
- calculation orchestration;
- form preparation;
- review and approval workflow;
- submission orchestration;
- payment coordination;
- audit and reporting.

A Country Tax Pack provides the jurisdiction-specific implementation:
- tax types and regimes;
- taxpayer classifications;
- filing calendars and deadline rules;
- tax calculation rules and effective dates;
- form definitions and validations;
- authority service adapters;
- authentication/authorization requirements;
- payment mechanisms;
- retention and evidence rules;
- language, currency and locale conventions.

Country packs must be versioned independently. Updating one country's tax rules must not silently change another country's behavior.

### 5.2 Future jurisdictions

Potential future packs may include Brazil, Mexico, Spain, United States and other markets, but no launch order or coverage is approved by this draft. Each jurisdiction has federal and potentially state/provincial/municipal authorities, different taxpayer regimes and different electronic-filing requirements. A country label alone is not enough to determine obligations.

### 5.3 Rule lifecycle

Every tax rule or form definition must include:
- jurisdiction and tax type;
- legal/official source reference;
- publication and effective dates;
- applicable periods;
- version and supersession relationship;
- calculation and validation tests;
- reviewer/approval record;
- affected forms and workflows.

Expired rules must remain available to reproduce historical calculations and filings.

---

## 6. Data lineage and integration contracts

### 6.1 Source-to-tax lineage

Every tax amount must be traceable to one or more of:
- operational transactions;
- Finance events and settlements;
- posted Accounting entries;
- external statements or certificates;
- manually supplied data with source and reason;
- a versioned tax rule or calculation.

The system must distinguish:
- transaction date;
- tax point / taxable event date where defined by the jurisdiction;
- accounting posting date;
- payment date;
- filing period;
- filing/submission timestamp.

These dates must not be conflated.

### 6.2 Reconciliation

The domain must support reconciliation between:
- sales and issued invoices;
- invoices and tax books/records where applicable;
- tax calculations and accounting tax accounts;
- withheld/perceived amounts and certificates;
- declared liabilities and payment records;
- submitted returns and authority acknowledgements.

Differences must create visible exceptions; the system must not silently force balances to match.

### 6.3 External data and completeness

Businesses may have transactions outside Wapsell. The system must support authorized imports and manual adjustments with evidence. If coverage is incomplete, calculations and draft returns must show the limitation and must not be represented as complete or filing-ready.

### 6.4 Event and API contracts

Tax consumes stable, versioned contracts from source domains. It must not directly mutate Commerce, Finance or Accounting source records. Corrections are made in the owning domain or through a governed tax adjustment with explicit lineage.

---

## 7. Workflow lifecycle and controls

### 7.1 Generic obligation lifecycle

A proposed generic lifecycle is:

`OPEN → DATA_COLLECTION → RECONCILIATION → CALCULATED → PREPARED → REVIEW_REQUIRED → APPROVED → SUBMISSION_PENDING → SUBMITTED → ACCEPTED`

Alternative terminal or exception states include:
- `REJECTED`;
- `PAYMENT_PENDING`;
- `PAID`;
- `AMENDMENT_REQUIRED`;
- `AMENDED`;
- `OVERDUE`;
- `CANCELLED`;
- `MANUAL_COMPLETION_RECORDED`;
- `AUTHORITY_STATUS_UNKNOWN`.

Not every procedure uses every state. State transitions must be defined per workflow and must preserve prior states and evidence.

### 7.2 Segregation of duties

Configurable controls should distinguish:
- preparer;
- reviewer;
- taxpayer approver;
- professional certifier/signer;
- submission operator;
- payment approver;
- auditor/read-only reviewer.

A single person may occupy multiple roles only where policy and law permit. High-risk actions should support dual control.

### 7.3 Human-in-the-loop requirements

Human action is mandatory whenever required by law, authority protocol, delegated authorization or approved risk policy. Examples include:
- confirming taxpayer identity or registration;
- approving manual tax adjustments;
- approving a return before filing;
- applying a legally required professional certification/signature;
- authorizing submission or payment;
- resolving disputed notices or legal interpretations.

Automation must never bypass these controls to maximize completion rates.

### 7.4 Failure handling

The system must handle:
- authority unavailable;
- expired or revoked credentials;
- taxpayer not enrolled in a service;
- validation rejection;
- timeout after a request may have been received;
- duplicate submission risk;
- changed forms or rules;
- missing source data;
- payment pending or failed;
- acknowledgement delayed or unavailable.

When the outcome is uncertain, the system must query/reconcile status where supported before retrying. It must not blindly resend a potentially accepted filing or payment.

---

## 8. Security, privacy and audit

- Strict Business and legal-entity isolation applies to all taxpayer, filing, credential and evidence data.
- Professional access must be explicit, scoped, revocable and auditable.
- Tax identifiers and credentials are sensitive data and require encryption at rest/in transit, masking, least privilege and access logging.
- Secrets, certificates and private keys must be managed through an approved secrets/key-management architecture; they must never appear in logs, exports or ordinary application records.
- Every calculation, adjustment, review, approval, signature reference, submission, response, payment status change and manual completion must be auditable.
- Submitted payloads and acknowledgements must be retained with integrity controls and access restrictions.
- Retention, deletion, legal hold and data-subject rights must be configured by jurisdiction and legal basis.
- Data exports must preserve taxpayer identity, period, currency, rule/form version and evidence references.
- Cross-tenant access tests are mandatory for all new entities, relations, APIs, jobs, exports and professional workspaces.

Exact encryption standards, retention schedules, credential architecture and permission codes remain OPEN for specialized Security and Technical Specifications.

---

## 9. Reporting and operational metrics

The Tax workspace should provide:
- obligations due, upcoming, overdue and completed;
- filing status by taxpayer, jurisdiction and period;
- estimated and finalized tax liabilities;
- payment status and outstanding balances;
- missing documents and reconciliation exceptions;
- rejected submissions and authority incidents;
- review queue and pending professional actions;
- audit history and evidence completeness.

Metrics may include on-time filing rate, on-time payment rate, preparation cycle time, exception rate, manual adjustment rate and authority integration success rate. Definitions and denominators must be explicit; metrics must not conceal obligations that were never registered.

---

## 10. Acceptance criteria for future implementation

The future implementation is acceptable only when applicable criteria are tested:

1. Taxpayer data and filings are isolated by Business and legal entity.
2. Every obligation is tied to a jurisdiction, taxpayer, tax type and reporting period.
3. Due dates and tax rules are versioned and traceable to authoritative sources.
4. Every calculated amount can be traced to source data, manual adjustments and rule versions.
5. Incomplete source coverage is disclosed and prevents an unsupported filing-ready status.
6. A prepared return is distinguishable from an approved, submitted and accepted return.
7. Legally required professional review, certification, signature or taxpayer approval cannot be bypassed.
8. Submission retries cannot create silent duplicate filings.
9. Authority responses and acknowledgements are retained and linked to the exact filing snapshot.
10. A payment instruction does not mark an obligation paid; confirmed payment evidence is required.
11. Tax payment records reconcile with Finance without creating a second cash ledger.
12. Tax calculations reconcile to Accounting tax accounts under the applicable mapping, with differences exposed.
13. Historical filings can be reproduced using their original source snapshot, rule version and form version.
14. Rule updates do not retroactively rewrite submitted periods.
15. Credential and certificate secrets are not exposed in logs, user-visible errors or exports.
16. Professional access is explicitly granted, limited, revocable and audited.
17. Authority outages and uncertain outcomes are handled without blind duplicate submissions.
18. Manual portal completion can be recorded with supporting evidence where no API exists.
19. Country-specific rules and adapters cannot leak into or alter another jurisdiction's calculations.
20. The UI clearly communicates whether a value is estimated, prepared, reviewed, approved, submitted, accepted or paid.

These are target criteria for future technical specifications and tests, not evidence that the capability currently exists.

---

## 11. Risks and constraints

| Risk | Consequence | Required control |
|---|---|---|
| Tax rules change frequently | Incorrect calculations or obsolete forms | Versioned rules, effective dates, official-source monitoring and review |
| APIs do not cover all procedures | Incomplete automation | Service inventory and guided manual fallback |
| Incorrect or incomplete source data | Incorrect returns or penalties | Reconciliation, completeness gates and explicit exceptions |
| Professional certification is legally required | Invalid filing if bypassed | Mandatory human approval/signature gate |
| Credential compromise | Unauthorized taxpayer actions | Secrets management, least privilege, encryption and audit |
| Duplicate filing after timeout | Duplicate obligations or legal exposure | Idempotency, status inquiry and uncertain-outcome workflow |
| Multiple jurisdictions apply | Missing or duplicated obligations | Jurisdiction-aware taxpayer profile and obligation registry |
| Misinterpreted tax/accounting differences | Incorrect tax base | Separate accounting and tax rules with reconciliations |
| Automation overstates legal certainty | User reliance and compliance exposure | Clear status, limitations, source references and professional review |

---

## 12. Open Owner decisions

| ID | Decision | Proposed direction | Status |
|---|---|---|---|
| TAX-OD-001 | Product timing | After operational, Finance, Accounting and Reporting foundations; outside MVP | PROPOSED |
| TAX-OD-002 | Initial country | Argentina / ARCA first | PROPOSED |
| TAX-OD-003 | First taxpayer segment | Select initial legal forms and taxpayer regimes before implementation | OPEN |
| TAX-OD-004 | First tax procedures | Prioritize after official ARCA service inventory and user research | OPEN |
| TAX-OD-005 | Professional role | Automate preparation; retain legally required review, certification and signature | PROPOSED |
| TAX-OD-006 | Filing authorization | Explicit taxpayer/delegate authorization and per-action approval policy | PROPOSED |
| TAX-OD-007 | Tax payments | Coordinate through Finance; require explicit payment authorization | PROPOSED |
| TAX-OD-008 | Accounting-firm workspace | Evaluate as a separate product capability | OPEN |
| TAX-OD-009 | Provincial/municipal coverage | Add only after federal scope and jurisdiction research | OPEN |
| TAX-OD-010 | International expansion | Country Tax Packs; sequence not yet selected | OPEN |
| TAX-OD-011 | Legal and professional governance | Establish review responsibility and jurisdiction-specific sign-off | OPEN |
| TAX-OD-012 | Credential custody | Select secure certificate/secret architecture before integration | OPEN |

No OPEN or PROPOSED item is silently resolved by this draft.

---

## 13. Required follow-up specifications

Before implementation, create or approve:
- Argentina / ARCA Country Tax Pack, with verified official service inventory.
- Taxpayer and tax-registration data model.
- Obligation calendar and deadline engine.
- Tax calculation and rule-versioning specification.
- Form and declaration preparation specification.
- Authority integration and credential-management architecture.
- Filing lifecycle, idempotency and acknowledgement specification.
- Tax payment coordination contract with Finance.
- Professional review, certification and delegated-access model.
- Security, privacy, retention and audit specification.
- Country-pack conformance and regression test suite.

Each tax procedure must have its own verified source, legal applicability, authorization model, technical integration evidence and acceptance tests before being marked supported.

---

## 14. Change history

| Version | Date | Status | Description |
|---|---|---|---|
| 0.1 | 2026-11-13 | DRAFT — FOR OWNER REVIEW | Initial long-term Tax & Fiscal Compliance domain specification; Argentina/ARCA proposed as first country pack; explicit separation from Accounting and Finance; no MVP expansion or implementation authorization. |

**Current status**

`DOCUMENT = DRAFT — FOR OWNER REVIEW`  
`GENERAL SPEC v0.5 = UNCHANGED`  
`FINANCIAL SPEC WPS-SPEC-FIN-001 = UNCHANGED`  
`MVP SCOPE = UNCHANGED`  
`IMPLEMENTATION AUTHORIZATION = NOT GRANTED BY THIS DOCUMENT`
