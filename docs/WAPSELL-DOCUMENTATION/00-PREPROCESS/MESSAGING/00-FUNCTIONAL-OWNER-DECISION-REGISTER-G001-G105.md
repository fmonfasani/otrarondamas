# WAPSELL — MESSAGING MVP — FUNCTIONAL OWNER DECISION REGISTER

**Document type:** Business / functional decision traceability  
**Status:** APPROVED — OWNER DECISIONS  
**Scope:** Messaging MVP  
**Purpose:** Preserve the 105 functional business decisions established for Wapsell Messaging so the origin, scope and rationale of the MVP can be reconstructed in the future.

> This document records the approved functional decisions. It does not by itself authorize implementation. Technical design, contracts, invariants, tests/evals, plan and implementation remain separate artifacts.

## 1. Decision set

| ID | Approved business decision |
|---|---|
| G1 | Messaging MVP includes 1:1 conversations, text, history, read/unread, images/files, voice, association with Customer/Order/Sale, realtime, notifications, groups/multiple participants. |
| G2 | Both Customer and authorized Business members can initiate conversations. |
| G3 | Any participant can add other participants to a group. |
| G4 | Any participant can leave a group. |
| G5 | If the creator leaves, administration passes to the second participant according to historical joining order. |
| G6 | The administrator can transfer administration to any participant. |
| G7 | The administrator can expel a participant. |
| G8 | An expelled participant can re-enter if any participant adds them again. |
| G9 | The administrator can delete a group conversation for everyone. |
| G10 | A deleted group conversation becomes completely inaccessible to users. |
| G11 | The author can delete their message for everyone. |
| G12 | A deleted message is hidden from users but retained internally for audit. |
| G13 | Message deletion is available to the author, administrator or Owner. |
| G14 | The author can edit a message for everyone. |
| G15 | An edited message is visibly marked as edited; previous content is not shown to users. |
| G16 | Only text messages are editable. |
| G17 | Deleting a message with an attachment removes it from the user view while retaining it internally. |
| G18 | Any participant can reply to messages. |
| G19 | Any participant can react to messages. |
| G20 | Reactions can use any emoji. |
| G21 | Participants are notified of new activity except when notifications are muted. |
| G22 | Muting removes notifications only; messages continue to arrive and unread state continues. |
| G23 | Messaging exposes online/offline status and last connection. |
| G24 | Messaging exposes a typing indicator. |
| G25 | Message delivery states are sent → delivered → read. |
| G26 | A user can disable read receipts. |
| G27 | When read receipts are disabled, the user's own reads are hidden from others while the user can still see others' read states. |
| G28 | A user can archive a conversation individually. |
| G29 | An archived conversation remains archived when a new message arrives, with an indicator of new activity. |
| G30 | A user can pin a conversation individually. |
| G31 | Users can search conversations and message text. |
| G32 | Users can perform global search across conversations they can access. |
| G33 | Search supports filters by date, participant, conversation and content type. |
| G34 | Search content filters include text, images and files; voice is excluded. |
| G35 | Any participant can forward content to an accessible conversation. |
| G36 | Forwarded content is visibly indicated and preserves the original author identity. |
| G37 | A deleted message cannot be forwarded. |
| G38 | Any participant with access can download images/files available in the conversation. |
| G39 | Compatible files provide a preview and download capability. |
| G40 | Maximum file size is 25 MB per file. |
| G41 | Files over 25 MB are rejected. |
| G42 | No automatic compression is required. |
| G43 | File downloads are logged with user and datetime. |
| G44 | Leaving a group removes access to all of its messages/files. |
| G45 | Re-added participants see only messages/files from their new entry onward. |
| G46 | Blocking a 1:1 participant prevents new messages. |
| G47 | Existing 1:1 history remains after blocking. |
| G48 | Unblocking restores messaging in the same conversation. |
| G49 | Group blocking affects only the 1:1 relationship; it does not block the group itself. |
| G50 | No separate business rule was recorded under G50 in the approved decision set. |
| G51 | A conversation can be associated with Customer, Order, Sale, Product and Purchase. |
| G52 | Multiple entity associations can coexist in the same conversation. |
| G53 | Conversation access does not grant access to an associated business entity. |
| G54 | If a user lacks access to an associated entity, the association is shown as restricted/no access. |
| G55 | Association management is performed by the system and/or authorized users; exact permission mechanics remain technical. |
| G56 | Starting a conversation from an entity automatically creates the corresponding association. |
| G57 | Creating an Order/Sale from a Customer-associated conversation adds the corresponding association. |
| G58 | An explicit commercial Product interaction automatically creates the Product association. |
| G59 | An explicit Product interaction means selecting, consulting or adding the Product to an Order; merely viewing it does not count. |
| G60 | A Purchase is automatically associated when created from relevant context or explicit interaction. |
| G61 | An association remains when its entity is canceled or reaches a terminal state; its current status is shown. |
| G62 | Corrected or removed associations preserve the old association as historical/inactive and traceable. |
| G63 | Historical associations are not part of the normal view; they are available through history/audit. |
| G64 | Audit records user, datetime, action, previous value, new value and reason when applicable. |
| G65 | Conversations are isolated per Business; a conversation belongs to exactly one Business. |
| G66 | Conversations are private between their participants within the same Business. |
| G67 | Owner/Admin can access any conversation of the Business. |
| G68 | Normal Owner/Admin access does not require an additional audit event merely because they used their ordinary permission. |
| G69 | Other roles can access only conversations in which they participate, subject to applicable authorization. |
| G70 | A newly added participant sees messages/files from the point of joining onward. |
| G71 | Rejoining does not recover messages/files from the previous participation period. |
| G72 | Participant history records join, leave, expulsion and rejoin events. |
| G73 | Messages from before an expulsion remain retained. |
| G74 | Historical messages retain the original participant identity/name. |
| G75 | Voluntary leave and expulsion are distinguished. |
| G76 | System events expose participant changes such as “X se unió”, “X abandonó” and “X fue eliminado”. |
| G77 | Any participant can add another participant. |
| G78 | Any participant can re-add a former participant. |
| G79 | A group has a maximum of 50 participants. |
| G80 | No participant can be added when the group has reached 50 participants. |
| G81 | A participant slot becomes available immediately after a participant leaves. |
| G82 | A group can remain active with only one participant. |
| G83 | The sole remaining participant can add another participant. |
| G84 | Voice can be recorded and sent directly; it cannot be edited and can be deleted. |
| G85 | Maximum voice message duration is 2 minutes. |
| G86 | Voice uses a fixed functional format. |
| G87 | Voice format is MP3. |
| G88 | Voice quality prioritizes fidelity. |
| G89 | Before sending voice, the user can cancel or preview it. |
| G90 | Voice playback supports play/pause, forward/back and volume. |
| G91 | Voice playback supports 1x, 1.5x and 2x speed. |
| G92 | Images are shown inline and can be expanded/downloaded. |
| G93 | Multiple images can be sent. |
| G94 | Maximum images per message is 5. |
| G95 | Maximum image size is 5 MB per image. |
| G96 | Images over 5 MB are rejected. |
| G97 | Supported image formats are JPG/JPEG/PNG/WEBP/GIF. |
| G98 | Animated GIFs autoplay. |
| G99 | External URLs can receive automatic link previews when metadata is available. |
| G100 | External previews follow security constraints and do not permit active external execution. |
| G101 | Internal Wapsell links provide contextual previews subject to permissions. |
| G102 | Internal entity previews cover Customer, Order, Sale, Product and Purchase. |
| G103 | Internal previews expose a summary of key entity data. |
| G104 | Clicking an internal entity preview opens the corresponding entity. |
| G105 | Entity association state supports close/reconciliation after the relevant commercial interaction or operation. |

## 2. Reconciliation notes

- G10 is a functional user-facing deletion rule. G12, G17 and G64 establish that internal audit retention can remain even when content is inaccessible to users.
- G62 and G63 establish that corrected/removed associations remain historically traceable without appearing in the normal association view.
- Technical mechanisms for authorization, storage, audit retention, realtime, search, notification delivery and entity association are specified separately.
- The functional decision set does not approve database table names, Prisma models, endpoint names, event names, storage engines, queue providers or other physical implementation details.
- G50 is preserved explicitly as an unassigned slot because the approved decision pack enumerated G1–G49 and G51–G105. No business rule has been invented for G50.

## 3. Relationship to the technical process

FUNCTIONAL DECISIONS
→ SPECIALIZED SPEC
→ CONTRACTS
→ INVARIANTS
→ TESTS/EVALS
→ IMPLEMENTATION PLAN
→ TASKS
→ TECHNICAL DECISIONS
→ IMPLEMENTATION
→ VALIDATION

The functional decisions remain distinct from later technical decisions.

## 4. Evidence / provenance

**Source:** Approved Wapsell Messaging MVP Owner Decision Pack established during the project design process and subsequently used as the basis for MSG-001 through MSG-006.

**Classification:** DOCUMENTED / OWNER-APPROVED FUNCTIONAL DECISIONS.

**Persistence purpose:** Historical traceability. This file is intentionally stored under 00-PREPROCESS so that future maintainers can reconstruct the business decisions that preceded the technical specifications and eventual final module SPEC.
