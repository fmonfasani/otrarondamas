---
name: api-contract-audit
description: Trace and audit an API contract across routes, controllers, DTO validation, services, persistence, responses, and tests. Use for endpoint changes, unexpected HTTP statuses, frontend/backend mismatches, or unclear business behavior.
---

# API Contract Audit

## Goal
Establish the observable contract of an API endpoint and find discrepancies among implementation, tests, clients, and authoritative requirements.

## Procedure
1. Establish branch, SHA, working-tree status, existing changes, and the exact endpoint or behavior under review.
2. Locate route registration, controller/handler, request DTO and validation configuration, guards/interceptors, service logic, persistence operations, response serialization, and callers.
3. Capture the request shape, required/optional fields, auth/permission requirements, tenant context, status codes, response schema, and documented error cases.
4. Trace a request through the full path. For an unexpected status, identify the first layer that rejects or transforms the request; do not stop at the assertion alone.
5. Compare sources in this order where available: explicit owner-approved decision/contract, canonical specification, verified existing behavior and tests, then implementation details. If sources conflict or the canonical source is absent, report the conflict instead of guessing.
6. Inspect frontend callers and fixtures for drift. Do not assume an old fixture is correct solely because it is used by multiple tests.
7. Recommend focused contract tests for success, validation failure, authorization failure, tenant mismatch, missing relations, and boundary cases as appropriate.
8. Keep diagnosis read-only unless implementation is explicitly authorized. Do not change public contracts, business rules, schema, or fixtures merely to silence a failure.

## Required report
- Endpoint/method and relevant auth/tenant prerequisites.
- Request/response contract with code evidence.
- Call chain: route/controller → DTO/validation → service → persistence → response.
- Contract mismatches and conflicting sources.
- Root cause or explicitly labeled hypotheses.
- Minimal remediation and regression tests.
- Commands and evidence executed; blockers and unchecked paths.

A test expectation is evidence of intended behavior only when supported by the contract or verified decision; it is not automatically the source of truth.