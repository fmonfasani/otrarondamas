# WAPSELL — Messaging M4 — Realtime Invariants v0.1

**Status:** APPROVED — INVARIANT BASELINE

1. Business is the tenant boundary.
2. BusinessContext is the tenant authority.
3. JWT identity authenticates the actor but does not override BusinessContext.
4. Client-supplied Business IDs never establish tenant authority.
5. A socket without valid authentication cannot access Messaging rooms.
6. A conversation room can only be joined after server-side authorization.
7. Cross-Business conversations are never subscribable.
8. Deleted conversations are not subscribable.
9. Owner global read visibility applies only within the current Business.
10. Non-Owner protected conversation access requires active participation.
11. Membership revocation removes protected realtime access.
12. Room membership never replaces domain authorization.
13. Existing Messaging Services remain domain authority.
14. Socket.IO does not become a second persistence layer.
15. Message mutation is not duplicated inside the Gateway.
16. Persistence succeeds before the corresponding domain event is emitted.
17. Emit failure cannot invalidate an already committed domain operation.
18. HTTP remains the recovery path for authoritative state.
19. Read receipts reuse the existing persistence and authorization rules.
20. A hidden read receipt is never emitted or exposed when the actor disabled confirmations.
21. Realtime events never disclose data outside the authorized Business/conversation.
22. Existing M1–M3 and Read Receipts contracts remain compatible.
23. M4 does not introduce a parallel tenancy, identity or authorization mechanism.
24. No schema change is accepted unless a new verified dependency demonstrates it is necessary.

25. Membership revocation is propagated from the Membership domain service to the realtime Gateway through a domain event.
26. A revoked/inactive Membership cannot continue receiving protected conversation events after revocation handling completes.
