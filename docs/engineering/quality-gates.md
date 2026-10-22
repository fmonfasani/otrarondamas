# Engineering quality gates

These are the intended criteria for the kit. They are not a claim that the current repository already satisfies them.

## G0 — Safe baseline
- Branch, HEAD, upstream, working-tree state, and existing diffs are recorded.
- Existing user changes are identified and protected.
- Scope and protected areas are explicit.

## G1 — Contract and scope
- Expected behavior is supported by an authoritative decision/specification or existing verified behavior.
- AS-IS and TO-BE are not conflated.
- Unresolved business, architecture, or schema decisions are surfaced before implementation.

## G2 — Implementation
- Changes stay within the agreed file and behavior scope.
- Security/tenant boundaries and compatibility implications are inspected.
- No unrelated refactor, dependency upgrade, or test weakening is introduced.

## G3 — Verification
- Relevant focused tests run with captured exit status.
- Build/lint and broader suites are run when applicable and feasible.
- Unavailable dependencies, skipped checks, and environment failures are explicitly reported.

## G4 — Independent review
- Reviewer inspects the final diff and a specific commit SHA.
- Review checks correctness, regression risk, security, tests, and documentation.
- Verdict is PASS, PASS WITH CONDITIONS, or FAIL with evidence.

## G5 — Delivery and closure
- Branch/PR/commit are identified accurately.
- CI status is checked on the exact proposed commit.
- A merged PR alone does not mean the release or transformation gate is complete.
- A gate is CLOSED only when all applicable criteria have verifiable evidence.