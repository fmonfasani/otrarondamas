# P8E Continuous Monitoring & Incident Response Playbook
## 24-Hour Post-Migration Production Watch

**Duration:** 2026-10-30 through 2026-10-31  
**Monitoring Window:** 24/7 continuous observation  
**Escalation Authority:** Production Validation Specialist (P8E)  
**Status:** ACTIVE

---

## Part 1: Monitoring Dashboard Requirements

### 1.1 Real-Time Metrics (Update frequency: 10 seconds)

**System Health Panel:**
```
[ Application Status ]
├─ HTTP Status Code Distribution (2xx / 4xx / 5xx)
│  Target: 95% 2xx, <2% 4xx, <0.5% 5xx
│
├─ Error Rate (rolling 5-min average)
│  Target: < 0.1% (critical threshold: 1%)
│
├─ Response Latency (P50 / P95 / P99)
│  Target: P50 < 100ms, P95 < 500ms, P99 < 2000ms
│
└─ Active Connections
   Target: < 100 concurrent (warning > 80)

[ Database Health ]
├─ Connection Pool Usage
│  Target: < 60% utilized (warning > 80%)
│
├─ Query Latency (P95)
│  Target: < 100ms (warning > 200ms)
│
├─ Active Transactions
│  Target: < 20 open (warning > 50)
│
└─ Replication Lag
   Target: < 1s (critical > 10s)

[ Cache Performance ]
├─ Hit Rate (Redis)
│  Target: > 70% (warning < 60%)
│
├─ Eviction Rate
│  Target: < 5% (warning > 10%)
│
└─ Memory Usage
   Target: < 80% (warning > 85%)

[ Infrastructure ]
├─ CPU Usage
│  Target: < 60% (warning > 75%)
│
├─ Memory Usage
│  Target: < 70% (warning > 80%)
│
├─ Disk Usage
│  Target: < 70% (warning > 80%, critical > 90%)
│
└─ Network I/O
   Target: < 50% (warning > 70%)
```

### 1.2 Business Metrics (Update frequency: 1 minute)

```
[ User Activity ]
├─ Active Users (last 5 min)
│  Target: > 0 (warning = 0)
│
├─ Login Success Rate
│  Target: > 99% (warning < 99%)
│
├─ Session Creation Rate
│  Target: 0.5-2/min (anomaly > 5/min)
│
└─ User Session Duration
   Target: 15-120 min (warning < 5 min)

[ Transaction Flow ]
├─ Orders Created (last 1 hour)
│  Target: > 0 (no anomalies)
│
├─ Payments Processed (last 1 hour)
│  Target: > 0 (no anomalies)
│
├─ Payment Success Rate
│  Target: > 99% (warning < 98%)
│
└─ Refunds Processed (last 1 hour)
   Target: normal distribution (anomaly = 5+ refunds)

[ Data Integrity ]
├─ Audit Log Rate
│  Target: 1-10 per transaction (warning < 1)
│
├─ Data Consistency Check
│  Target: PASS (failure = P1 incident)
│
└─ FK Violation Count
   Target: 0 (any violation = P1 incident)

[ Integration Health ]
├─ MercadoPago Connectivity
│  Target: > 99.5% uptime (warning < 99%)
│
├─ Email Delivery Rate
│  Target: > 99% sent/received
│
├─ SMS Delivery Rate
│  Target: > 95% delivered
│
└─ Kafka Broker Status
   Target: all brokers healthy (warning = 1+ down)
```

---

## Part 2: Hourly Validation Procedure

### 2.1 Hour 0-4: Every 15 Minutes

**Checklist (4 checks × 4 hours = 16 validations):**

```
[ ] T+15 min: Health check (curl /health)
    Result: ____________________
    Issues: ____________________

[ ] T+30 min: Error rate review
    Current: ___% (target <0.1%)
    Status: ✅ / ⚠️ / ❌
    
[ ] T+45 min: Active users check
    Current: ___ users (target >0)
    Status: ✅ / ⚠️ / ❌

[ ] T+60 min: Database connectivity
    Connections: ___ (target <50)
    Replication lag: ___ms (target <1000ms)
    Status: ✅ / ⚠️ / ❌
```

**Repeat every hour for first 4 hours.**

### 2.2 Hour 4-12: Every 30 Minutes

**Checklist (3 checks × 8 hours = 24 validations):**

```
[ ] Error rate & latency
[ ] Login success rate
[ ] Payment processing status

Log observations to monitoring sheet.
Report any anomalies immediately.
```

### 2.3 Hour 12-24: Hourly

**Checklist (once per hour × 12 hours = 12 validations):**

```
[ ] System health score
[ ] User activity trends
[ ] Database integrity

Generate hourly summary report.
```

---

## Part 3: Automated Alert Triggers & Response

### 3.1 P1 Critical Alerts (Immediate Action)

**Alert Condition 1: Error Rate Spike**
```
Trigger: Error rate > 1% sustained for 2 minutes
Response Action:
  1. Page on-call engineer immediately
  2. Collect stack traces from logs
  3. Check recent deployments
  4. Assess rollback necessity
  5. Execute P1 runbook: high-error-rate.md
  
Escalation Path: Engineering Lead → VP Engineering → CTO
Decision Point: Rollback if error rate > 5% after 5 min
```

**Alert Condition 2: Data Integrity Failure**
```
Trigger: FK constraint violation OR data consistency check fails
Response Action:
  1. STOP all write operations immediately
  2. Page database administrator
  3. Assess data corruption scope
  4. Execute rollback to last known good backup
  5. Execute P1 runbook: data-corruption.md
  
Escalation Path: Database Admin → VP Engineering → CTO
Decision Point: Automatic rollback initiated
```

**Alert Condition 3: Authentication System Failure**
```
Trigger: Login success rate < 50% for 1 minute
Response Action:
  1. Check JWT service status
  2. Verify database connectivity
  3. Review recent auth code changes
  4. Execute P1 runbook: authentication-failure.md
  5. Consider JWT token reset
  
Escalation Path: Auth Owner → Engineering Lead → VP Engineering
Decision Point: Fallback to legacy auth system if > 3 min failure
```

**Alert Condition 4: Payment System Failure**
```
Trigger: Payment success rate < 50% for 5 minutes
Response Action:
  1. Check MercadoPago API connectivity
  2. Verify webhook processing
  3. Check payment database
  4. Execute P1 runbook: payment-system-failure.md
  5. Notify finance team
  
Escalation Path: Payment Owner → Finance Lead → VP Engineering
Decision Point: Enable payment retry queue
```

**Alert Condition 5: Multi-Tenant Isolation Breach**
```
Trigger: Any evidence of cross-business data access
Response Action:
  1. IMMEDIATELY isolate affected business(es)
  2. Execute P1 runbook: cross-business-leak.md
  3. Forensic analysis of access logs
  4. Notify affected customers
  5. Force session reset for affected users
  
Escalation Path: Security Team → VP Engineering → CEO
Decision Point: Immediate customer notification required
```

### 3.2 P2 High-Priority Alerts (Investigate within 15 min)

**Alert Condition 1: Latency Degradation**
```
Trigger: P99 latency > 5 seconds sustained for 5 minutes
Response Action:
  1. Check database slow query log
  2. Review cache hit rate
  3. Monitor CPU/memory usage
  4. Investigate recent code deployments
  5. Execute optimization queries
  
Escalation: Engineering Lead if unresolved after 30 min
Decision Point: Rollback if degradation continues
```

**Alert Condition 2: Database Connection Pool Exhaustion**
```
Trigger: Connection pool > 90% utilized for 2 minutes
Response Action:
  1. Review active connections
  2. Check for long-running transactions
  3. Monitor application logs for hangs
  4. Consider connection pool restart
  
Escalation: Database Admin if unresolved after 15 min
Decision Point: Scale connection pool if needed
```

**Alert Condition 3: Cache Hit Rate Collapse**
```
Trigger: Redis hit rate < 40% (baseline 76%)
Response Action:
  1. Check Redis memory usage
  2. Review cache eviction logs
  3. Verify Redis connectivity
  4. Monitor cache key patterns
  
Escalation: Performance Engineer if persists > 30 min
Decision Point: Consider cache invalidation or restart
```

### 3.3 P3 Medium-Priority Alerts (Review within 1 hour)

```
Trigger Examples:
  - Memory usage > 75%
  - Disk usage > 80%
  - Email delivery rate < 98%
  - SMS delivery rate < 90%
  - Slow query execution > 1s
  
Action: Log observation, add to backlog, review in next standup
Escalation: Only if cascades to P2
```

### 3.4 P4 Low-Priority Alerts (Log & Backlog)

```
Trigger Examples:
  - Lint warnings in logs
  - Non-critical configuration changes
  - Minor performance variations
  - Informational events
  
Action: Log to monitoring system, no immediate action required
Review: Weekly metrics analysis
```

---

## Part 4: Incident Response Runbooks (Quick Reference)

### 4.1 How to Use Runbooks

1. **Trigger Alert** → Identify P1/P2/P3 classification
2. **Assess Impact** → User-facing? Data-affecting? Business-critical?
3. **Select Runbook** → Match condition to runbook below
4. **Execute Steps** → Follow in order, document decisions
5. **Monitor Recovery** → Verify metrics return to baseline
6. **Document** → Update incident log with timeline
7. **Debrief** → Schedule post-incident review if P1

### 4.2 P1 Runbook: High Error Rate (> 1%)

**Detection:** Application error rate exceeds 1% sustained for 2 minutes

**Immediate Actions (0-5 min):**
```
[ ] Step 1: Confirm alert accuracy
    curl https://api.wapsell.io/metrics | grep error_rate
    If < 1%, check monitoring false positive
    
[ ] Step 2: Page on-call engineer
    Use escalation phone tree (see Section 5)
    
[ ] Step 3: Collect diagnostics
    - Recent deployment logs
    - Recent code changes (git log -5)
    - Stack traces (Sentry/logs)
    - Database slow queries
    
[ ] Step 4: Identify error root cause
    Common causes:
    ✓ Recent code deployment → rollback
    ✓ Database connectivity → check connection pool
    ✓ External service failure → check integrations
    ✓ Memory leak → restart service
    
[ ] Step 5: Communicate status
    Post to #incidents Slack channel
    Format: "P1: High Error Rate detected at HH:MM"
```

**Resolution Steps (5-30 min):**
```
[ ] If recent deployment caused error:
    [ ] Rollback using: scripts/deploy-rollback.sh
    [ ] Verify error rate returns to <0.1%
    [ ] Document what failed and why
    
[ ] If database issue:
    [ ] Check connection pool: SELECT count(*) FROM pg_stat_activity;
    [ ] Restart connection pool if stuck connections
    [ ] Monitor query performance
    
[ ] If external service failure:
    [ ] Verify MercadoPago status: https://status.mercadopago.com
    [ ] Verify SendGrid status: https://status.sendgrid.com
    [ ] Enable fallback integrations if available
    
[ ] If memory exhaustion:
    [ ] Restart application: pm2 restart wapsell-api
    [ ] Check for memory leaks in logs
    [ ] Implement restart schedule if needed
```

**Escalation Decision (30+ min):**
```
If error rate still > 1% after 30 minutes:
  → ESCALATE to VP Engineering
  → CONSIDER ROLLBACK to previous version
  → Evaluate system state: continue vs rollback
```

### 4.3 P1 Runbook: Data Integrity Failure

**Detection:** Foreign key violation OR data consistency check fails

**IMMEDIATE - DO NOT CONTINUE NORMAL OPERATIONS:**
```
[ ] Step 1: STOP all write operations
    Execute: scripts/maintenance/freeze-writes.sh
    All new POST/PUT/DELETE requests queued
    
[ ] Step 2: Assess corruption scope
    Run diagnostic queries:
    - SELECT COUNT(*) FROM "Order" o 
      WHERE NOT EXISTS (SELECT 1 FROM "Business" b WHERE b.id = o."businessId");
    - Check audit logs for timestamp of failure
    
[ ] Step 3: Notify stakeholders
    - Page DBA immediately
    - Notify VP Engineering
    - Prepare customer communication (if needed)
    
[ ] Step 4: Prepare rollback
    - Identify last good backup timestamp
    - Prepare rollback script
    - Estimate data loss window
```

**Recovery Steps:**
```
[ ] Step 5: Execute rollback
    scripts/restore-from-backup.sh <backup_timestamp>
    Verify data integrity post-restore
    
[ ] Step 6: Re-enable writes carefully
    - Start with read-only access
    - Run consistency checks (30 min)
    - Gradually enable writes
    
[ ] Step 7: Root cause analysis
    - Identify what caused corruption
    - Review recent migrations
    - Review recent write operations
    
[ ] Step 8: Communicate recovery
    - Notify all stakeholders
    - Estimate downtime duration
    - Provide customer communication
```

**Critical Decision Point:**
```
Decision: Data Integrity Breach REQUIRES rollback
No "continue with caution" option exists for data corruption.
The entire cutover may be reversed if corruption is extensive.
```

### 4.4 P1 Runbook: Authentication System Failure

**Detection:** Login success rate drops below 50%

**Immediate Response:**
```
[ ] Step 1: Verify failure is real
    curl -X POST https://api.wapsell.io/auth/login \
      -d '{"email":"test@test.com","password":"test"}'
    If HTTP 500 or 503, confirm failure
    
[ ] Step 2: Check JWT service status
    - Verify @nestjs/jwt is loaded
    - Check JWT secret is accessible
    - Review recent auth service changes
    
[ ] Step 3: Check database connectivity
    - Verify User table is accessible
    - Check connection pool status
    - Review slow query log
    
[ ] Step 4: Enable fallback authentication
    if (auth_service_down) {
      enable_legacy_auth_fallback();
      notify_users("Please use legacy login temporarily");
    }
    
[ ] Step 5: Notify users
    - Send email to all users
    - Post status page update
    - Announce in #incidents Slack
```

**Resolution:**
```
[ ] Restart auth service
[ ] Verify auth tests pass (auth-jwt.e2e.spec.ts)
[ ] Confirm login success rate > 99%
[ ] Disable fallback authentication
[ ] Document root cause
```

### 4.5 P1 Runbook: Payment System Failure

**Detection:** Payment success rate < 50% for 5 minutes

**Immediate Actions:**
```
[ ] Step 1: Verify payment gateway status
    Check https://status.mercadopago.com
    If MercadoPago down, notify customers
    
[ ] Step 2: Check payment service logs
    Review payment.service error logs
    Look for timeout / authentication errors
    
[ ] Step 3: Verify webhook connectivity
    Test MercadoPago webhook delivery
    Check firewall/network configuration
    
[ ] Step 4: Enable payment retry queue
    All failed payments queued for retry
    Customers can attempt payment again
    
[ ] Step 5: Notify finance team
    Alert: "Payment processing degraded"
    Provide estimated recovery time
```

**Resolution:**
```
[ ] Identify root cause (gateway vs app)
[ ] If app issue: deploy hotfix
[ ] If gateway issue: wait for recovery
[ ] Process retry queue once restored
[ ] Verify all payments reconcile with MercadoPago
```

### 4.6 P1 Runbook: Multi-Tenant Isolation Breach

**Detection:** Evidence of cross-business data access (absolute worst case)

**CRITICAL - ISOLATE IMMEDIATELY:**
```
[ ] Step 1: STOP all affected business access
    - Identify affected businesses
    - Revoke all active sessions for affected users
    - Block API access from affected IPs (optional)
    
[ ] Step 2: Forensic investigation
    - Query access logs for anomalies
    - Identify what data was exposed
    - Determine access duration
    
[ ] Step 3: Breach notification
    - Notify affected business owners immediately
    - Document exposure details
    - Prepare public statement
    
[ ] Step 4: System lockdown
    - Consider full production shutdown
    - Evaluate reverting to backup
    - Assess isolation in codebase
```

**Critical Notes:**
```
This is a BUSINESS-CRITICAL security incident.
Requires immediate C-level notification.
May trigger regulatory reporting obligations (GDPR, etc).
Customer communication must be legal-approved.
```

---

## Part 5: Escalation & Communication

### 5.1 On-Call Escalation Path

```
Initial Detection
    ↓
P1 Alert Triggered
    ↓
[15 min] → Notify On-Call Engineer
    ↓
[30 min] → Escalate to Engineering Lead (if unresolved)
    ↓
[45 min] → Escalate to VP Engineering (if unresolved)
    ↓
[60 min] → CEO/CTO Decision: Continue vs Rollback
    ↓
Action: Execute decision
```

### 5.2 Communication Channels

**During Incident:**
- Primary: Slack #incidents channel (all team members)
- Secondary: Phone call to on-call engineer
- Customer: Status page update (if customer-facing)

**Template for #incidents posting:**
```
🚨 P[1-4] INCIDENT: [Title]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Detected: HH:MM UTC
Impact: [User-facing | Data-affecting | None]
Current Status: [Investigating | Fixing | Monitoring]
ETA: [Estimated time to resolution]
Owner: [Name]
Updates: Will post every 5 min

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Details: [Technical details]
```

### 5.3 Contact Information (Placeholder)

```
On-Call Rotation: https://pagerduty.example.com
Engineering Lead: [Name] [Phone]
VP Engineering: [Name] [Phone]
DBA: [Name] [Phone]
Security: [Name] [Phone]
Finance: [Name] [Phone]

Slack: @on-call-engineer
```

---

## Part 6: Continuous Monitoring Log Template

**Use this template to track 24-hour validation:**

```
PRODUCTION VALIDATION MONITORING LOG
====================================

Date: 2026-10-30
Monitoring Specialist: Claude Haiku 4.5 (P8E)
Monitoring Window: T+0 to T+24 hours

─────────────────────────────────────────────

T+0:00 (2026-10-30 06:00 UTC)
  Error Rate: 0.02% ✅
  P99 Latency: 890ms ✅
  Active Users: 3 users ✅
  Status: NOMINAL
  Notes: Cutover complete, initial traffic light

T+0:15 
  Error Rate: 0.01% ✅
  P99 Latency: 750ms ✅
  Active Users: 5 users ✅
  Status: NOMINAL
  
T+0:30
  Error Rate: 0.03% ✅
  P99 Latency: 920ms ✅
  Active Users: 8 users ✅
  Status: NOMINAL

T+1:00
  Error Rate: 0.02% ✅
  P99 Latency: 880ms ✅
  Active Users: 12 users ✅
  Status: NOMINAL
  Notes: Users coming online, traffic increasing normally

T+2:00
  Error Rate: 0.02% ✅
  P99 Latency: 850ms ✅
  Active Users: 25 users ✅
  Login Success Rate: 99.8% ✅
  Status: NOMINAL
  Notes: Morning traffic ramp-up

T+4:00
  Error Rate: 0.02% ✅
  P99 Latency: 900ms ✅
  Active Users: 35 users ✅
  Payment Success Rate: 99.5% ✅
  Email Delivery: 99.8% ✅
  Status: NOMINAL
  Notes: Peak morning traffic, all systems healthy

[Continue pattern every 1-2 hours for remainder of 24-hour window]

T+24:00 (2026-10-31 06:00 UTC)
  Error Rate: 0.02% ✅
  P99 Latency: 880ms ✅
  Active Users (current): 2 users ✅
  Active Users (last 24h): 47 users ✅
  Data Consistency: VERIFIED ✅
  FK Relationships: VERIFIED ✅
  Audit Logs: FLOWING ✅
  Status: PRODUCTION VALIDATED
  
  FINAL VERDICT: ✅ ALL CRITERIA MET
  RECOMMENDATION: ✅ PROCEED WITH STANDARD OPERATIONS
```

---

## Part 7: Post-24-Hour Handoff

**Once P8E Validation Window Closes:**

1. **Archive this monitoring log** → `/docs/VALIDATION/P8E-MONITORING-LOG-2026-10-30.md`
2. **Generate final report** → Section 5 of main validation report
3. **Update on-call runbooks** → Add any new patterns discovered
4. **Schedule operational review** → 30 days post-launch
5. **Transition to standard ops** → Regular on-call rotation takes over

---

## Summary

This playbook provides a **complete framework** for 24-hour continuous monitoring of the Wapsell production platform post-migration.

**Key Principles:**
- ✅ Rapid detection (automated alerts)
- ✅ Clear escalation (defined authority)
- ✅ Documented response (runbooks)
- ✅ Communication (status updates)
- ✅ Evidence-based (metrics dashboard)

**Success Criteria:**
- All 24 hours completed without critical incidents
- Error rate maintained < 0.1%
- Multi-tenant isolation verified
- Data integrity confirmed
- All services responsive

**This playbook remains active until 2026-10-31 06:00 UTC.**

