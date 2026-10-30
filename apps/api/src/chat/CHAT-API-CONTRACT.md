# Chat API Contract - NestJS RAG Endpoints

## Overview

This document specifies the complete contract for the Chat API endpoints, including request/response schemas, error handling, and authentication requirements.

## Base URL

```
https://api.wapsell.local/chat
```

## Authentication

All endpoints require JWT Bearer token in `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Failure to provide a valid token results in **401 Unauthorized**.

---

## Endpoint Reference

### 1. Send Message

**POST /message**

Send a user message and receive an AI-powered response with buyer persona detection.

#### Request

```http
POST /chat/message HTTP/1.1
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "message": "How much does this property cost?",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_context": {
    "property_id": "prop_123",
    "user_type": "buyer"
  }
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `message` | string | ✅ Yes | 1-2000 chars, non-empty after trim |
| `session_id` | UUID | ❌ No | Must exist if provided; creates new if omitted |
| `user_context` | object | ❌ No | Custom key-value pairs (max 10KB) |

#### Response (200 OK)

```json
{
  "id": "msg_1730228400123",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "response": "Our properties range from $150,000 to $500,000 depending on location and size. Which area interests you?",
  "user_message": "How much does this property cost?",
  "persona": {
    "persona_type": "DECISION_MAKER",
    "confidence": 0.87,
    "characteristics": [
      "Business-focused",
      "Budget-conscious",
      "Timeline-aware",
      "Impact-focused"
    ]
  },
  "metadata": {
    "model": "gpt-3.5-turbo",
    "tokens_used": 42,
    "response_time_ms": 234
  },
  "created_at": "2026-10-29T10:30:00.000Z"
}
```

#### Error Responses

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | BadRequestException | "Message cannot be empty" | Empty or whitespace-only message |
| 400 | BadRequestException | "Message exceeds maximum length of 2000 characters" | Message > 2000 chars |
| 401 | Unauthorized | "Invalid token" | Missing or malformed JWT |
| 403 | ForbiddenException | "User does not have access to this session" | Non-participant accessing session |
| 404 | NotFoundException | "Session {id} not found" | Invalid session_id |
| 500 | InternalServerErrorException | "Failed to generate response" | LLM API failure, DB error |

---

### 2. Get Chat History

**GET /session/{sessionId}/history**

Retrieve all messages in a conversation, ordered by creation time (ascending).

#### Request

```http
GET /chat/session/550e8400-e29b-41d4-a716-446655440000/history HTTP/1.1
Authorization: Bearer <jwt_token>
```

| Query Parameter | Type | Required | Default | Constraints |
|-----------------|------|----------|---------|-------------|
| `limit` | integer | ❌ No | 50 | 1-100 |
| `offset` | integer | ❌ No | 0 | ≥ 0 (for pagination) |

#### Response (200 OK)

```json
{
  "messages": [
    {
      "id": "msg_001",
      "message": "What's your pricing?",
      "response": "Our prices vary by location...",
      "persona": {
        "persona_type": "RESEARCHER",
        "confidence": 0.72,
        "characteristics": ["Information-seeking", "Analytical", "Detail-oriented", "Long decision cycle"]
      },
      "created_at": "2026-10-29T10:00:00.000Z"
    },
    {
      "id": "msg_002",
      "message": "Can you compare to competitors?",
      "response": "Wapsell stands out in...",
      "persona": {
        "persona_type": "RESEARCHER",
        "confidence": 0.85,
        "characteristics": ["Information-seeking", "Analytical", "Detail-oriented", "Long decision cycle"]
      },
      "created_at": "2026-10-29T10:05:00.000Z"
    }
  ],
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_count": 2
}
```

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 401 | Unauthorized | "Invalid token" |
| 403 | ForbiddenException | "User does not have access to this session" |
| 404 | NotFoundException | "Session {sessionId} not found" |

---

### 3. Get Session Metadata

**GET /session/{sessionId}**

Retrieve metadata about a chat session.

#### Request

```http
GET /chat/session/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer <jwt_token>
```

#### Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-10-29T09:00:00.000Z",
  "updated_at": "2026-10-29T10:30:00.000Z",
  "message_count": 15
}
```

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 401 | Unauthorized | "Invalid token" |
| 403 | ForbiddenException | "User does not have access to this session" |
| 404 | NotFoundException | "Session {sessionId} not found" |

---

### 4. Delete Session

**DELETE /session/{sessionId}**

Delete a chat session and all its messages (soft-delete, preserves audit trail).

#### Request

```http
DELETE /chat/session/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer <jwt_token>
```

#### Response (200 OK)

```json
{
  "message": "Session deleted successfully",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "deleted_at": "2026-10-29T10:35:00.000Z"
}
```

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 401 | Unauthorized | "Invalid token" |
| 403 | ForbiddenException | "User does not have permission to delete this session" |
| 404 | NotFoundException | "Session {sessionId} not found" |

---

## Data Models

### Persona Enum

```typescript
enum BuyerPersona {
  RESEARCHER = "RESEARCHER",
  EARLY_ADOPTER = "EARLY_ADOPTER",
  DECISION_MAKER = "DECISION_MAKER",
  LATE_ADOPTER = "LATE_ADOPTER",
  SKEPTIC = "SKEPTIC",
  UNKNOWN = "UNKNOWN"
}
```

### PersonaMetadata

```typescript
interface PersonaMetadata {
  persona_type: BuyerPersona;
  confidence: number;        // 0 to 1
  characteristics: string[]; // 2-4 descriptive traits
}
```

### Message Type

```typescript
type MessagingMessageType = 'USER' | 'SYSTEM' | 'ASSISTANT';
```

---

## Persona Detection Reference

### Detection Algorithm

1. **Keyword Analysis**: Searches user message + history for persona-specific keywords
2. **Scoring**: Counts matches for each persona type
3. **Confidence**: Top score / total matches (0.5 minimum if insufficient data)
4. **Characteristics**: Returns 2-4 traits matching the detected persona

### Persona Definitions

#### RESEARCHER
- **Keywords**: "how", "what", "explain", "compare", "analysis", "detailed", "documentation"
- **Characteristics**: Information-seeking, Analytical, Detail-oriented, Long decision cycle
- **Behavior**: Asks clarifying questions, wants detailed comparisons, reads FAQs

#### EARLY_ADOPTER
- **Keywords**: "new", "latest", "cutting edge", "innovation", "beta", "first", "experimental"
- **Characteristics**: Innovation-focused, Risk-tolerant, Quick decision-maker, Trend-setter
- **Behavior**: Wants to be first, asks about unique features, willing to try beta

#### DECISION_MAKER
- **Keywords**: "roi", "investment", "cost", "pricing", "budget", "approval", "timeline", "team"
- **Characteristics**: Business-focused, Budget-conscious, Timeline-aware, Impact-focused
- **Behavior**: Asks about business outcomes, needs approval workflows, considers team impact

#### LATE_ADOPTER
- **Keywords**: "proven", "mature", "stable", "reliable", "support", "warranty", "established"
- **Characteristics**: Risk-averse, Stability-seeking, Support-dependent, Proven-solution focused
- **Behavior**: Asks about uptime guarantees, support SLAs, prefers established vendors

#### SKEPTIC
- **Keywords**: "issue", "problem", "broken", "complaint", "error", "doesn't work", "fail"
- **Characteristics**: Problem-focused, Critical thinker, Issue-oriented, Cautious
- **Behavior**: Reports bugs, skeptical about claims, wants proof of functionality

#### UNKNOWN
- **Keywords**: None match significantly
- **Characteristics**: Not enough data, Context insufficient
- **Behavior**: First message, unclear intent

---

## Conversation Model

### Conversation (Database)

```sql
CREATE TABLE Conversation (
  id UUID PRIMARY KEY,
  businessId UUID NOT NULL REFERENCES Empresa(id),
  type VARCHAR NOT NULL CHECK (type IN ('BUYER_SUPPORT', 'INTERNAL', 'SALES')),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  deletedAt TIMESTAMP NULL,
  FOREIGN KEY(businessId) REFERENCES Empresa(id)
);
```

### Message (Database)

```sql
CREATE TABLE Message (
  id UUID PRIMARY KEY,
  conversationId UUID NOT NULL REFERENCES Conversation(id),
  businessId UUID NOT NULL REFERENCES Empresa(id),
  authorUserId UUID NULL,
  type VARCHAR NOT NULL CHECK (type IN ('USER', 'SYSTEM', 'ASSISTANT')),
  content TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  deletedAt TIMESTAMP NULL,
  FOREIGN KEY(conversationId, businessId) REFERENCES Conversation(id, businessId),
  INDEX(conversationId, createdAt),
  INDEX(authorUserId),
  UNIQUE(conversationId, createdAt)
);
```

---

## Rate Limiting

Currently not enforced, but recommended to add per-user limits:

- **POST /message**: 100 messages per hour per user
- **GET /session/*/history**: 1000 requests per hour per user
- **DELETE /session/***: 10 deletes per hour per user

---

## Webhooks (Future)

Not yet implemented. Future versions may emit:

- `chat.message.received` - When a new message arrives
- `chat.persona.detected` - When persona is identified
- `chat.session.deleted` - When session is deleted

---

## SDK/Client Integration Examples

### JavaScript/TypeScript

```typescript
import { ChatClient } from '@wapsell/chat-sdk';

const client = new ChatClient({
  apiUrl: 'https://api.wapsell.local',
  token: '<jwt_token>'
});

// Send message
const response = await client.sendMessage({
  message: 'What properties do you have?',
  session_id: sessionId
});

console.log(response.persona.persona_type); // "RESEARCHER"

// Get history
const history = await client.getHistory(sessionId, { limit: 20 });

// Delete session
await client.deleteSession(sessionId);
```

### cURL

```bash
# Send message
curl -X POST https://api.wapsell.local/chat/message \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me about properties",
    "user_context": { "location": "NYC" }
  }'

# Get history
curl -X GET "https://api.wapsell.local/chat/session/$SESSION_ID/history?limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Delete session
curl -X DELETE https://api.wapsell.local/chat/session/$SESSION_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Versioning

Current API version: **v1**

Future versions may introduce:
- Streaming responses (`Content-Type: text/event-stream`)
- WebSocket support for real-time conversations
- RAG context injection from property knowledge base
- Custom prompt templates per domain

---

## Support & SLA

- **Availability Target**: 99.9% uptime
- **Response Time**: < 500ms for 95th percentile
- **Support**: Async via GitHub Issues, Slack for critical incidents
- **Breaking Changes**: Will be introduced in new major versions (v2, v3, etc.)

---

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: User can only access own sessions
3. **Data Privacy**: No sensitive data (PII) should be passed in user_context
4. **Logging**: Message content logged only to debug level
5. **Rate Limiting**: (TODO) Implement per-user quotas
6. **Input Validation**: All inputs sanitized, max lengths enforced

---

## Compliance

- **GDPR**: Messages stored with soft-delete for audit trail (can be permanently purged after 30 days if requested)
- **SOC2**: API logs access and responses for audit purposes
- **PCI DSS**: No payment card data should be sent to chat endpoints

---

## Changelog

### v1.0.0 (2026-10-29)

**Initial Release**

Features:
- POST /chat/message - Send message with persona detection
- GET /chat/session/{id} - Get session metadata
- GET /chat/session/{id}/history - Retrieve conversation history
- DELETE /chat/session/{id} - Delete session
- 6 buyer personas with confidence scoring
- Mock LLM integration (gpt-3.5-turbo compatible)
- Unit + E2E tests
- Swagger documentation

Limitations:
- No streaming responses yet
- No RAG/knowledge base integration
- No custom prompt templates
- Mock LLM responses (not connected to real OpenAI/Claude)

Future:
- Real LLM integration (OpenAI, Claude, local models)
- Streaming responses over WebSocket
- RAG context from property knowledge base
- Custom prompt templates
- Analytics dashboard
