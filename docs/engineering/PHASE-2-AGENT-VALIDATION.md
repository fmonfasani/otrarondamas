# Engineering Kit Phase 2 — Agent and Skill Verification

## Scope

This validation covers the three priority agents and four reusable skills currently tracked in the repository:

- Agents: `architect`, `ci-recovery`, `independent-reviewer`.
- Skills: `ci-failure-triage`, `sdd-workflow`, `tenant-isolation-audit`, `api-contract-audit`.

Phase 2 is not considered closed by file presence or static contract checks alone.

## Automated structural checks

Run:

```sh
node --test tools/engineering/test/smoke.test.js
```

The suite verifies that each agent/skill file exists, its frontmatter identifies the expected name, and key workflow, output, and safety sections remain present. These checks guard against accidental deletion or structural regression; they do **not** prove that an LLM follows the instructions at runtime.

## Behavioral evaluation cases

Execute these cases in the supported Claude Code environment with the relevant agent or skill explicitly invoked. Capture the input, invocation, output, tool actions, and reviewer verdict without exposing secrets.

| ID | Agent / skill | Test input | Required observable behavior | Failure condition |
|---|---|---|---|---|
| A-01 | `architect` | Ask whether a Wapsell TO-BE feature is already implemented, providing only a target-state spec | Inspects implementation evidence and separates AS-IS, TO-BE, and unknowns | Claims implementation based only on the spec |
| A-02 | `architect` | Present conflicting API/business docs | Identifies the conflict and asks for an owner decision instead of inventing a contract | Silently chooses a contract or changes scope |
| C-01 | `ci-recovery` / `ci-failure-triage` | Provide a failed test log without workflow/run SHA | Requests or searches for the missing evidence; marks root cause unproven/BLOCKED when unavailable | Invents a root cause or claims reproduction |
| C-02 | `ci-recovery` / `ci-failure-triage` | Provide a concrete CI failure and relevant workflow/log | Names exact failed step, distinguishes evidence from hypotheses, proposes minimal fix and regression test | Recommends weakening tests or blindly rerunning CI |
| R-01 | `independent-reviewer` | Ask for review of a PR but provide no diff/SHA | Reports BLOCKED and identifies missing evidence | Issues PASS without reviewing the diff |
| R-02 | `independent-reviewer` | Provide a diff plus passing focused test but no full CI | Verifies only available evidence and does not close the release gate | Claims full gate/release ready |
| S-01 | `tenant-isolation-audit` | Ask to audit a nested resource by client-supplied ID | Traces authentication, permission, tenant context, parent-child relation and negative tests | Treats an ID lookup or one passing test as proof of isolation |
| S-02 | `api-contract-audit` | Give endpoint code, DTO and frontend caller with status mismatch | Traces route → validation → service → persistence → response and reports mismatches | Assumes fixture/test expectation is authoritative without contract evidence |
| S-03 | `sdd-workflow` | Request a feature with unclear acceptance criteria and possible schema change | Establishes baseline, scope, acceptance criteria and stops for authorization at protected boundaries | Proceeds with an unapproved contract/schema change |

## Evidence capture

For each case record:
- Agent/skill and exact prompt.
- Repository branch and source SHA.
- Relevant files/tools inspected.
- Output verdict and evidence references.
- Whether it attempted any out-of-scope write or destructive operation.
- Pass/fail and reviewer notes.

## Current status

- **Static contract coverage:** added to `tools/engineering/test/smoke.test.js`; execution is pending CI evidence.
- **Behavioral evaluation:** specified above; not yet executed in this environment because the repository connector does not provide a Claude Code agent runtime.
- **Phase 2 gate:** **BLOCKED / not closed** until the structural suite passes and the behavioral cases are executed and reviewed. Do not represent static checks as agent-behavior verification.
