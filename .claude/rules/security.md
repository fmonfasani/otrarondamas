# Security and tenant-isolation rules

- Treat authentication, authorization, company/business scoping, and tenant isolation as separate checks.
- Never infer authorization from a role label alone; inspect the actual guards, permission checks, and service-level scoping.
- Trace tenant context from the authenticated principal through controller, service, ORM query, and related records.
- For nested resources, verify both the parent and child belong to the active authorized tenant.
- Do not trust client-supplied tenant IDs or business identifiers without server-side authorization.
- Never log tokens, passwords, secrets, sensitive personal data, or full credential-bearing headers.
- Do not bypass, weaken, or delete security tests to obtain a green build.
- When a possible isolation issue is found, provide a minimal reproduction and evidence; do not probe production or another tenant's live data.
- Treat security findings as unverified until supported by code paths, tests, logs, or reproducible behavior.