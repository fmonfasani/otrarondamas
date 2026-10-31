# P8E Quick Reference Card
## Emergency Response Guide (Keep Handy!)

**Date Created:** 2026-10-30  
**Version:** 1.0  
**Print this page and keep at desk!**

---

## INCIDENT RESPONSE DECISION TREE

```
ALERT TRIGGERED
    │
    ├─ Error rate > 1%?
    │  └─ YES → See P1 RUNBOOK: High Error Rate
    │  └─ NO → Continue
    │
    ├─ Database integrity check failed?
    │  └─ YES → See P1 RUNBOOK: Data Corruption (CRITICAL!)
    │  └─ NO → Continue
    │
    ├─ Authentication system down (< 50% login success)?
    │  └─ YES → See P1 RUNBOOK: Auth Failure
    │  └─ NO → Continue
    │
    ├─ Payment success rate < 50%?
    │  └─ YES → See P1 RUNBOOK: Payment Failure
    │  └─ NO → Continue
    │
    ├─ Evidence of cross-tenant data leak?
    │  └─ YES → See P1 RUNBOOK: Isolation Breach (ISOLATE NOW!)
    │  └─ NO → Continue
    │
    ├─ P99 latency > 5s sustained?
    │  └─ YES → See P2 RUNBOOK: Latency Degradation
    │  └─ NO → Continue
    │
    ├─ Connection pool > 90%?
    │  └─ YES → See P2 RUNBOOK: Connection Pool Exhaustion
    │  └─ NO → Continue
    │
    └─ Something else?
       └─ Check P8E-CONTINUOUS-MONITORING-PLAYBOOK.md, Part 4
```

---

## QUICK METRICS CHECK (Every 15 min during incident)

```
METRIC                    TARGET      ALERT THRESHOLD    STATUS
─────────────────────────────────────────────────────────────
Error Rate               < 0.1%      > 1%              □ OK  □ ⚠️
P99 Latency              < 2s        > 5s              □ OK  □ ⚠️
Active Connections       < 100       > 150             □ OK  □ ⚠️
Login Success Rate       > 99%       < 50%             □ OK  □ ⚠️
Payment Success Rate     > 99%       < 50%             □ OK  □ ⚠️
DB Connection Pool       < 60%       > 90%             □ OK  □ ⚠️
Cache Hit Rate           > 70%       < 40%             □ OK  □ ⚠️
Disk Usage               < 70%       > 90%             □ OK  □ ⚠️
Memory Usage             < 70%       > 85%             □ OK  □ ⚠️
```

---

## P1 RUNBOOKS (CRITICAL - READ FIRST!)

### 1. HIGH ERROR RATE (Error rate > 1%)

```
IMMEDIATE (0-5 min):
[ ] curl https://api.wapsell.io/metrics | grep error_rate
[ ] If error < 1%, likely false alarm - investigate
[ ] Page on-call engineer NOW
[ ] Collect: git log -5, Sentry errors, DB slow queries

DIAGNOSIS:
[ ] Recent deployment? → Rollback: scripts/deploy-rollback.sh
[ ] Database issue? → Check: SELECT count(*) FROM pg_stat_activity;
[ ] External API? → Check status pages (MercadoPago, SendGrid)
[ ] Memory leak? → Restart: pm2 restart wapsell-api

DECISION:
[ ] Error rate < 0.5% after 15 min? → CONTINUE MONITORING
[ ] Error rate > 5% after 5 min?    → ROLLBACK NOW
[ ] Error rate persistent > 1%?     → ESCALATE VP ENGINEERING
```

### 2. DATA INTEGRITY FAILURE (FK violation or consistency check fails)

```
⚠️  CRITICAL - DO NOT CONTINUE NORMAL OPERATIONS

IMMEDIATE:
[ ] STOP all writes: scripts/maintenance/freeze-writes.sh
[ ] Page DBA immediately (PHONE CALL)
[ ] Notify VP Engineering (PHONE CALL)
[ ] Document: timestamp, SQL error, affected records

ASSESS:
[ ] SELECT COUNT(*) FROM "Order" o 
     WHERE NOT EXISTS (SELECT 1 FROM "Business" b WHERE b.id = o."businessId");
[ ] Review audit logs for corruption timestamp

RECOVERY:
[ ] Identify last good backup time
[ ] Prepare rollback: scripts/restore-from-backup.sh
[ ] Execute rollback (DBA approval required)
[ ] Re-enable writes (gradually, with monitoring)
[ ] Root cause analysis (post-incident)

DECISION:
⚠️  ALWAYS ROLLBACK on data corruption
⚠️  This is a business-critical decision
⚠️  Notify CEO/CTO immediately
```

### 3. AUTHENTICATION SYSTEM FAILURE (Login success < 50%)

```
IMMEDIATE:
[ ] Test login: curl -X POST https://api.wapsell.io/auth/login
[ ] Check JWT service: Verify @nestjs/jwt loaded
[ ] Check DB connectivity: SELECT 1 FROM "User" LIMIT 1;

ENABLE FALLBACK:
[ ] if (auth_service_down) enable_legacy_auth_fallback();
[ ] Notify users: Email + status page
[ ] Enable legacy login endpoint

FIX:
[ ] Restart auth service
[ ] Run auth tests: npm run test -- auth-jwt.e2e.spec.ts
[ ] Confirm login success rate > 99%
[ ] Disable fallback auth

DECISION:
[ ] No login for > 15 min? → ESCALATE IMMEDIATELY
[ ] Users locked out? → Force logout, require legacy login
```

### 4. PAYMENT SYSTEM FAILURE (Payment success < 50%)

```
IMMEDIATE:
[ ] Check MercadoPago status: https://status.mercadopago.com
[ ] If MercadoPago down, notify customers (not your fault)
[ ] If MercadoPago up, check payment service logs

ENABLE RECOVERY:
[ ] Enable payment retry queue
[ ] Notify customers: "Attempting payments again in 5 min"
[ ] Check webhook connectivity

FIX:
[ ] Restart payment service if hung
[ ] Verify webhook processing: SELECT COUNT(*) FROM audit_log WHERE action='WEBHOOK_RECEIVED';
[ ] Process retry queue: scripts/process-payment-queue.sh

DECISION:
[ ] Payment unavailable > 30 min? → NOTIFY FINANCE TEAM
[ ] Revenue at risk? → Escalate to VP Engineering + CFO
```

### 5. MULTI-TENANT ISOLATION BREACH (Cross-business data leak)

```
🚨 CRITICAL SECURITY INCIDENT 🚨

ISOLATE IMMEDIATELY:
[ ] Identify affected businesses (from logs)
[ ] Revoke all sessions for affected users
[ ] Block API access from affected IPs (optional)

FORENSICS:
[ ] Query access logs: Who accessed what data?
[ ] When did breach occur? (from audit log)
[ ] What data was exposed? (comprehensive scan)

NOTIFICATION:
[ ] Page Security Team (PHONE CALL)
[ ] Notify affected business owners (direct call, no email)
[ ] Prepare legal statement (with lawyer)
[ ] Notify CEO immediately

DECISION:
🚨 BREACH = IMMEDIATE C-LEVEL ESCALATION 🚨
This may trigger regulatory reporting obligations (GDPR, etc)
Customer communication must be legal-approved
```

---

## ESCALATION PHONE TREE

```
INCIDENT TYPE         │ FIRST CALL              │ IF NO ANSWER
──────────────────────┼────────────────────────┼──────────────────
Error Rate > 1%       │ On-Call Engineer       │ Engineering Lead
Data Corruption       │ Database Admin         │ VP Engineering
Auth Failure          │ Auth Owner             │ Engineering Lead
Payment Failure       │ Payment Owner          │ Finance Lead
Security Breach       │ Security Team          │ CEO
──────────────────────┴────────────────────────┴──────────────────

[INSERT PHONE NUMBERS HERE]
```

---

## MONITORING DASHBOARD BOOKMARKS

Keep these tabs open during incident:

1. **Metrics Dashboard**  
   https://monitoring.wapsell.io/dashboard/prod

2. **Application Logs**  
   https://elk.wapsell.io/app/kibana#/home

3. **Error Tracking**  
   https://sentry.wapsell.io/organizations/wapsell/issues/

4. **Database Monitor**  
   https://console.cloud.google.com/sql (CloudSQL)

5. **MercadoPago Status**  
   https://status.mercadopago.com

6. **SendGrid Status**  
   https://status.sendgrid.com

---

## COMMUNICATION TEMPLATES

### For #incidents Slack Channel (Instant Notification)

```
🚨 P[1-4] INCIDENT: [Title]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Detected: HH:MM UTC
Impact: [User-facing | Data-affecting | Internal]
Status: INVESTIGATING
Owner: [Your Name]
ETA: [Estimated resolution time]

Updates every 5 minutes.
```

### For Customer Notification (If User-Facing)

```
We're experiencing temporary disruptions to [SERVICE].
We're actively working on a fix and expect recovery by [TIME].
We apologize for the inconvenience.

Status: https://status.wapsell.io
```

---

## ROLLBACK PROCEDURE (If needed)

```
IF DECISION IS TO ROLLBACK:

[ ] 1. Stop application: pm2 stop wapsell-api
[ ] 2. Backup current database state (for forensics)
[ ] 3. Identify target version (from git tags)
[ ] 4. Restore database: scripts/restore-from-backup.sh
[ ] 5. Deploy previous version: scripts/deploy-version.sh <VERSION>
[ ] 6. Start application: pm2 start wapsell-api
[ ] 7. Verify health: curl https://api.wapsell.io/health
[ ] 8. Verify data: run consistency checks
[ ] 9. Notify team: Post in #incidents
[ ] 10. Document: What failed, why we rolled back, lessons learned
```

---

## POST-INCIDENT (After resolution)

```
[ ] Document incident timeline
[ ] Root cause analysis
[ ] Action items for prevention
[ ] Schedule team retrospective
[ ] Update runbooks if needed
[ ] Follow-up communication
```

---

## CRITICAL CONTACTS

```
On-Call Engineer:          [Name] [Phone]
Engineering Lead:          [Name] [Phone]
VP Engineering:            [Name] [Phone]
Database Admin:            [Name] [Phone]
Security Team:             [Name] [Phone]
Finance Lead:              [Name] [Phone]
CEO:                       [Name] [Phone]

Slack: @on-call-engineer, @incident-commander
```

---

## IMPORTANT WEBSITES

- Monitoring: https://monitoring.wapsell.io
- Logs: https://elk.wapsell.io
- Errors: https://sentry.wapsell.io
- Status: https://status.wapsell.io
- MercadoPago Status: https://status.mercadopago.com
- SendGrid Status: https://status.sendgrid.com

---

## REMEMBER:

✅ **Stay calm** - You have runbooks for every scenario  
✅ **Follow the runbook** - Don't improvise, follow steps in order  
✅ **Communicate** - Post to #incidents every 5 minutes  
✅ **Escalate early** - Don't wait if you're unsure  
✅ **Document** - Everything for post-incident review  

**Keep this card within arm's reach!**

---

**Last Updated:** 2026-10-30  
**Version:** 1.0  
**Status:** PRODUCTION READY

