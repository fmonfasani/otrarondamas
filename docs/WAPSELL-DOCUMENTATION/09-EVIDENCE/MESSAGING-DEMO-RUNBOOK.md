# Wapsell Messaging Demo — Runbook

## Scope and evidence boundary

This runbook covers the existing admin entrypoint at `/messaging`, authenticated HTTP endpoints under `/messaging/conversations`, and the optional Socket.IO namespace `/messaging`.

A successful build or CI unit suite is not a browser end-to-end result. Record the exact commit SHA, environment, commands, HTTP responses, and browser observations when running this procedure. Do not claim realtime is working merely because the HTTP send succeeds.

## Prerequisites

- Node.js 24 and npm, matching the repository CI baseline.
- PostgreSQL configured using the repository's existing local environment.
- Existing database schema and demo user/customer data prepared through the project's established setup procedure.
- API and admin frontend running locally.
- A user with a valid active Membership in the intended Business.
- No production database or production credentials.

Do not run schema changes or migrations as part of this demo procedure. If the local database is not already prepared, stop and use the repository's approved environment setup.

## Start the application

From the repository root:

```bash
npm ci
npm run prisma:generate --workspace=@otrarondamas/api
npm run build --workspace=@otrarondamas/api
npm run build --workspace=@otrarondamas/pos-admin
npm run start:dev --workspace=@otrarondamas/api
```

In a second terminal:

```bash
npm run dev --workspace=@otrarondamas/pos-admin
```

The API defaults to `http://localhost:3000`. Vite normally serves the admin app at `http://localhost:5173`. If the frontend uses another API address, configure `VITE_API_URL` for the admin workspace and restart Vite. The API's default CORS origins include ports 5173 and 5174; if using another port, configure `CORS_ORIGINS` explicitly.

## Happy-path browser check

1. Open the admin app and authenticate through the existing login flow. Do not insert tokens manually or bypass the existing auth path.
2. Open **Mensajería** from the existing navigation, or navigate to `/messaging`.
3. Confirm that the conversation list loads. A loading, empty, or error state must be visible rather than a false success.
4. Select an existing customer and choose **Crear conversación**.
5. Confirm that the newly created conversation appears and becomes selected.
6. Confirm that its history loads from the API.
7. Send a short message and verify it appears in the conversation after the HTTP request completes.
8. Refresh the page, select the same conversation, and verify the message remains in the server-provided history.
9. Switch between two conversations and verify that messages from the previously selected conversation are not displayed while the new history is loading.
10. Record the exact SHA and observed result for every step.

## HTTP contract for diagnosis

With a valid access token from the normal login flow:

- `GET /messaging/conversations` — list conversations visible to the authenticated actor.
- `POST /messaging/conversations` — create a conversation. The UI uses `{ "type": "DIRECT", "participantCustomerIds": ["<customer-uuid>"] }`.
- `GET /messaging/conversations/:id/messages` — retrieve the selected conversation history.
- `POST /messaging/conversations/:id/messages` — send `{ "clientMessageId": "<unique-string>", "content": "Mensaje de prueba" }`.

Use the `Authorization: Bearer <access-token>` header and the same Business context resolved by the existing Membership/BusinessContext implementation. Do not treat the legacy `empresaId` JWT claim as the tenant authority.

## Tenant-boundary check

Using two test users with active Memberships in different Businesses:

1. Authenticate as a member of Business A and create/open a conversation in A.
2. Authenticate as a member of Business B and attempt to fetch that conversation by its ID.
3. Verify that the request fails closed and does not disclose the conversation or its messages.
4. If a Membership is suspended/revoked, verify the applicable existing revocation behavior using the approved test procedure.
5. Never use production users or data for this check.

Record actual HTTP status and response. Do not infer these outcomes from a unit test or from the UI hiding an item.

## Realtime is a separate check

The UI attempts to connect to Socket.IO at `<API_BASE_URL>/messaging`, authenticates using the existing access token, and requests `conversation.join` with `{ "conversationId": "<id>" }`.

Only mark realtime verified if two independently authenticated browser clients are connected, an authorized participant has joined the same conversation, a message is sent, and the second client observes the corresponding `message.created` event. Also verify that an unauthorized/cross-Business join is rejected. If this is not executed, record realtime as **NOT DETERMINABLE** and demonstrate HTTP refresh/history as the supported fallback.

## Result record

- Commit SHA:
- Environment / API URL / frontend URL:
- Authenticated Business (test fixture only):
- Create conversation:
- Load history:
- Send and persist message:
- Reload and retrieve message:
- Cross-Business denial:
- Membership revocation:
- Realtime event:
- Failures / logs:
- Final classification: VERIFIED BY CODE / VERIFIED BY TEST / VERIFIED BY EXECUTION / VERIFIED BY CI / NOT DETERMINABLE

Do not mark the parent demo issue closed or the demo Gate PASS without the corresponding end-to-end evidence and required review.
