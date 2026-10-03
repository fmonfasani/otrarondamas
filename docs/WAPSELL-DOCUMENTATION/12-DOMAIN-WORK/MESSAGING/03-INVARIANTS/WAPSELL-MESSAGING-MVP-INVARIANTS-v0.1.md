# WAPSELL — MESSAGING MVP
## Invariants v0.1

**Estado:** APPROVED — FUNCTIONAL BASELINE  
**Fecha:** 2026-10-01  
**Fuente:** Messaging SPEC + Messaging Contracts + Owner Decision Pack G1–G105  
**Implementación:** NO AUTORIZADA por este documento.

---

## 1. Propósito

Estas invariantes expresan condiciones que deben permanecer verdaderas
durante toda la operación de Messaging.

No fijan implementación física.

---

## 2. Tenant Isolation

### INV-MSG-001 — Business ownership

Toda Conversation pertenece a exactamente un Business.

Nunca una Conversation puede pertenecer simultáneamente a dos Businesses.

**Trace:** G65.

### INV-MSG-002 — Cross-Business isolation

Un usuario no puede utilizar una Conversation de un Business para acceder
a mensajes, participantes, asociaciones o archivos de otro Business.

**Trace:** G65–G69.

### INV-MSG-003 — Business context

Toda operación protegida de Messaging ocurre dentro de un Business
context válido.

---

## 3. Conversation Access

### INV-MSG-004 — Participant access

Un usuario ordinario solo puede acceder a conversaciones en las que
participa.

**Trace:** G66, G69.

### INV-MSG-005 — Owner/Admin access

Owner/Admin puede acceder a cualquier conversación de su Business.

**Trace:** G67.

### INV-MSG-006 — Conversation ≠ entity authorization

El acceso a una conversación nunca concede automáticamente acceso a una
entidad comercial asociada.

**Trace:** G53, G54.

---

## 4. Participant History

### INV-MSG-007 — Join boundary

Un usuario incorporado a una conversación solo puede acceder a mensajes y
archivos posteriores a su incorporación.

**Trace:** G70.

### INV-MSG-008 — Rejoin boundary

Reingresar a una conversación no recupera mensajes ni archivos de una
participación anterior.

**Trace:** G71.

### INV-MSG-009 — Exit boundary

Después de abandonar o ser expulsado, el usuario pierde acceso a la
conversación y sus contenidos.

**Trace:** G44, G45.

### INV-MSG-010 — Historical identity

Los mensajes históricos conservan la identidad/nombre correspondiente al
autor original.

**Trace:** G74.

---

## 5. Group Capacity

### INV-MSG-011 — Maximum participants

Una conversación grupal nunca supera 50 participantes.

**Trace:** G79.

### INV-MSG-012 — Immediate slot reuse

Cuando un participante abandona o es expulsado, el cupo queda disponible
inmediatamente.

**Trace:** G81.

---

## 6. Message Integrity

### INV-MSG-013 — Author identity

Cada mensaje pertenece a un autor identificable dentro del contexto de
la conversación.

### INV-MSG-014 — Message visibility after deletion

Un mensaje eliminado no es visible para los usuarios.

**Trace:** G11, G12, G13.

### INV-MSG-015 — Deleted message non-forwardability

Un mensaje eliminado no puede ser reenviado.

**Trace:** G37.

### INV-MSG-016 — Edit restriction

Solo mensajes de texto pueden editarse.

**Trace:** G16.

### INV-MSG-017 — Edit visibility

Cuando un texto es editado, el contenido anterior no queda visible para
usuarios.

**Trace:** G15.

---

## 7. Delivery / Read State

### INV-MSG-018 — Delivery progression

Los estados de entrega respetan la secuencia funcional:

`ENVIADO → ENTREGADO → LEÍDO`

No se debe interpretar una transición posterior como disponible antes de
la transición funcional correspondiente.

**Trace:** G25.

### INV-MSG-019 — Read receipt privacy

Si un usuario desactiva sus confirmaciones de lectura, sus lecturas no se
exponen a otros usuarios.

El usuario continúa viendo las lecturas permitidas de terceros.

**Trace:** G26, G27.

---

## 8. Attachments

### INV-MSG-020 — File size

Un archivo superior a 25 MB nunca se acepta como adjunto válido.

**Trace:** G40, G41.

### INV-MSG-021 — Image size

Una imagen superior a 5 MB nunca se acepta como imagen válida.

**Trace:** G95, G96.

### INV-MSG-022 — Image count

Un mensaje nunca contiene más de 5 imágenes.

**Trace:** G94.

### INV-MSG-023 — Voice duration

Un mensaje de voz nunca supera 2 minutos.

**Trace:** G85.

### INV-MSG-024 — Voice format

Los mensajes de voz del MVP utilizan MP3.

**Trace:** G87.

---

## 9. Attachment Authorization

### INV-MSG-025 — Download authorization

Solo usuarios con acceso vigente al contexto de la conversación pueden
descargar sus archivos.

### INV-MSG-026 — Deleted attachment visibility

Un adjunto perteneciente a un mensaje eliminado deja de estar disponible
para los usuarios.

La conservación interna para auditoría puede permanecer.

**Trace:** G17.

---

## 10. Group Administration

### INV-MSG-027 — Administrator validity

La administración de un grupo siempre corresponde a un participante
válido.

### INV-MSG-028 — Creator departure

Si el creador abandona, la administración pasa al segundo participante
según el orden histórico definido.

**Trace:** G5.

### INV-MSG-029 — Administrative transfer

El administrador puede transferir administración a cualquier
participante.

**Trace:** G6.

---

## 11. Notifications / Mute

### INV-MSG-030 — Mute does not suppress messages

Silenciar una conversación nunca impide recibir mensajes.

**Trace:** G22.

### INV-MSG-031 — Mute suppresses notifications

Una conversación silenciada no genera notificaciones al usuario que la
silenció.

**Trace:** G21, G22.

### INV-MSG-032 — Unread continuity

Silenciar una conversación no elimina el estado de no leídos.

**Trace:** G22.

---

## 12. Search Security

### INV-MSG-033 — Authorized search scope

Los resultados de búsqueda solo pueden proceder de conversaciones a las
que el usuario tiene acceso.

### INV-MSG-034 — No cross-tenant search

Una búsqueda nunca devuelve resultados de otro Business.

### INV-MSG-035 — Deleted messages excluded

Los mensajes eliminados no aparecen en la búsqueda normal.

### INV-MSG-036 — Current edited content

La búsqueda utiliza el contenido visible actual de un mensaje editado,
no su contenido anterior.

---

## 13. Commercial Associations

### INV-MSG-037 — Association scope

Las asociaciones comerciales pertenecen al contexto del Business de la
Conversation.

### INV-MSG-038 — Multiple associations

Una Conversation puede mantener simultáneamente asociaciones con
Customer, Order, Sale, Product y Purchase.

**Trace:** G51, G52.

### INV-MSG-039 — Terminal association retention

Cancelar o finalizar una entidad no elimina automáticamente la asociación
histórica.

**Trace:** G61.

### INV-MSG-040 — Historical association visibility

Las asociaciones corregidas/eliminadas no aparecen en la vista normal,
pero permanecen trazables mediante historial/auditoría.

**Trace:** G62, G63.

---

## 14. Blocking

### INV-MSG-041 — 1:1 blocking

Un bloqueo 1:1 impide nuevos mensajes entre los usuarios bloqueados.

### INV-MSG-042 — Blocking preserves history

Bloquear no elimina el historial existente.

### INV-MSG-043 — Group independence

El bloqueo 1:1 no elimina ni restringe la participación conjunta en
grupos.

**Trace:** G46–G49.

---

## 15. Forwarding

### INV-MSG-044 — Forward authorization

Un mensaje solo puede reenviarse a una conversación a la que el usuario
tiene acceso.

### INV-MSG-045 — Forward attribution

Un mensaje reenviado conserva la referencia visible al autor original.

**Trace:** G35, G36.

---

## 16. Preview Security

### INV-MSG-046 — External preview safety

Las previews externas no pueden ejecutar contenido activo del sitio
externo.

**Trace:** G100.

### INV-MSG-047 — Internal preview authorization

Una preview de entidad interna respeta los permisos del usuario.

**Trace:** G101–G104.

---

## 17. Auditability

### INV-MSG-048 — Participant history

Las altas, bajas, expulsiones y reingresos mantienen historial.

**Trace:** G72, G75, G76.

### INV-MSG-049 — Download traceability

Las descargas de archivos mantienen trazabilidad de usuario y
fecha/hora.

**Trace:** G43.

### INV-MSG-050 — Association traceability

Las modificaciones relevantes de asociaciones conservan información de
acción y contexto cuando corresponda.

**Trace:** G64.

---

## 18. Data Visibility

### INV-MSG-051 — User-visible deletion

La eliminación funcional de conversación, mensaje o adjunto impide su
visualización normal por los usuarios.

### INV-MSG-052 — Internal retention distinction

La invisibilidad funcional no implica por sí misma destrucción física de
datos internos.

La retención física concreta continúa siendo OPEN DETAIL.

---

## 19. No-Inference Boundary

Las siguientes propiedades **NO son invariantes físicas aprobadas**:

- nombres de tablas;
- nombres de columnas;
- UUID como estrategia obligatoria;
- foreign keys concretas;
- índices;
- triggers;
- soft-delete físico;
- almacenamiento específico;
- WebSocket/Socket.IO;
- colas;
- motor de búsqueda;
- CDN;
- proveedor de notificaciones;
- estrategia de caché;
- particionamiento.

Estas decisiones requieren especificación técnica previa.

---

## 20. Matriz resumida

| ID | Invariante | Área |
|---|---|---|
| INV-MSG-001–003 | Business / tenant | Isolation |
| INV-MSG-004–006 | Acceso | Authorization |
| INV-MSG-007–010 | Participación | History |
| INV-MSG-011–012 | Grupos | Capacity |
| INV-MSG-013–017 | Mensajes | Integrity |
| INV-MSG-018–019 | Entrega | Read state |
| INV-MSG-020–026 | Adjuntos | Limits/security |
| INV-MSG-027–029 | Grupos | Administration |
| INV-MSG-030–032 | Notificaciones | Mute/unread |
| INV-MSG-033–036 | Search | Security |
| INV-MSG-037–040 | Commerce | Associations |
| INV-MSG-041–043 | Blocking | Privacy |
| INV-MSG-044–045 | Forwarding | Authorization |
| INV-MSG-046–047 | Preview | Security |
| INV-MSG-048–050 | Audit | Traceability |
| INV-MSG-051–052 | Deletion | Visibility/retention |

---

## 21. Estado

**APPROVED — FUNCTIONAL BASELINE**

Estas invariantes son la base para Tests/Evals.

No autorizan implementación por sí mismas.

Siguiente etapa:

**INVARIANTS → TESTS / EVALS → PLAN → TASKS → IMPLEMENTATION**
