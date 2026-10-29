# Health Check Endpoint Specification

## Overview

The health check endpoint monitors the health of the API and its dependencies. It provides real-time status information for operational monitoring and load balancer health checks.

## Endpoint

```
GET /health
```

### Authentication

No authentication required. This endpoint is public.

## Response - Success (200 OK)

When all dependencies are healthy:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime_seconds": 3600,
  "version": "1.0.0",
  "checks": {
    "database": "ok"
  },
  "latencyMs": 45
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| status | string | Overall status: "ok" or "unavailable" |
| timestamp | string | ISO 8601 timestamp when check was performed |
| uptime_seconds | number | Seconds since application started |
| version | string | API version |
| checks | object | Individual health checks (see below) |
| latencyMs | number | Time taken to perform health check in milliseconds |

## Response - Failure (503 Service Unavailable)

When one or more dependencies are down:

```json
{
  "statusCode": 503,
  "status": "unavailable",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "checks": {
    "database": "error"
  },
  "latencyMs": 5000
}
```

## Health Checks

### Database Check

Validates database connectivity using a simple query (`SELECT 1`).

- **Status: "ok"** - Database is reachable and responsive
- **Status: "error"** - Database connection failed

```json
{
  "checks": {
    "database": "ok"
  }
}
```

## Usage Examples

### cURL

```bash
# Basic health check
curl http://localhost:3000/health

# With correlation ID
curl -H "X-Correlation-ID: my-trace-id" http://localhost:3000/health

# Check specific status code
curl -w "\n%{http_code}\n" http://localhost:3000/health
```

### Node.js / JavaScript

```javascript
// Fetch health status
const response = await fetch('http://localhost:3000/health');
const health = await response.json();

if (response.ok) {
  console.log('API is healthy:', health);
} else {
  console.error('API is unhealthy:', health);
}
```

### Kubernetes Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
```

### Kubernetes Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
```

### Load Balancer Health Check

```
Protocol: HTTP
Path: /health
Port: 3000
Expected Status: 200
Interval: 30 seconds
Timeout: 5 seconds
Healthy Threshold: 2
Unhealthy Threshold: 3
```

## Monitoring

### Prometheus Metrics (future enhancement)

```
# HELP api_health_status Current API health status (1 = ok, 0 = error)
# TYPE api_health_status gauge
api_health_status{service="api"} 1

# HELP api_uptime_seconds Seconds since API started
# TYPE api_uptime_seconds gauge
api_uptime_seconds 3600

# HELP api_health_check_duration_ms Duration of health check in milliseconds
# TYPE api_health_check_duration_ms gauge
api_health_check_duration_ms 45

# HELP api_dependency_status Individual dependency status (1 = ok, 0 = error)
# TYPE api_dependency_status gauge
api_dependency_status{dependency="database"} 1
```

## Error Scenarios

### Database Down

```
Status: 503 Service Unavailable
Response:
{
  "statusCode": 503,
  "status": "unavailable",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "checks": {
    "database": "error"
  }
}
```

**Action**: Check database connectivity, credentials, and availability.

### Slow Health Check

If the health check takes longer than 1 second, it may indicate:
- Database performance issues
- Network latency
- Overloaded server

**Action**: Monitor latency trends. Investigate if latency increases.

## Integration

### Swagger/OpenAPI

The health check endpoint is documented in Swagger:

```
GET /health
```

- **Summary**: Health check endpoint
- **Description**: Returns API health status including database connectivity
- **Parameters**: None
- **Responses**:
  - 200: API and all dependencies are healthy
  - 503: One or more dependencies are unavailable

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

## Best Practices

1. **Call frequently** - Health checks should be called every 10-30 seconds
2. **Handle timeouts** - Set a timeout of 3-5 seconds
3. **Use correlation IDs** - Include X-Correlation-ID for debugging
4. **Monitor latency** - Track health check duration over time
5. **Alert on failures** - Set up alerts for repeated failures
6. **Don't cascade** - Don't check external dependencies that may cascade failures

## Related Documentation

- [API Error Codes](./API-ERROR-CODES.md)
- [Rate Limiting](./RATE-LIMITING.md)
- [Standard Response Format](./RESPONSE-FORMAT.md)
