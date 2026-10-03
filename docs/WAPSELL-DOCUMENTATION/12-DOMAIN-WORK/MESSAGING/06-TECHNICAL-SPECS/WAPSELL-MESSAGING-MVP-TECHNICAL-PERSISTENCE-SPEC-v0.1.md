# WAPSELL — MESSAGING MVP
## Technical Specification — Persistence Baseline v0.1

**Task:** TASK-MSG-001  
**Estado:** DRAFT — PROPOSED FOR APPROVAL  
**SPEC:** APPROVED  
**CONTRACTS:** APPROVED  
**INVARIANTS:** APPROVED  
**Tests/Evals:** APPROVED  
**Implementación:** NO AUTORIZADA  
**Repositorio inspeccionado:** `fmonfasani/otrarondamas` — branch `main`  
**Fecha:** 2026-10-01

---

# 1. Evidence First

Esta baseline se construye después de inspeccionar el repositorio real.

### VERIFICADO POR CÓDIGO

El `schema.prisma` actual contiene:

- `Empresa` como raíz actual del aislamiento;
- `Usuario` ligado directamente a `Empresa` mediante `empresaId`;
- `Usuario.email` globalmente `@unique`;
- `Permiso` + `UsuarioPermiso`;
- entidades comerciales como `Cliente`, `Producto`, `Pedido`, `Venta`, `Compra`;
- `AuditLog`;
- modelos de `Entrega` y otros modelos operativos.

No existen en el schema actual modelos de:

- Conversation;
- Message;
- Participant de Messaging;
- Attachment de Messaging;
- Reaction;
- Reply;
- Commercial Association de Messaging.

El README del repositorio declara explícitamente que Mensajería/Conversaciones no están implementadas y que la plataforma multi-negocio Wapsell todavía es objetivo de transformación, no funcionalidad existente.

Por lo tanto, esta baseline NO trata Messaging como una extensión de un módulo ya existente.

**Fuentes verificadas:**

- `apps/api/prisma/schema.prisma`
- `README.md`
- `apps/api/src/auth/auth.google.service.ts`

---

# 2. Objetivo

Definir una propuesta de persistencia para Messaging que permita cumplir:

- Business isolation;
- Conversation;
- Participants;
- Messages;
- Groups;
- Attachments;
- Voice;
- Reactions;
- Replies;
- Commercial Associations;
- auditabilidad;
- acceso temporal de participantes.

Esta especificación no ejecuta cambios en Prisma.

---

# 3. Principio de migración

El sistema actual utiliza:

```text
Empresa
  └── Usuario
```

El TO-BE aprobado establece:

```text
User
  └── Membership
        └── Business
```

Customer permanece conceptualmente independiente de User.

Por lo tanto, Messaging NO debe tomar `Usuario.empresaId` como modelo definitivo de Wapsell.

La implementación futura debe integrarse con el modelo de identidad/tenancy aprobado para Wapsell.

---

# 4. Proposed Logical Model

El modelo lógico propuesto es:

```text
Business
   │
   └── Conversation
          │
          ├── ConversationParticipant
          │       └── User / Customer identity context
          │
          └── Message
                  │
                  ├── MessageAttachment
                  ├── MessageReaction
                  └── MessageReference / Reply

Conversation
   │
   └── ConversationAssociation
           ├── Customer
           ├── Order
           ├── Sale
           ├── Product
           └── Purchase
```

Esto es un modelo lógico.

No constituye todavía un Prisma schema aprobado.

---

# 5. Conversation

## 5.1 Required conceptual attributes

Una Conversation necesita representar:

- identidad;
- Business propietario;
- tipo `1:1` o `GROUP`;
- estado funcional;
- fecha de creación;
- fecha de actualización;
- información necesaria para administración;
- eliminación funcional;
- trazabilidad.

## 5.2 Ownership

Debe existir una referencia inequívoca al Business.

### Invariant

`Conversation.Business == único Business`

No se permite relación cross-Business.

---

# 6. ConversationParticipant

La participación debe modelarse como entidad independiente de Conversation.

Debe permitir representar:

- Conversation;
- participante;
- incorporación;
- salida;
- expulsión;
- reingreso;
- estado actual;
- administración cuando corresponda.

## 6.1 Temporal access

La participación necesita conservar información temporal suficiente para determinar:

```text
joinedAt
leftAt / removedAt
```

La nomenclatura física exacta queda abierta.

## 6.2 Rejoin

Un reingreso no debe sobrescribir silenciosamente el historial anterior.

Debe ser posible distinguir:

```text
join #1
leave #1
join #2
```

Esto es necesario para cumplir INV-MSG-010, INV-MSG-011 e INV-MSG-012.

## 6.3 Admin

El estado de administrador puede estar representado en la participación activa.

No se fija todavía el nombre físico del campo.

---

# 7. Message

Message debe pertenecer a exactamente una Conversation.

Debe representar como mínimo:

- autor;
- contenido;
- tipo;
- timestamps;
- estado de entrega/lectura;
- edición;
- eliminación funcional;
- referencia a mensaje padre cuando sea reply;
- información necesaria para forwarding.

## 7.1 Message type

Valores funcionales:

```text
TEXT
IMAGE
FILE
VOICE
```

No se agregan otros tipos sin cambio de SPEC.

---

# 8. Message Lifecycle

El modelo debe poder representar:

```text
ENVIADO
ENTREGADO
LEÍDO
```

La Technical Specification de Realtime definirá posteriormente cómo se producen las transiciones.

La persistencia no debe permitir estados que contradigan el orden funcional aprobado.

---

# 9. Message Editing

Debe conservarse suficiente información para:

- conocer que el mensaje fue editado;
- mostrar el contenido actual.

No es requisito mostrar el contenido anterior al usuario.

La estrategia física para conservar versiones anteriores no está aprobada.

Por lo tanto:

**OPEN DETAIL:** versionado histórico de contenido.

---

# 10. Message Deletion

La eliminación funcional debe distinguirse de la destrucción física.

Se requiere una representación que permita:

```text
visible_to_users = false
```

sin asumir todavía una estrategia concreta de hard delete/soft delete.

La política de retención física será definida por TASK-MSG-007.

---

# 11. Reply

Una respuesta debe poder referenciar un mensaje de la misma Conversation.

### Invariant

Un reply no debe crear una referencia cross-Conversation.

---

# 12. Reaction

Las reacciones necesitan representar:

- mensaje;
- usuario;
- emoji;
- timestamp.

Debe impedirse una multiplicación accidental de la misma reacción si el comportamiento de producto posteriormente establece unicidad por usuario/emoji.

### OPEN DETAIL

La SPEC permite cualquier emoji disponible, pero no define todavía:

- si un usuario puede repetir el mismo emoji;
- si puede cambiarlo;
- si existe máximo de reacciones.

No se inventa aquí.

---

# 13. Attachments

Un Attachment debe poder asociarse a un Message.

Debe conservar como mínimo:

- tipo;
- nombre;
- tamaño;
- referencia al contenido almacenado;
- metadatos necesarios para preview;
- timestamps;
- estado de eliminación funcional cuando corresponda.

## Límites funcionales

### File

`<= 25 MB`

### Image

`<= 5 MB`

### Images per message

`<= 5`

No se fija todavía el modelo físico de storage.

---

# 14. Voice

Voice se representa como un tipo especializado de attachment/message.

Restricciones:

```text
format = MP3
duration <= 120 seconds
```

No se fija todavía:

- bitrate;
- sample rate;
- codec parameters;
- storage provider.

---

# 15. Commercial Association

Se requiere una entidad de asociación independiente para soportar múltiples asociaciones simultáneas.

Conceptualmente:

```text
ConversationAssociation
  Conversation
  Business
  EntityType
  EntityId
  active/current state
  createdAt
  changedBy
  reason
```

## 15.1 Supported entity types

Solo:

- Customer;
- Order;
- Sale;
- Product;
- Purchase.

## 15.2 Historical associations

Una asociación eliminada/corregida no debe perder trazabilidad.

La asociación histórica no aparece en vista normal, pero debe estar disponible para historial/auditoría.

## 15.3 Authorization

La asociación no concede acceso a la entidad.

---

# 16. Audit

La auditoría conceptual debe cubrir:

- participant join;
- participant leave;
- participant removal;
- participant rejoin;
- file download;
- association changes;
- deletion operations;
- otras acciones administrativas definidas posteriormente.

No se fija aquí si se reutiliza `AuditLog` actual o se crea un modelo específico.

### OPEN DETAIL

`AuditLog` existe actualmente en el repositorio, pero su reutilización para Messaging requiere evaluación de compatibilidad con el modelo Wapsell y con los requisitos de retención.

---

# 17. Business Isolation Strategy

La persistencia futura debe impedir:

```text
Conversation(A) → Message(B)
Conversation(A) → Participant autorizado solamente en B
Conversation(A) → Association(B)
```

La forma exacta de enforcement físico queda para TASK-MSG-004.

## Recomendación técnica propuesta

Siempre que sea necesario para garantizar aislamiento robusto, las relaciones críticas deberían permitir validar Business context en el límite de persistencia o de servicio.

Esto es una **PROPUESTA TÉCNICA**, no una decisión aprobada.

---

# 18. Current AS-IS Compatibility

El repositorio actual tiene:

```text
Empresa
Usuario.empresaId
Cliente.empresaId
Producto.empresaId
Pedido.empresaId
Venta.empresaId
Compra.empresaId
```

Messaging futuro debe poder convivir temporalmente con este AS-IS sin asumir que `Empresa` ya fue migrada físicamente a `Business`.

Esto es coherente con la decisión aprobada de transición incremental y coexistencia temporal acotada.

---

# 19. Identity Boundary

No se debe crear una segunda identidad paralela para Messaging.

La identidad futura debe integrarse con:

```text
User global
    ↓
Membership
    ↓
Business
```

Customer continúa siendo conceptualmente independiente y puede vincularse a User.

La resolución técnica de Customer ↔ User pertenece al modelo global de Identity/Tenancy, no debe duplicarse dentro de Messaging.

---

# 20. Proposed Constraints

Las siguientes constraints son necesarias conceptualmente:

### HARD

1. Conversation pertenece a un Business.
2. Message pertenece a una Conversation.
3. Participant pertenece a una Conversation.
4. Association pertenece a una Conversation.
5. Association no cruza Business.
6. Conversation no cruza Business.
7. Message no cruza Conversation.
8. Participant history no puede sobrescribirse silenciosamente.
9. Máximo 50 participantes activos.
10. Voice <= 120 segundos.
11. File <= 25 MB.
12. Image <= 5 MB.
13. Máximo 5 imágenes por mensaje.

La forma física de implementar estas constraints permanece abierta.

---

# 21. Indexing Requirements

No se fijan índices concretos todavía.

Sí se identifican consultas críticas que requerirán soporte:

- Conversation por Business;
- Conversations de Participant;
- Messages por Conversation;
- Messages por fecha;
- Attachments por Message;
- Associations por Conversation;
- Associations por entidad;
- Audit por Conversation/actor;
- búsqueda autorizada.

La estrategia concreta será parte de TASK-MSG-005.

---

# 22. Deletion Strategy

Se distinguen tres conceptos:

### Functional deletion

El usuario deja de ver el contenido.

### Historical/audit retention

La información necesaria para auditoría puede permanecer.

### Physical deletion

Destrucción física del dato.

Estos tres conceptos no deben confundirse.

La política física todavía no está aprobada.

---

# 23. Open Technical Decisions

Esta baseline NO cierra:

- nombres físicos de tablas;
- nombres físicos de columnas;
- UUID vs otro identificador;
- enums Prisma;
- soft delete;
- hard delete;
- versionado de mensajes;
- storage provider;
- CDN;
- signed URLs;
- realtime transport;
- search engine;
- audit implementation;
- retention period;
- notification provider;
- audio bitrate/sample rate.

---

# 24. Repository Impact — Preliminary

Según la inspección realizada, Messaging no existe actualmente.

Por lo tanto, una futura implementación afectará al menos conceptualmente:

- API/domain layer;
- Prisma schema/migrations;
- authorization;
- realtime;
- media storage;
- frontend(s);
- shared types/contracts;
- tests.

Los paths exactos no se declaran como Tasks hasta realizar el diseño técnico completo.

---

# 25. Evidence Status

| Afirmación | Evidencia |
|---|---|
| `Empresa` existe como raíz actual | VERIFIED BY CODE |
| `Usuario` tiene `empresaId` | VERIFIED BY CODE |
| `Usuario.email` es globalmente unique | VERIFIED BY CODE |
| `Permiso` + `UsuarioPermiso` existen | VERIFIED BY CODE |
| `Cliente`, `Pedido`, `Venta`, `Compra`, `Producto` existen | VERIFIED BY CODE |
| `AuditLog` existe | VERIFIED BY CODE |
| Conversation no existe actualmente | VERIFIED BY CODE |
| Messaging no está implementado | VERIFIED BY CODE / DOCUMENTED |
| Wapsell multi-tenant completo no está implementado | DOCUMENTED / VERIFIED BY CODE |
| Modelo físico futuro de Messaging | PROPOSED — NOT APPROVED |

---

# 26. Gate

**Estado:** DRAFT — PROPOSED FOR APPROVAL

Esta especificación completa conceptualmente TASK-MSG-001, pero no autoriza:

- schema change;
- migration;
- code;
- tests de implementación;
- commit;
- deploy.

Siguiente paso:

1. aprobar esta Persistence Baseline;
2. ejecutar TASK-MSG-002 — Realtime Architecture;
3. TASK-MSG-003 — Storage;
4. TASK-MSG-004 — Authorization Enforcement;
5. TASK-MSG-005 — Search;
6. TASK-MSG-006 — Notifications;
7. TASK-MSG-007 — Audit/Retention;
8. TASK-MSG-008 — Media Processing;
9. consolidar Technical Baseline;
10. obtener autorización explícita de implementación.
