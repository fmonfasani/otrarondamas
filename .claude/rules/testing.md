# Testing and CI evidence rules

- Inspect existing test conventions and package scripts before choosing commands.
- Reproduce a failure before changing code when feasible; record the exact command, environment assumptions, failing assertion, and relevant logs.
- Separate unit, integration, end-to-end, build, lint, and CI results. Passing one category does not imply the others pass.
- Do not claim tests passed unless the command completed and its exit status is known.
- Do not change assertions or fixtures solely to match current implementation; first establish the intended contract from authoritative evidence.
- Keep test data isolated and cleanup deterministic. Do not point automated tests at production or shared databases.
- Prefer focused tests for diagnosis, then run the broader suite required by the affected workflow.
- For flaky or environment-dependent failures, distinguish code regressions from setup, service availability, data isolation, and ordering problems.
- Report skipped tests, missing services, and unexecuted suites explicitly.