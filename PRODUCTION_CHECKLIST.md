# Production Readiness Checklist

## Pre-Deployment Assessment

### Code Quality
- [ ] All unit tests passing (npm test)
- [ ] All E2E tests passing (npm run test:e2e)
- [ ] TypeScript strict mode: 0 errors (npm run typecheck)
- [ ] ESLint: 0 warnings (npm run lint)
- [ ] Code review approved by at least 2 team members
- [ ] All PR comments resolved
- [ ] No console.error or console.warn in production code
- [ ] No TODO comments in critical paths

### Performance
- [ ] Production build created successfully (npm run build)
- [ ] Build size < 500KB (gzipped) for main bundle
- [ ] Lighthouse score >= 90 on desktop
- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] API response times < 500ms (p95)
- [ ] Database queries optimized (no N+1 queries)
- [ ] Bundle analyzed and bloat removed
- [ ] Static assets are cacheable (1 year expiry)
- [ ] Images optimized and responsive
- [ ] CSS/JS minified and tree-shaken

### Security
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] All secrets stored in environment variables
- [ ] HTTPS enforced (no HTTP fallback)
- [ ] CORS configured correctly
- [ ] CSRF protection enabled
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection headers set
- [ ] Rate limiting enabled on API endpoints
- [ ] Input validation on all forms
- [ ] Authentication tokens have expiration
- [ ] Password complexity requirements enforced
- [ ] Sensitive data encrypted at rest
- [ ] Security scan passed (npm audit)
- [ ] No known CVEs in dependencies
- [ ] API keys rotated before deployment

### Infrastructure
- [ ] VPS prepared and SSH access configured
- [ ] Docker image builds successfully
- [ ] Docker image tested locally
- [ ] CI/CD pipeline green (all checks passing)
- [ ] Database migrations tested on staging
- [ ] Backup strategy documented
- [ ] Disaster recovery plan exists
- [ ] SSL/TLS certificate valid (not self-signed)
- [ ] DNS records properly configured
- [ ] Load balancer configured (if applicable)
- [ ] Health check endpoint implemented
- [ ] Environment variables documented

### Database
- [ ] Database schema reviewed and approved
- [ ] Migration tested on production-like data
- [ ] Rollback procedure documented and tested
- [ ] Indexes optimized for common queries
- [ ] Foreign key constraints verified
- [ ] Data integrity checks in place
- [ ] Backup schedule configured
- [ ] Point-in-time recovery tested

### Monitoring & Observability
- [ ] Error tracking enabled (Sentry/NewRelic/DataDog)
- [ ] Application logging configured
- [ ] Log aggregation service connected
- [ ] Uptime monitoring configured
- [ ] Performance monitoring enabled
- [ ] Alerting rules configured
- [ ] Notification channels tested
- [ ] Dashboard created for key metrics
- [ ] Health check monitoring active
- [ ] Database monitoring enabled

### API & Integration
- [ ] API documentation complete and accurate
- [ ] API versioning strategy documented
- [ ] Rate limiting configured and tested
- [ ] Webhooks tested in production-like environment
- [ ] Third-party integrations verified
- [ ] Kafka topics created and tested
- [ ] WebSocket connections tested under load
- [ ] API response codes documented

### Testing Coverage
- [ ] Unit test coverage >= 80%
- [ ] Integration test coverage >= 60%
- [ ] E2E test coverage for critical flows
- [ ] Load testing completed (if high traffic expected)
- [ ] Stress testing completed
- [ ] Security testing (OWASP Top 10)
- [ ] Accessibility testing (WCAG 2.1 AA)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness verified
- [ ] Smoke tests pass on staging

### Documentation
- [ ] README updated with setup instructions
- [ ] API documentation complete (OpenAPI/Swagger)
- [ ] Architecture decision records updated
- [ ] Deployment guide written and tested
- [ ] Runbooks prepared for common incidents
- [ ] Troubleshooting guide created
- [ ] Database schema documented
- [ ] Environment variables documented
- [ ] Known issues and workarounds documented
- [ ] Release notes prepared

### DevOps & Process
- [ ] Git branching strategy documented
- [ ] PR template configured
- [ ] CI/CD pipeline documented
- [ ] Deployment procedure tested
- [ ] Rollback procedure tested and documented
- [ ] Change log maintained
- [ ] Team trained on deployment process
- [ ] Escalation procedures documented
- [ ] On-call rotation established
- [ ] Incident response procedure documented

### Compliance & Legal
- [ ] GDPR compliance verified (if applicable)
- [ ] HIPAA compliance verified (if applicable)
- [ ] Data retention policies documented
- [ ] Privacy policy updated
- [ ] Terms of service reviewed
- [ ] Cookie consent implemented
- [ ] Data processing agreements in place
- [ ] Third-party data sharing documented

### Business Requirements
- [ ] Product owner sign-off obtained
- [ ] Feature parity with design specifications
- [ ] All acceptance criteria met
- [ ] User feedback incorporated
- [ ] Stakeholder approval obtained
- [ ] Marketing materials prepared
- [ ] Support team trained
- [ ] Support documentation prepared

## Deployment Readiness Matrix

| Component | Status | Owner | Notes |
|-----------|--------|-------|-------|
| Code Quality | ✅/❌ | Engineer | |
| Performance | ✅/❌ | Engineer | |
| Security | ✅/❌ | Security | |
| Infrastructure | ✅/❌ | DevOps | |
| Database | ✅/❌ | DBA | |
| Monitoring | ✅/❌ | DevOps | |
| Testing | ✅/❌ | QA | |
| Documentation | ✅/❌ | Tech Lead | |
| Business | ✅/❌ | Product | |
| Legal/Compliance | ✅/❌ | Legal | |

## Deployment Day Checklist

### Pre-Deployment (1 hour before)
- [ ] All team members notified of deployment window
- [ ] Backup of database created and verified
- [ ] Rollback procedure reviewed
- [ ] Monitoring dashboards open and watched
- [ ] Incident response team on standby
- [ ] Communication channel open (Slack, Teams, etc)
- [ ] Latest code deployed to staging
- [ ] Smoke tests passed on staging

### During Deployment
- [ ] Application stopped gracefully
- [ ] Database migrations applied
- [ ] New version deployed
- [ ] Application starts successfully
- [ ] Health check endpoint returning OK
- [ ] Critical user flows tested
- [ ] Performance metrics normal
- [ ] Error rates normal
- [ ] All team members notified of progress

### Post-Deployment (1 hour after)
- [ ] All health checks passing
- [ ] No increased error rates
- [ ] Performance metrics normal
- [ ] Database size normal
- [ ] Log aggregation showing no errors
- [ ] End-to-end tests passing on production
- [ ] User feedback collected
- [ ] Team debriefing scheduled (if needed)
- [ ] Documentation updated

## Success Metrics

Define and track these metrics:

| Metric | Target | Current |
|--------|--------|---------|
| Uptime | 99.9% | |
| API Response Time (p95) | < 500ms | |
| Error Rate | < 0.1% | |
| Page Load Time (Core Web Vitals) | LCP < 2.5s | |
| Database Query Time (p95) | < 100ms | |
| CPU Usage | < 70% | |
| Memory Usage | < 80% | |
| Disk Usage | < 80% | |

## Sign-Off

**Deployment readiness approved by:**

- [ ] Engineering Lead: __________ Date: __________
- [ ] DevOps Lead: __________ Date: __________
- [ ] Product Lead: __________ Date: __________
- [ ] QA Lead: __________ Date: __________

**Deployment completed by:**

- [ ] Engineer: __________ Time: __________
- [ ] Verified by: __________ Time: __________

**Notes:**
```
___________________________________________________________________________
___________________________________________________________________________
___________________________________________________________________________
```

## Post-Deployment Retrospective (within 24 hours)

- [ ] Issues encountered documented
- [ ] Time to deployment: __________
- [ ] Time to first user traffic: __________
- [ ] Any rollbacks needed? Yes / No
- [ ] Team feedback collected
- [ ] Action items created for improvements
- [ ] Documentation updated based on learnings

**Team Retrospective Notes:**
```
___________________________________________________________________________
___________________________________________________________________________
___________________________________________________________________________
```
