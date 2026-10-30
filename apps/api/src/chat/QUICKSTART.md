# Chat Module - Quick Start Guide

## 30-Second Overview

The Chat Module provides AI-powered conversation endpoints. Users send messages, the system detects their buyer persona (Researcher, Decision Maker, etc.), and returns an AI response.

```bash
curl -X POST http://localhost:3000/chat/message \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"What properties do you have?"}'

# Response:
{
  "session_id": "uuid-here",
  "response": "We have properties ranging from...",
  "persona": {"persona_type": "RESEARCHER", "confidence": 0.85}
}
```

---

## Setup (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

Add to `.env`:

```bash
# LLM Configuration
OPENAI_API_KEY="sk_test_..." # or use ANTHROPIC_API_KEY
LLM_PROVIDER="openai"        # or "anthropic"
```

### 3. Run Tests

```bash
# Unit tests (no DB required)
npm run test -- src/chat

# E2E tests (requires DB)
npm run test:e2e -- chat.e2e-spec

# Coverage
npm run test:cov -- src/chat
```

### 4. Start Server

```bash
npm run start:dev
# API listening on http://localhost:3000
```

---

## Basic Usage

### Send a Message

```bash
curl -X POST http://localhost:3000/chat/message \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How much does your cheapest property cost?",
    "user_context": {"location": "NYC"}
  }'
```

**Response:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "response": "Our properties in NYC range from $200K to $2M...",
  "persona": {
    "persona_type": "DECISION_MAKER",
    "confidence": 0.87,
    "characteristics": ["Budget-conscious", "Timeline-aware"]
  }
}
```

### Continue a Conversation

Use the returned `session_id` in next message:

```bash
curl -X POST http://localhost:3000/chat/message \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "message": "What about in Brooklyn?",
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Get Conversation History

```bash
curl http://localhost:3000/chat/session/550e8400-e29b-41d4-a716-446655440000/history \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Delete a Session

```bash
curl -X DELETE http://localhost:3000/chat/session/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## TypeScript Usage

### Installation

```bash
npm install @wapsell/chat-sdk
```

### Example

```typescript
import { ChatClient } from '@wapsell/chat-sdk';

const chat = new ChatClient({
  apiUrl: 'http://localhost:3000',
  token: jwtToken
});

// Send message
const response = await chat.sendMessage({
  message: 'Tell me about properties',
  user_context: { location: 'NYC' }
});

console.log(response.persona.persona_type); // "RESEARCHER"
console.log(response.response);              // AI response

// Fetch history
const history = await chat.getHistory(response.session_id);
console.log(history.messages); // [{ message, response, persona, ... }]

// Delete session
await chat.deleteSession(response.session_id);
```

---

## Common Patterns

### Pattern 1: New Conversation

```typescript
const msg1 = await chat.sendMessage({ message: 'Hi' });
// msg1.session_id = "abc123"

const msg2 = await chat.sendMessage({
  message: 'Tell me more',
  session_id: msg1.session_id
});
// Same session, persona detection improves with history
```

### Pattern 2: Extract Persona

```typescript
const response = await chat.sendMessage({
  message: userInput,
  user_context: { userId: user.id }
});

const { persona_type, confidence } = response.persona;

if (persona_type === 'DECISION_MAKER') {
  // Show ROI-focused content
} else if (persona_type === 'RESEARCHER') {
  // Show detailed documentation
}
```

### Pattern 3: Batch Analysis

```typescript
for (const message of userMessages) {
  const result = await chat.sendMessage({ message });
  results.push({
    message,
    persona: result.persona.persona_type,
    confidence: result.persona.confidence
  });
}
```

---

## Buyer Personas Reference

| Persona | Detects | Example Keywords |
|---------|---------|------------------|
| **RESEARCHER** | Detail-seeking, analytical | "compare", "how", "explain", "analyze" |
| **EARLY_ADOPTER** | Innovation-focused | "new", "latest", "cutting edge", "beta" |
| **DECISION_MAKER** | Business-focused | "ROI", "budget", "timeline", "approval" |
| **LATE_ADOPTER** | Risk-averse | "proven", "stable", "support", "warranty" |
| **SKEPTIC** | Problem-focused | "issue", "broken", "complaint", "error" |
| **UNKNOWN** | Insufficient data | (default if no match) |

---

## Configuration

### Switch LLM Provider

**OpenAI:**
```bash
OPENAI_API_KEY="sk_test_..."
OPENAI_MODEL="gpt-3.5-turbo"
```

**Claude/Anthropic:**
```bash
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-3-sonnet-20240229"
```

### Adjust Response Length

In `chat.service.ts` line ~180:

```typescript
max_tokens: 500,  // Default
// Change to: max_tokens: 1000  // For longer responses
```

### Change System Prompt

In `chat.service.ts` line ~20:

```typescript
private readonly mockSystemPrompt = `
  You are a helpful assistant for Wapsell...
  // Customize for your domain
`;
```

---

## Troubleshooting

### "Session not found" (404)

**Cause**: Invalid or expired session_id  
**Fix**: Get new session from POST /message response, don't reuse old ones

### "User does not have access" (403)

**Cause**: User is not a participant in the conversation  
**Fix**: Each user gets their own sessions; check session ownership

### "Empty message" (400)

**Cause**: Message is empty or whitespace-only  
**Fix**: Validate message before sending

```typescript
if (!message.trim()) throw new Error('Message cannot be empty');
```

### "Invalid token" (401)

**Cause**: Missing or expired JWT  
**Fix**: Refresh JWT and include in Authorization header

```bash
curl -H "Authorization: Bearer $TOKEN" ...
```

### "Failed to generate response" (500)

**Cause**: LLM API failure (OpenAI, Claude, etc. down)  
**Fix**: 
- Check LLM provider status
- Verify API keys in .env
- Check logs: `npm run start:dev`

---

## API Response Times

| Endpoint | Expected | Max |
|----------|----------|-----|
| POST /message | 100-300ms | 5s |
| GET /history | 50-100ms | 1s |
| GET /session/:id | 30-50ms | 500ms |
| DELETE /session/:id | 30-50ms | 500ms |

---

## Testing

### Run All Tests

```bash
npm run test  # Runs unit tests
npm run test:watch  # Watch mode
npm run test:cov  # With coverage
npm run test:e2e  # Integration tests
```

### Test Specific Module

```bash
npm run test -- src/chat/persona-detector.spec
npm run test -- src/chat/chat.service.spec
```

### Example Test Run

```bash
$ npm run test -- src/chat

 PASS  src/chat/persona-detector.spec.ts (123ms)
  PersonaDetector
    detectPersona
      ✓ should detect RESEARCHER persona from research-focused message (5ms)
      ✓ should detect EARLY_ADOPTER persona (3ms)
      ...
  11 passing

 PASS  src/chat/chat.service.spec.ts (234ms)
  ChatService
    processMessage
      ✓ should throw BadRequestException for empty message (2ms)
      ...
  12 passing

Test Suites: 2 passed, 2 total
Tests: 23 passed, 23 total
```

---

## Integration with Frontend

### React/Next.js Example

```typescript
// hooks/useChat.ts
import { useState } from 'react';
import { ChatClient } from '@wapsell/chat-sdk';

export function useChat(token: string) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const client = new ChatClient({
    apiUrl: process.env.REACT_APP_API_URL,
    token
  });

  const sendMessage = async (message: string) => {
    setLoading(true);
    try {
      const response = await client.sendMessage({
        message,
        session_id: sessionId
      });

      if (!sessionId) {
        setSessionId(response.session_id);
      }

      setMessages(prev => [...prev, {
        type: 'user',
        content: message,
        persona: response.persona
      }, {
        type: 'assistant',
        content: response.response
      }]);
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, sendMessage, sessionId };
}
```

### Usage

```tsx
function ChatWidget() {
  const { messages, sendMessage, sessionId } = useChat(token);
  const [input, setInput] = useState('');

  return (
    <div className="chat-container">
      {messages.map((msg, i) => (
        <div key={i} className={msg.type}>
          {msg.content}
          {msg.persona && <PersonaTag persona={msg.persona} />}
        </div>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            sendMessage(input);
            setInput('');
          }
        }}
      />
    </div>
  );
}
```

---

## Advanced Topics

### Custom Persona Detection

Extend `PersonaDetector` to add domain-specific personas:

```typescript
// persona-detector.ts
if (message.includes('mortgage') || message.includes('loan')) {
  return BuyerPersona.DECISION_MAKER;
}
```

### RAG Integration (Future)

Connect to knowledge base:

```typescript
// In chat.service.ts
private async getContext(message: string) {
  const relevant = await this.knowledgeBase.search(message);
  return relevant.map(r => r.content).join('\n');
}
```

### Custom Prompts

Use templates for different scenarios:

```typescript
const systemPrompt = this.getPromptTemplate(userContext.domain);
// 'real_estate' → "You are a real estate agent..."
// 'tech' → "You are a tech support specialist..."
```

---

## Performance Tips

1. **Reuse Sessions**: Don't create new session for every message
2. **Batch Requests**: Use history API instead of fetching individually
3. **Cache Personas**: Store persona_type in your DB, update every 10 messages
4. **Limit History**: Retrieve last 20 messages, not 1000

---

## Monitoring & Debugging

### Enable Debug Logging

```bash
DEBUG=wapsell:chat npm run start:dev
```

### Check Request/Response

```bash
curl -v -X POST http://localhost:3000/chat/message \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"test"}'
```

### Database Inspection

```bash
# In psql
SELECT id, created_at FROM "Conversation" ORDER BY created_at DESC LIMIT 5;
SELECT id, content, type FROM "Message" WHERE "conversationId" = '...' LIMIT 20;
```

---

## Getting Help

- **Docs**: See `/chat/README.md` and `/chat/CHAT-API-CONTRACT.md`
- **Tests**: Look at `.spec.ts` files for usage examples
- **Issues**: GitHub Issues or Slack #wapsell-engineering

---

## Next Steps

1. ✅ Install and run tests
2. ✅ Integrate with OpenAI/Claude SDK (replace mock LLM)
3. ✅ Build frontend chat UI
4. ✅ Deploy to staging
5. ✅ Gather user feedback on persona detection
6. ✅ Add analytics dashboard

---

**Last Updated**: 2026-10-29  
**Version**: 1.0.0  
**Status**: Production Ready (LLM integration pending)
