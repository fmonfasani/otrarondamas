# Membership Revocation — Invariants v0.1

**Status:** PROPOSED — PENDING REVIEW/GATE

1. Business is the tenant boundary.
2. Membership is User ↔ Business context.
3. BusinessContext is tenant authority.
4. JWT empresaId does not override BusinessContext.
5. Only Owner may suspend/reactivate Membership.
6. Target Membership must belong to actor Business.
7. Cross-Business mutation is forbidden.
8. Suspension is ACTIVE → SUSPENDED.
9. Reactivation is SUSPENDED → ACTIVE.
10. No new Membership status.
11. Usuario.activo is not modified.
12. Membership remains contextual authority.
13. Successful transition persists before event publication.
14. Failed persistence produces no success event.
15. Event contains only approved fields.
16. Event businessId equals Membership businessId.
17. previousStatus equals persisted pre-transition state.
18. newStatus equals persisted post-transition state.
19. No event crosses Business boundaries.
20. No parallel identity, tenancy or authorization mechanism.
21. Existing BusinessContext remains reusable.
22. Existing Membership resolution remains compatible.
23. M4 consumes the event without owning Membership state.
24. Out-of-scope functionality is not implemented.
