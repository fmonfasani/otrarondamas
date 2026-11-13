# Wapsell — Accounting, Finance, Controlling & Valuation Specification

**Document ID:** WPS-SPEC-FIN-001  
**Version:** 0.1  
**Status:** DRAFT — FOR OWNER REVIEW  
**Date:** 2026-11-13  
**Normative parent:** Wapsell General Specification v0.5 (APPROVED — OR-B4, 2026-11-10)  
**Proposed location:** `docs/WAPSELL-DOCUMENTATION/06-SPECIFICATIONS/CANONICAL/08-ACCOUNTING-FINANCE-CONTROLLING-AND-VALUATION-SPEC.md`

> This document defines the functional boundaries and long-term direction for Accounting, Finance, Controlling and Financial Reporting & Valuation. It does not approve implementation, replace an Owner Ruling, or change the MVP scope established by the General SPEC. Any unresolved policy is explicitly marked OPEN.

---

## 0. Document control and authority

### 0.1 Purpose

Define a modular, auditable and multi-currency financial foundation for Wapsell. The target is to let each Business understand its financial position and performance, while allowing Wapsell itself to measure the SaaS business independently. The design must support progressive maturity toward applicable IFRS/NIIF reporting, external audit and, if a company later chooses, preparation for capital-market requirements.

### 0.2 Authority

The approved General SPEC v0.5 remains the normative parent. This document is a specialized proposal and has **DRAFT** authority only.

Precedence remains:

`OWNER RULING > DECISION REGISTER > GENERAL CANONICAL SPEC > SPECIALIZED SPEC > TO-BE > AS-IS`

Nothing in this document:
- expands the approved MVP;
- approves a chart of accounts, accounting policy, tax treatment or legal interpretation;
- certifies IFRS/NIIF compliance or readiness to list securities;
- authorizes schema migrations, production cutovers or implementation outside OR-B4-001;
- treats existing code or database models as proof that a capability is complete.

### 0.3 Status vocabulary

- **APPROVED:** explicitly approved by the Owner with traceable authority.
- **PROPOSED:** recommendation awaiting Owner decision.
- **OPEN:** information or policy not yet determined.
- **FUTURE:** intentionally outside the current MVP.

### 0.4 Normative references

- `00-WAPSELL-SPEC-GENERAL.md`, v0.5, approved 2026-11-10.
- General SPEC §1.3: financial accounting and electronic tax invoicing remain OPEN / undetermined.
- General SPEC §10.2, §10.4–§10.9: Sales, Payments, Cash and Accounts Receivable conceptual boundaries.
- General SPEC §13: Modular Monolith is the approved architectural direction; implementation technology remains subject to specialized technical specifications.
- OR-B4-001: incremental implementation authorization subject to required controls and PR validation.

---

## 1. Product objective and outcomes

Wapsell will progressively provide financial capabilities to two distinct subjects:

1. **A customer Business:** financial operations, accounting records, management control, financial statements and an explainable estimate of that Business's economic value.
2. **Wapsell Platform as a SaaS company:** its own revenue, subscription metrics, costs, cash, accounting records, financial statements and SaaS valuation.

These subjects must never be conflated. Wapsell's corporate valuation is calculated from Wapsell's own corporate and SaaS data. A customer Business's private financial data must not be pooled into Wapsell's valuation or disclosed to other tenants. Platform-level aggregate analytics, if ever proposed, require explicit governance, lawful basis, minimization and anonymization; they are not authorized by this SPEC.

Target outcomes:
- Reconstruct the origin and accounting treatment of each material economic event.
- Keep operational transactions, financial management, accounting and management control as separate responsibilities.
- Support transactions in multiple currencies with reproducible conversion evidence.
- Produce consistent financial reports from governed data rather than ad hoc sums of sales and cash movements.
- Explain every valuation through its method, inputs, assumptions, exchange rates, date and data-quality limitations.
- Allow progressive adoption without forcing all advanced capabilities into the MVP.

## 2. Domain and module boundaries

The modules are independent bounded domains with explicit contracts. Independence does not require separate deployables; the approved architecture remains a Modular Monolith unless a later Architecture decision changes it.

### 2.1 Finance — Financial Operations & Treasury

**Responsibility:** manage liquidity and financial operations.

Candidate capabilities:
- Cash registers, cash sessions, cash movements, cash counts and closures.
- Bank and payment-provider accounts and balances.
- Collections, disbursements, transfers and settlement tracking.
- Cash positioning and liquidity forecasts.
- Operational receivables and payables, aging, due dates and collection status.
- Reconciliation between payment providers, banks, cash and operational transactions.
- Financing facilities, loans and interest schedules when included in scope.

Finance is not the General Ledger and must not independently invent accounting balances. Financial events that have accounting consequences are supplied to Accounting through governed events/contracts.

**Boundary:** Sales, Orders, Inventory and Payments remain operational source domains. Finance consumes their financial events; it does not become the owner of commercial transactions.

### 2.2 Accounting — Financial Accounting (FI)

**Responsibility:** maintain the official accounting record for an accounting entity and produce the accounting basis for financial statements.

Required conceptual capabilities:
- Chart of accounts (plan de cuentas), account classes and controlled account hierarchies.
- Journal entries with balanced debit and credit lines (double-entry bookkeeping).
- General journal and general ledger.
- Accounting periods, period opening/closing and controlled reopening.
- Accounting policies, posting rules and effective dates.
- Subledger reconciliation for customers, suppliers, cash, banks, inventory, fixed assets and taxes as applicable.
- Accruals, deferrals, provisions, depreciation and amortization when applicable.
- Foreign-currency transaction recognition, settlement differences and period-end remeasurement.
- Trial balance and traceable financial-statement mappings.
- Reversals and correcting entries; posted entries must not be silently overwritten or deleted.
- Audit trail, source-document references and evidence attachments.

Every posted journal entry must balance in its accounting currency. Draft, approved, posted, reversed and closed-period states must be distinguished. Exact state transitions and authorization matrix are OPEN for the technical specification.

Accounting owns the ledger and accounting policies. It does not own budgets, operational cash handling or valuation methodologies.

### 2.3 Controlling — Management Accounting (CO)

**Responsibility:** explain where costs and results arise and support planning and internal decisions.

Candidate capabilities:
- Cost centers and profit centers.
- Cost objects, projects, branches, channels and business units.
- Direct and indirect cost allocation rules.
- Product, customer, channel and segment profitability.
- Budgets, forecasts and actual-versus-budget analysis.
- Contribution margin, cost behavior and break-even analysis.
- Internal allocations and management dimensions.
- Versioned planning scenarios.

Controlling reports are management views. They must be reconcilable to Accounting where they use posted actuals, while preserving the distinction between statutory/financial accounting and internal management allocations.

### 2.4 Financial Reporting & Valuation

**Responsibility:** consume governed information from Accounting, Finance, Controlling and operational domains to produce reports, indicators, projections and business valuations.

This is a reporting/analytical capability, not a second ledger and not a source of truth for transactions.

Required reports, progressively:
- Balance sheet / statement of financial position.
- Income statement / statement of profit or loss.
- Cash flow statement.
- Trial balance and supporting schedules for authorized roles.
- Management dashboards and KPI reports.
- Business valuation and SaaS valuation views.
- Historical comparisons, forecasts and scenario analysis.

Valuation belongs **inside Reporting** for product navigation and user experience. It is not a separate accounting ledger or an independent transaction module. Its calculation engine must remain logically isolated, versioned and explainable.

### 2.5 Responsibility matrix

| Capability | Owning domain | Consumers |
|---|---|---|
| Sale, order, product, inventory movement | Commerce / Inventory | Finance, Accounting, Controlling, Reporting |
| Payment authorization and provider transaction | Payments | Finance, Accounting, Reporting |
| Cash session and liquidity position | Finance / Cash | Accounting, Reporting |
| Chart of accounts and journal posting | Accounting | Reporting, Controlling |
| Cost centers, allocations and budgets | Controlling | Reporting |
| Financial statements | Reporting, sourced from Accounting and Finance | Authorized Business users |
| Business valuation | Reporting & Valuation | Authorized Business users |
| Wapsell SaaS valuation | Wapsell's own Reporting context | Platform Owner / authorized finance roles |

---

## 3. Accounting entities and organizational structure

The conceptual model must distinguish:
- **Platform:** Wapsell as SaaS provider.
- **Business:** tenant and commercial business context.
- **Legal entity / accounting entity:** the legal organization whose books are maintained.
- **Branch / location:** operational or management dimension, not automatically a separate legal entity.
- **Group:** parent and subsidiaries for future consolidation.

A Business may map to one accounting entity in the initial design, but this is a proposed simplification, not a permanent identity equivalence. The model must not assume that one tenant always equals one legal entity.

**FUTURE:** multiple legal entities per Business, intercompany transactions, group consolidation, non-controlling interests and consolidated reporting.

**OPEN — OWNER:** whether multi-entity/group accounting is required for the first commercial release or only as a future capability.

## 4. Multi-currency policy

Multi-currency is a foundational design requirement, but the full accounting treatment can be delivered progressively.

### 4.1 Currency concepts

The model must distinguish:
1. **Transaction currency:** currency in which a sale, purchase, payment, invoice or other transaction is denominated.
2. **Functional currency:** currency of the primary economic environment in which an accounting entity operates, determined under the applicable accounting framework.
3. **Presentation currency:** currency in which financial statements are presented.
4. **Group/reporting currency:** currency used for group consolidation or platform-level reporting, when applicable.
5. **Price-list/catalog currency:** currency in which a particular catalog or price list is defined and displayed.

These currencies are related but are not interchangeable.

### 4.2 Catalog and price consistency

- A Business must configure a default catalog/price-list currency before publishing prices.
- A single price list must have one explicit currency; amounts from different currencies must not be mixed or displayed as if directly comparable.
- A Business may maintain additional price lists in other currencies only through an explicit configuration and conversion policy.
- Each product price must carry an explicit currency inherited from or validated against its price list.
- Orders and Sales must preserve the currency and price snapshot accepted at the time of the transaction.
- Changing the default currency must not silently rewrite historical prices, orders, sales, payments or accounting records.

**OPEN — OWNER:** whether MVP allows one currency per Business only, or one default currency plus explicitly configured additional price lists. The data model should avoid blocking either option.

### 4.3 Exchange-rate evidence

Every conversion that affects a financial or accounting result must retain:
- source and target currency;
- rate and quote convention;
- effective date/time;
- rate type/purpose (transaction, settlement, closing, average, valuation or other approved category);
- source/provider or manually authorized source;
- retrieval/approval timestamp;
- user or process that selected/approved it;
- rounding precision and conversion result.

Historical rates used in posted transactions must remain reproducible. A new exchange rate must not retroactively alter posted records.

### 4.4 Accounting treatment

Accounting must support the distinction between original transaction amount and functional-currency amount. Depending on applicable accounting policy, it must support initial recognition, settlement exchange differences and period-end remeasurement of monetary items. Translation to a presentation currency must be handled under the applicable policy.

The exact rate selection rules, treatment of exchange differences, rounding and inflation adjustments require Accounting Technical Specification and professional review. They are OPEN here.

### 4.5 Valuation currency

- The default valuation presentation currency is **USD**, as a proposed product requirement from this discussion.
- The user must be able to see the valuation date, USD conversion policy, rate source and rate applied.
- A valuation must be reproducible from a frozen snapshot of financial data, assumptions and exchange rates.
- Alternative reporting currencies may be considered later; USD does not replace the entity's functional currency or statutory accounting currency.

**OPEN — OWNER:** approve USD as the mandatory/default valuation display currency and decide whether users can select additional valuation currencies.

---

## 5. Financial source data and event integrity

Financial statements and valuations depend on complete source data. Wapsell must progressively capture or import:
- Sales, discounts, returns, refunds and taxes.
- Cost of goods sold and inventory valuation inputs.
- Purchases and supplier obligations when the relevant domain is enabled.
- Payments, fees, settlements, refunds and chargebacks.
- Cash and bank movements, transfers and reconciliations.
- Accounts receivable and payable events.
- Payroll, operating expenses, financing and capital contributions when in scope.
- Fixed assets and depreciation data when in scope.
- Subscription revenue, credits, refunds and SaaS operating costs for Wapsell itself.

Every material event should have a stable source identifier, Business/legal-entity context, event date, posting date when applicable, currency, amount, source domain, actor/system, status and idempotency/deduplication control.

A sale is not automatically equivalent to cash received. Revenue recognition, receivable creation, payment settlement, inventory cost recognition and cash movement are separate events governed by their respective policies.

External sales must be importable or manually registerable if a Business wants complete financial reports. Reports must disclose incomplete coverage where transactions may occur outside Wapsell.

---

## 6. Financial statements and reporting requirements

### 6.1 Statement of financial position (Balance Sheet)

Must present assets, liabilities and equity as of a date, with current/non-current classification where applicable. It must reconcile to the trial balance and disclose the accounting basis and reporting currency.

### 6.2 Statement of profit or loss (Income Statement)

Must present revenue, returns/discounts, cost of sales, gross profit, operating expenses, operating result, finance result, tax and net result as applicable. EBITDA may be shown as a management metric with a documented reconciliation; it must not be mislabeled as an IFRS-defined subtotal.

### 6.3 Statement of cash flows (Cash Flow)

Must distinguish operating, investing and financing cash flows under the selected accounting policy. Cash movements must reconcile to opening and closing cash/cash-equivalent balances. Transfers between own cash/bank accounts must not be counted as external inflows or outflows.

### 6.4 Management reports

Controlling and Reporting may add contribution margins, profitability by product/customer/channel, working capital, liquidity runway, budget variance and operational KPIs. Every metric must have a definition, owner, formula, currency basis, period basis and data lineage.

### 6.5 Reporting controls

- Reports must identify entity, Business, period, currency, accounting basis and generation timestamp.
- Closed-period reports must be reproducible.
- Any restatement must be identifiable and linked to the prior published version.
- Missing, estimated or imported data must be labeled.
- Users must be able to drill down from report totals to journal entries and source events, subject to permissions.

---

## 7. Controlling requirements

Controlling must support:
- configurable cost centers and profit centers;
- cost allocation dimensions and versioned allocation rules;
- budget and forecast versions;
- actual-versus-budget comparison;
- profitability by product, customer, channel, location and business unit;
- reconciliation of actual financial amounts to Accounting;
- explicit identification of allocations that are managerial rather than statutory accounting entries.

The initial list of dimensions and allocation methods is OPEN. No mandatory hierarchy or allocation formula is approved by this draft.

---

## 8. Valuation requirements

### 8.1 Two valuation subjects

**A. Customer Business valuation**

Uses only that Business's authorized financial, operational and supplemental data. It may include:
- adjusted net asset value;
- EBITDA or other earnings multiples where meaningful comparables exist;
- discounted cash flow (DCF);
- sector-specific methods where supported by evidence.

**B. Wapsell SaaS valuation**

Uses Wapsell's own corporate books and SaaS operating metrics, including:
- MRR and ARR definitions and cohort history;
- paying customers, active customers and customer concentration;
- churn, retention and net revenue retention;
- ARPA/ARPU;
- CAC, LTV and CAC payback, with documented calculation policies;
- recurring revenue quality and gross margin;
- hosting, support, sales, marketing, payroll and development costs;
- cash, debt, working capital and capital expenditure;
- forecast cash flows, growth assumptions and risk adjustments.

Customer tenant financial data must not be treated as Wapsell revenue or assets. Wapsell revenue includes only amounts contractually earned by Wapsell, such as subscriptions and other recognized platform services.

### 8.2 Valuation methods

The engine may calculate multiple methods rather than force a single universal formula:
- adjusted asset-based valuation;
- market multiples (e.g. EBITDA/revenue/ARR where suitable);
- income approach / DCF;
- SaaS-specific analysis using recurring revenue, retention, growth, margin and risk.

Method applicability depends on business type, stage, data completeness and available market evidence. A multiple must never be hardcoded as universally valid.

### 8.3 Output and explainability

Each valuation result must include:
- valuation subject and perimeter;
- valuation date and data cut-off;
- method(s) applied and why;
- enterprise value and equity value, when relevant, shown separately;
- low/base/high scenario or defensible range;
- assumptions and forecast version;
- exchange-rate policy and rate evidence;
- data sources and drill-down references;
- missing data, estimates and exclusions;
- sensitivity analysis for material assumptions;
- confidence/data-quality indicators;
- calculation engine and methodology version.

A valuation is an estimate, not an accounting balance, guaranteed sale price, investment recommendation or formal independent valuation opinion. A professional valuation may require a qualified independent valuator and market evidence not available inside Wapsell.

### 8.4 Valuation cadence

The system may refresh operational indicators continuously or near-real-time. A formal valuation must be tied to a defined valuation date and frozen inputs. A live dashboard may show an indicative estimate, clearly distinguished from a period-end or independently reviewed valuation.

---

## 9. Standards, jurisdiction and long-term readiness

The target is to support accounting policies aligned with the applicable version of IFRS/NIIF and local statutory requirements, selected per legal entity and jurisdiction.

Relevant standards may include, depending on facts and applicability:
- IAS 1 / NIC 1 — presentation of financial statements;
- IAS 7 / NIC 7 — statement of cash flows;
- IAS 16 / NIC 16 — property, plant and equipment;
- IAS 21 / NIC 21 — effects of changes in foreign exchange rates;
- IAS 29 / NIC 29 — hyperinflationary economies;
- IFRS 9 / NIIF 9 — financial instruments;
- IFRS 15 / NIIF 15 — revenue from contracts with customers;
- IFRS 16 / NIIF 16 — leases;
- IFRS 13 / NIIF 13 — fair value measurement.

This list is indicative, not an assertion that every standard applies to every Business. Standards and local rules change; the implementation must use maintained accounting-policy versions and professional review.

Long-term capital-markets readiness may also require:
- audited annual and interim financial statements;
- internal controls and segregation of duties;
- evidence retention and audit trails;
- related-party and shareholder records;
- corporate governance and disclosure controls;
- group consolidation and intercompany eliminations;
- regulatory reporting for the relevant market and jurisdiction.

**Important limitation:** software support for IFRS/NIIF does not itself establish compliance, audit opinion, eligibility to list, or compliance with CNV, SEC, exchange or other securities requirements. Those require jurisdiction-specific legal, accounting, audit and regulatory advice.

---

## 10. Security, auditability and data governance

- Every record is scoped to its Business and, where applicable, legal entity.
- Cross-tenant reads and writes must fail closed.
- Accounting and valuation permissions must be separate from ordinary sales permissions.
- Sensitive actions (posting, reversal, period close/reopen, rate override, policy change, valuation publication) require explicit permissions and audit records.
- Posted journal entries are immutable; corrections use reversals or adjusting entries.
- Audit records include actor, timestamp, action, reason, before/after reference and correlation to source event.
- Financial data must be retained according to configurable legal and contractual retention policies.
- Valuation snapshots must retain input references and methodology versions.
- Exports must preserve currency, dates, entity identity and audit metadata.

Exact retention periods, encryption requirements, permission codes, approval thresholds and segregation-of-duties matrix are OPEN for Security/Technical Specs and jurisdictional review.

---

## 11. Progressive delivery and MVP protection

This is a long-term target, not an instruction to include the complete financial suite in the current MVP.

### Foundation (design constraints to preserve now)
- Do not mix currencies without explicit currency codes and conversion evidence.
- Preserve original transaction currency and amount.
- Preserve source IDs and timestamps for financial events.
- Avoid irreversible edits to historical financial facts.
- Keep Business/tenant isolation and leave room for legal-entity identity.
- Keep operational cash/payment records distinct from accounting journal entries.
- Avoid hardcoding valuation assumptions into commerce or sales logic.

### Later capabilities (subject to prioritization and approval)
1. Finance/Treasury hardening: cash, bank, settlements, reconciliation and liquidity.
2. Accounting FI: chart of accounts, double-entry journals, periods and subledger integration.
3. Controlling CO: cost centers, budgets, allocations and profitability.
4. Financial Reporting: balance sheet, income statement and cash flow.
5. Valuation: Business and Wapsell SaaS valuation.
6. Advanced readiness: multi-entity consolidation, audit exports, jurisdictional reporting and capital-market controls.

The actual order may change after dependency analysis. No phase is approved for implementation solely because it appears in this document.

---

## 12. Acceptance criteria for the future solution

The future implementation is acceptable only when the applicable criteria are tested:

1. A Business cannot access another Business's financial, accounting or valuation data.
2. A posted journal entry always balances in its required accounting currency.
3. A posted entry cannot be silently edited or deleted.
4. Reversal and adjustment preserve the original entry and full lineage.
5. A transaction preserves original currency, amount, exchange rate and conversion evidence.
6. A historical report can be reproduced using its original data and policy versions.
7. Balance sheet, income statement and cash flow reconcile to the accounting records under the selected accounting basis.
8. Cash transfers between accounts do not inflate cash flow.
9. Operational sales, receivables, payments and cash are not double-counted as revenue or cash.
10. A valuation clearly separates enterprise value from equity value where applicable.
11. A valuation exposes assumptions, methods, date, FX rates, data coverage and sensitivity.
12. Wapsell SaaS valuation uses Wapsell's own recognized revenue and costs, not customer gross merchandise value or tenant funds.
13. Reports identify missing/external transactions and do not imply complete coverage when source data is incomplete.
14. Currency and accounting-policy changes do not rewrite historical posted records.
15. Permission and audit tests cover posting, reversal, close/reopen, exchange-rate override and valuation publication.

These are target acceptance criteria for future technical specifications and tests, not evidence that the capabilities currently exist.

---

## 13. Open decisions requiring Owner resolution

| ID | Decision | Proposed direction | Status |
|---|---|---|---|
| FIN-OD-001 | Naming and exact boundary between Finance, Accounting and Controlling | Separate domains as §2 | PROPOSED |
| FIN-OD-002 | Functional currency policy | Per accounting entity, determined under applicable framework | PROPOSED |
| FIN-OD-003 | Catalog currency | One currency per price list; decide whether multiple price lists are enabled in MVP | OPEN |
| FIN-OD-004 | Valuation presentation currency | USD default; decide whether additional currencies are selectable | PROPOSED |
| FIN-OD-005 | Accounting entities | One entity per Business initially, with future multi-entity support | OPEN |
| FIN-OD-006 | Applicable standards | IFRS/NIIF plus jurisdiction-specific statutory framework per entity | PROPOSED |
| FIN-OD-007 | Valuation refresh | Near-real-time indicative view plus frozen dated valuation snapshots | PROPOSED |
| FIN-OD-008 | Customer and Wapsell valuation availability | Customer Business valuation and separate Wapsell SaaS valuation | PROPOSED |
| FIN-OD-009 | Historical FX source and rate types | Governed source and purpose-specific rate policy | OPEN |
| FIN-OD-010 | Scope and timing | Preserve MVP; phase capabilities after dependency and gap analysis | PROPOSED |

No OPEN item is silently resolved by this draft.

---

## 14. Required follow-up specifications

Before implementation, create or update domain-specific documents:
- Finance / Treasury specialized SPEC.
- Accounting FI specialized SPEC.
- Controlling CO specialized SPEC.
- Financial Reporting & Valuation specialized SPEC.
- Multi-currency and exchange-rate policy.
- Security, audit and retention requirements.
- Technical architecture and contracts, including event-to-journal posting rules.

The Accounting SPEC must define the chart-of-accounts model, journal lifecycle, posting rules, accounting periods, subledger reconciliation and applicable accounting policies. The Finance SPEC must define cash/bank/settlement lifecycles and reconciliation. The Reporting SPEC must define formulas and statement mappings. The valuation specification must define methodologies, assumptions, data-quality thresholds and governance.

---

## 15. Change history

| Version | Date | Status | Description |
|---|---|---|---|
| 0.1 | 2026-11-13 | DRAFT — FOR OWNER REVIEW | Initial consolidation of the Owner discussion: independent Finance, Accounting and Controlling domains; valuation within Reporting; multi-currency; IFRS/NIIF-oriented long-term direction; protection of current MVP scope. |

**Current status**

`DOCUMENT = DRAFT — FOR OWNER REVIEW`  
`GENERAL SPEC v0.5 = UNCHANGED`  
`MVP SCOPE = UNCHANGED`  
`IMPLEMENTATION AUTHORIZATION = NOT GRANTED BY THIS DOCUMENT`
