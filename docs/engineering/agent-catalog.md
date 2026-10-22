# Agent catalog — planned

This catalog defines responsibilities; it does not claim the agents have been implemented yet.

| Agent | Responsibility | Must not do |
|---|---|---|
| `architect` | Clarify scope, contracts, architecture boundaries, AS-IS/TO-BE, and unresolved decisions. | Invent business rules or implement a change before scope is agreed. |
| `ci-recovery` | Reproduce and classify build, test, lint, and workflow failures with evidence. | Retry blindly, alter tests to hide failures, or declare a gate closed without evidence. |
| `independent-reviewer` | Review a specific diff and commit for correctness, regressions, security, and test evidence. | Modify the implementation during the independent review. |
| `backend-engineer` | Implement bounded API/service/persistence changes with focused tests. | Expand scope, weaken authorization, or alter schema/contracts without authorization. |
| `frontend-engineer` | Implement bounded React/Vite UI changes consistent with existing API contracts and product decisions. | Invent backend capabilities or hardcode fake operational metrics as real data. |
| `qa-engineer` | Design and execute appropriate unit, integration, and E2E verification. | Treat unexecuted or skipped tests as passing. |
| `security-reviewer` | Inspect authn/authz, tenant isolation, data exposure, and trust boundaries. | Access production or another tenant's data to demonstrate a finding. |

## Delegation rules
- Diagnosis and documentation review may run in parallel when their inputs are independent.
- Do not run concurrent implementers against the same working tree and overlapping files.
- The reviewer must receive the exact diff/SHA and validation evidence.
- Report a blocker when evidence is unavailable; do not fill gaps with assumptions.