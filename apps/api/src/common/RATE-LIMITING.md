# Rate Limiting Policy

## Overview

The API implements rate limiting to protect against abuse and ensure fair resource usage. Rate limits are enforced per IP address.

## Rate Limits

### Default Limits

- **100 requests per minute** per IP address
- **Window**: 60 seconds (rolling)
- **Reset**: Automatic after window expires

## Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 2024-01-01T12:01:00.000Z
```

### Header Fields

| Header | Type | Description |
|--------|------|-------------|
| X-RateLimit-Limit | number | Maximum requests allowed in the window |
| X-RateLimit-Remaining | number | Requests remaining in current window |
| X-RateLimit-Reset | string | ISO 8601 timestamp when limit resets |

## Rate Limit Exceeded Response

When you exceed the rate limit, you'll receive:

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-01-01T12:01:00.000Z
```

```json
{
  "statusCode": 429,
  "message": "Too many requests, please try again later",
  "retryAfter": 30,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/some-endpoint",
  "correlationId": "123e4567-e89b-12d3-a456-426614174000"
}
```

## Best Practices

### 1. Monitor Remaining Requests

Check the `X-RateLimit-Remaining` header to track consumption:

```javascript
const response = await fetch('https://api.example.com/data');
const remaining = response.headers.get('X-RateLimit-Remaining');
console.log(`Requests remaining: ${remaining}`);
```

### 2. Implement Exponential Backoff

When you receive a 429 response:

```javascript
async function apiCallWithRetry(url, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        const resetTime = new Date(
          response.headers.get('X-RateLimit-Reset')
        );
        const delay = resetTime.getTime() - Date.now();
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries++;
        continue;
      }
      return response;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 3. Batch Requests

Combine multiple requests into a single batch operation when possible:

```javascript
// Bad: Multiple requests
await fetch('/api/users/1');
await fetch('/api/users/2');
await fetch('/api/users/3');

// Good: Single batch request
await fetch('/api/users/batch?ids=1,2,3');
```

### 4. Use Pagination

For large datasets, use pagination to reduce total requests:

```javascript
let offset = 0;
const limit = 100;
let hasMore = true;

while (hasMore) {
  const response = await fetch(
    `/api/items?limit=${limit}&offset=${offset}`
  );
  const { data, meta } = await response.json();
  
  // Process data
  offset += limit;
  hasMore = offset < meta.total_count;
}
```

### 5. Cache Responses

Cache results to avoid repeated requests:

```javascript
const cache = new Map();

async function getUser(id) {
  if (cache.has(id)) {
    return cache.get(id);
  }
  const response = await fetch(`/api/users/${id}`);
  const user = await response.json();
  cache.set(id, user);
  return user;
}
```

## IP Address Detection

Rate limits are based on the client's IP address. The following headers are checked in order:

1. `X-Forwarded-For` (first IP in comma-separated list)
2. `socket.remoteAddress`
3. `connection.remoteAddress`

For requests behind a proxy, ensure the `X-Forwarded-For` header is properly set.

## Exceptions and Special Cases

### Public Endpoints

Some endpoints may have different rate limits or no rate limiting:
- `/health` - Health check endpoint (not rate limited)
- `/api/docs` - Swagger documentation (not rate limited)
- Public authentication endpoints may have looser limits

### Higher Limits

Contact support to request higher rate limits for:
- Integration testing
- High-volume data imports
- Bulk operations

## Monitoring and Alerts

### Set Up Alerts

Alert when rate limit is approached:

```javascript
const threshold = 10; // Alert when < 10 requests remaining

const response = await fetch('https://api.example.com/data');
const remaining = parseInt(
  response.headers.get('X-RateLimit-Remaining')
);

if (remaining < threshold) {
  console.warn(`Warning: Rate limit approaching (${remaining} remaining)`);
  // Implement backoff or wait
}
```

### Logging

Log all 429 responses for analysis:

```javascript
async function apiCall(url) {
  const response = await fetch(url);
  if (response.status === 429) {
    console.error({
      timestamp: new Date().toISOString(),
      url,
      rateLimit: {
        limit: response.headers.get('X-RateLimit-Limit'),
        remaining: response.headers.get('X-RateLimit-Remaining'),
        reset: response.headers.get('X-RateLimit-Reset'),
      },
    });
  }
  return response;
}
```

## Troubleshooting

### Getting 429 Immediately

- **Cause**: Server received many requests in a short time
- **Solution**: Wait for the window to reset or implement backoff

### Requests Not Counting Down

- **Cause**: Each IP has a separate counter
- **Solution**: Verify your IP address in logs or check X-Forwarded-For header

### Rate Limit Reset Not Working

- **Cause**: Time sync issue between client and server
- **Solution**: Ensure system clock is accurate (NTP sync)

## Related Documentation

- [Error Codes](./API-ERROR-CODES.md)
- [Response Format](./RESPONSE-FORMAT.md)
- [Health Check](./HEALTH-CHECK.md)
