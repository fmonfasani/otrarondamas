# Chat Module - NestJS RAG Endpoints

## Overview

The Chat Module provides AI-powered conversation endpoints for Wapsell, migrating from FastAPI to NestJS. It includes:

- Real-time message processing with LLM integration
- Automatic buyer persona detection
- Conversation history retrieval
- Session management with soft-delete

## Architecture

```
chat.module.ts       ← Module definition
├── chat.controller  ← HTTP endpoints
├── chat.service     ← Business logic
└── persona-detector ← ML-based persona classification
```

## API Endpoints

### 1. POST /chat/message

Send a message to the AI assistant and receive a response.

**Request:**
```json
{
  "message": "How much does this property cost?",
  "session_id": "uuid-optional",
  "user_context": { "property_id": "123" }
}
```

**Response (200 OK):**
```json
{
  "id": "msg_12345",
  "session_id": "uuid",
  "response": "Our properties range from $50K to $500K...",
  "user_message": "How much does this property cost?",
  "persona": {
    "persona_type": "DECISION_MAKER",
    "confidence": 0.85,
    "characteristics": ["Business-focused", "Budget-conscious", "Timeline-aware"]
  },
  "metadata": {
    "model": "gpt-3.5-turbo",
    "tokens_used": 45,
    "response_time_ms": 234
  },
  "created_at": "2026-10-29T10:30:00Z"
}
```

**Error Responses:**
- `400` - Empty message or exceeds 2000 characters
- `401` - Unauthorized (missing/invalid JWT)
- `500` - LLM failure or database error

---

### 2. GET /chat/session/:sessionId/history

Retrieve all messages in a conversation.

**Query Parameters:**
- `limit` (optional, default: 50) - Maximum messages to return

**Response (200 OK):**
```json
{
  "messages": [
    {
      "id": "msg_1",
      "message": "What's the price?",
      "response": "Our prices vary...",
      "persona": {
        "persona_type": "RESEARCHER",
        "confidence": 0.72,
        "characteristics": ["Information-seeking", "Analytical", "Detail-oriented"]
      },
      "created_at": "2026-10-29T10:00:00Z"
    }
  ],
  "session_id": "uuid",
  "total_count": 15
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - User does not have access to this session
- `404` - Session not found

---

### 3. GET /chat/session/:sessionId

Get session metadata.

**Response (200 OK):**
```json
{
  "id": "uuid",
  "created_at": "2026-10-29T09:00:00Z",
  "updated_at": "2026-10-29T10:30:00Z",
  "message_count": 15
}
```

---

### 4. DELETE /chat/session/:sessionId

Delete a chat session (soft-delete).

**Response (200 OK):**
```json
{
  "message": "Session deleted successfully",
  "session_id": "uuid",
  "deleted_at": "2026-10-29T10:35:00Z"
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - User does not own this session
- `404` - Session not found

---

## Buyer Personas

The system automatically detects one of six buyer personas based on message content:

| Persona | Keywords | Characteristics |
|---------|----------|-----------------|
| **RESEARCHER** | "how", "compare", "explain", "analysis", "detailed" | Information-seeking, analytical, detail-oriented |
| **EARLY_ADOPTER** | "new", "latest", "innovation", "beta", "cutting edge" | Innovation-focused, risk-tolerant, quick decision-maker |
| **DECISION_MAKER** | "roi", "budget", "business case", "approval", "timeline" | Business-focused, budget-conscious, impact-oriented |
| **LATE_ADOPTER** | "proven", "stable", "reliable", "support", "warranty" | Risk-averse, stability-seeking, support-dependent |
| **SKEPTIC** | "issue", "problem", "broken", "complaint", "error" | Problem-focused, critical thinker, cautious |
| **UNKNOWN** | (insufficient data) | Not enough context |

### Persona Detection Algorithm

1. Analyzes message content and conversation history
2. Scores each persona by keyword frequency
3. Returns top persona with confidence score (0-1)
4. Includes relevant characteristics for persona type

Example:
```typescript
const result = detector.detectPersona(
  "Can you compare this to competitors?",
  history // previous messages
);
// Result: { persona_type: 'RESEARCHER', confidence: 0.85, characteristics: [...] }
```

---

## Database Schema

### Conversation Model (existing)
```prisma
model Conversation {
  id          String   @id @default(uuid())
  businessId  String
  type        MessagingConversationType
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  Message     Message[]
  // ... relationships
}
```

### Message Model (existing)
```prisma
model Message {
  id              String   @id @default(uuid())
  conversationId  String
  businessId      String
  authorUserId    String?
  type            MessagingMessageType  // USER, SYSTEM, ASSISTANT
  content         String?
  createdAt       DateTime @default(now())
  deletedAt       DateTime?
  // ... relationships
}
```

---

## LLM Integration

### Current Implementation (MVP)

The chat service includes a **mock LLM** for development/testing. Replace the `getLLMResponse()` method in `ChatService` with your preferred LLM SDK:

**OpenAI Example (TODO):**
```typescript
import { OpenAI } from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await client.chat.completions.create({
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  max_tokens: 500,
  system_prompt: this.mockSystemPrompt,
  messages: [{ role: 'user', content: userMessage }],
});
```

**Claude Example (TODO):**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 500,
  temperature: 0.7,
  system: this.mockSystemPrompt,
  messages: [{ role: 'user', content: userMessage }],
});
```

### Environment Configuration

Add to `.env`:
```bash
# LLM Configuration
LLM_PROVIDER="openai"  # or "anthropic"
OPENAI_API_KEY="sk_test_..."
OPENAI_MODEL="gpt-3.5-turbo"
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-3-sonnet-20240229"
```

---

## Error Handling

### Standard Error Responses

All endpoints return errors in this format:

```json
{
  "statusCode": 400,
  "message": "Invalid request",
  "error": "BadRequestException"
}
```

### Error Codes

| Code | Scenario | Resolution |
|------|----------|-----------|
| 400 | Empty message / exceeds 2000 chars | Validate input before sending |
| 401 | Missing/invalid JWT | Include `Authorization: Bearer <token>` header |
| 403 | User not participant in session | User does not have access to this conversation |
| 404 | Session/conversation not found | Use valid session ID from POST /chat/message response |
| 500 | LLM failure / database error | Check logs; may be temporary |

---

## Testing

### Run Unit Tests

```bash
npm run test -- persona-detector.spec
npm run test -- chat.service.spec
```

### Run E2E Tests

```bash
npm run test:e2e -- chat.e2e-spec
```

### Test Coverage

```bash
npm run test:cov -- src/chat
```

---

## Example Usage

### 1. Send a Message

```bash
curl -X POST http://localhost:3000/chat/message \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How does your platform work?"
  }'
```

Response:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "response": "Wapsell helps buyers find properties...",
  "persona": { "persona_type": "RESEARCHER", "confidence": 0.8, ... },
  "metadata": { "model": "gpt-3.5-turbo", "response_time_ms": 145 }
}
```

### 2. Fetch Chat History

```bash
curl -X GET "http://localhost:3000/chat/session/550e8400-e29b-41d4-a716-446655440000/history" \
  -H "Authorization: Bearer <jwt_token>"
```

### 3. Delete a Session

```bash
curl -X DELETE "http://localhost:3000/chat/session/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <jwt_token>"
```

---

## Future Enhancements

- [ ] Real OpenAI/Claude SDK integration
- [ ] Streaming responses (SSE / WebSocket)
- [ ] Conversation summarization
- [ ] Context memory optimization
- [ ] Multi-language support
- [ ] Custom prompt templates per domain
- [ ] Rate limiting per user/session
- [ ] Analytics on persona distribution
- [ ] Fine-tuning models on Wapsell data
- [ ] Embedding-based RAG for property documents

---

## Security

- All endpoints require JWT authentication
- User access to sessions verified at every request
- Messages stored with soft-delete (audit trail preserved)
- No sensitive data logged (content is metadata-only)
- LLM API keys stored in environment variables

---

## Performance Notes

- Message processing: ~100-300ms (depends on LLM)
- History queries optimized with indexes on `conversationId`, `createdAt`
- Pagination recommended for conversations with 1000+ messages
- Persona detection runs in-memory (O(1) lookups)

---

## Contact & Support

For issues or questions about the Chat module, contact the Wapsell backend team.
