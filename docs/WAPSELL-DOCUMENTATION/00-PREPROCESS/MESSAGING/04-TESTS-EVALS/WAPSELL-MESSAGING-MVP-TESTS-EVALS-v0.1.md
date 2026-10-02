# WAPSELL — MESSAGING MVP
## Tests & Evals v0.1

**Estado:** APPROVED — TEST BASELINE  
**Fecha:** 2026-10-01  
**Fuentes:** Messaging SPEC, Contracts, Invariants, Owner Decision Pack G1–G105  
**Implementación:** NO AUTORIZADA por este documento.

---

# 1. Propósito

Este documento convierte los contratos e invariantes de Messaging en
casos verificables.

Los casos son criterios de validación. No constituyen código de tests ni
fijan framework.

---

# 2. Clasificación

Cada caso puede implementarse posteriormente como:

- unit;
- integration;
- E2E;
- authorization/security;
- concurrency;
- manual acceptance;
- observability/evaluation.

La selección concreta del nivel de test queda para el Implementation Plan.

---

# 3. Tenant Isolation

### MSG-T-001 — Conversation belongs to one Business

**Given:** una conversación de Business A.  
**When:** un usuario opera bajo Business B.  
**Then:** la conversación no aparece ni puede ser utilizada desde B.

**Covers:** INV-MSG-001, 002, 003 / G65.

### MSG-T-002 — Cross-tenant search isolation

**Given:** mensajes iguales en Business A y B.  
**When:** un usuario de A busca el texto.  
**Then:** solo obtiene resultados de A.

**Covers:** INV-MSG-034 / G65.

### MSG-T-003 — Association does not bypass authorization

**Given:** conversación accesible con entidad comercial restringida.  
**When:** usuario abre la asociación.  
**Then:** la entidad no se vuelve accesible por estar asociada.

**Covers:** INV-MSG-006 / G53, G54.

---

# 4. Conversation Access

### MSG-T-004 — Participant access

**Given:** User U participa en C.  
**Then:** U puede acceder a C.

### MSG-T-005 — Non-participant access denied

**Given:** User U no participa en C.  
**Then:** U no puede acceder a C salvo que sea Owner/Admin autorizado.

### MSG-T-006 — Owner/Admin access

**Given:** Owner/Admin del Business.  
**Then:** puede acceder a cualquier conversación del Business.

**Covers:** G66–G69.

---

# 5. Participant History

### MSG-T-007 — New participant cannot read old messages

**Given:** C contiene mensajes previos a la incorporación de U.  
**When:** U entra a C.  
**Then:** U solo puede leer contenido posterior a su incorporación.

### MSG-T-008 — Rejoin does not restore old history

**Given:** U abandonó C después de participar.  
**When:** U vuelve a ser agregado.  
**Then:** U no recupera el contenido anterior.

### MSG-T-009 — Leaving removes access

**Given:** U participa en C.  
**When:** U abandona.  
**Then:** pierde acceso a mensajes y archivos de C.

### MSG-T-010 — Expulsion removes access

**Given:** U participa en C.  
**When:** administrador lo expulsa.  
**Then:** pierde acceso y sus mensajes históricos permanecen.

**Covers:** G44, G45, G70–G74.

---

# 6. Groups

### MSG-T-011 — Maximum 50 participants

**Given:** grupo con 50 participantes.  
**When:** se intenta agregar el participante 51.  
**Then:** operación rechazada.

### MSG-T-012 — Slot released after leave

**Given:** grupo con 50 participantes.  
**When:** uno abandona.  
**Then:** puede agregarse inmediatamente otro.

### MSG-T-013 — Creator leaves

**Given:** creador + participantes con orden histórico conocido.  
**When:** creador abandona.  
**Then:** administración pasa al segundo participante histórico.

### MSG-T-014 — Admin transfers control

**Given:** administrador y varios participantes.  
**When:** administra transferencia.  
**Then:** el participante seleccionado pasa a administrar.

### MSG-T-015 — Participant can add another

**Given:** participante autorizado por la regla funcional.  
**When:** agrega otro usuario.  
**Then:** usuario queda incorporado.

### MSG-T-016 — Re-add expelled participant

**Given:** U fue expulsado.  
**When:** otro participante lo vuelve a agregar.  
**Then:** U puede participar nuevamente, sin recuperar historial previo.

### MSG-T-017 — Single participant group remains active

**Given:** grupo reducido a un participante.  
**Then:** la conversación continúa activa y el participante puede agregar otro.

---

# 7. Messages

### MSG-T-018 — Create text message

Crear un mensaje de texto produce un mensaje visible para los
participantes autorizados.

### MSG-T-019 — Delivery state progression

Un mensaje puede avanzar:

`ENVIADO → ENTREGADO → LEÍDO`

No debe saltarse funcionalmente la semántica de estados definida.

### MSG-T-020 — Author edits text

El autor modifica un texto.

**Then:**

- contenido actual visible;
- indicador de editado;
- contenido anterior no visible.

### MSG-T-021 — Non-author cannot edit

Otro participante intenta editar.

**Then:** operación rechazada.

### MSG-T-022 — Non-text cannot edit

Intentar editar imagen, archivo o voz.

**Then:** operación rechazada.

### MSG-T-023 — Delete message

Autor elimina mensaje.

**Then:**

- mensaje no visible;
- no puede reenviarse;
- información interna requerida para auditoría permanece.

### MSG-T-024 — Admin deletes message

Administrador elimina mensaje de otro participante.

**Then:** mismas condiciones funcionales de eliminación.

### MSG-T-025 — Reply

Participante responde a un mensaje existente.

**Then:** reply queda asociado al mensaje objetivo.

### MSG-T-026 — Reaction

Participante reacciona con emoji.

**Then:** reacción visible según reglas de acceso.

---

# 8. Forwarding

### MSG-T-027 — Forward accessible message

Usuario reenvía mensaje a conversación accesible.

**Then:** aparece como reenviado y conserva autor original.

### MSG-T-028 — Forward to inaccessible conversation

Usuario intenta reenviar a conversación sin acceso.

**Then:** operación rechazada.

### MSG-T-029 — Forward deleted message

Usuario intenta reenviar mensaje eliminado.

**Then:** operación rechazada.

---

# 9. Attachments

### MSG-T-030 — Reject file >25 MB

Archivo de 25 MB + epsilon.

**Then:** rechazo.

### MSG-T-031 — Accept file <=25 MB

Archivo dentro del límite.

**Then:** aceptación si el resto de las condiciones son válidas.

### MSG-T-032 — Reject image >5 MB

Imagen superior a 5 MB.

**Then:** rechazo.

### MSG-T-033 — Reject more than 5 images

Se intenta enviar 6 imágenes en un mensaje.

**Then:** rechazo.

### MSG-T-034 — Valid image formats

JPG/JPEG/PNG/WEBP/GIF son aceptados dentro de los demás límites.

### MSG-T-035 — Download requires access

Usuario sin acceso a conversación intenta descargar.

**Then:** rechazo.

### MSG-T-036 — Download is traceable

Usuario autorizado descarga archivo.

**Then:** queda registro de usuario y fecha/hora.

---

# 10. Voice

### MSG-T-037 — Reject voice >2 minutes

Mensaje de voz de más de 2 minutos.

**Then:** rechazo.

### MSG-T-038 — Voice MP3

Un mensaje de voz válido utiliza MP3.

### MSG-T-039 — Cancel voice before send

Usuario cancela grabación antes de enviar.

**Then:** no existe mensaje enviado.

### MSG-T-040 — Voice playback controls

La reproducción soporta:

- play/pause;
- forward/back;
- volume;
- 1x;
- 1.5x;
- 2x.

---

# 11. Notifications / Read Receipts

### MSG-T-041 — New message notification

Conversación no silenciada recibe notificación ante nuevo mensaje.

### MSG-T-042 — Muted conversation

Conversación silenciada:

- no notifica;
- recibe mensaje;
- mantiene unread.

### MSG-T-043 — Read receipts disabled

Usuario desactiva confirmaciones.

**Then:**

- sus lecturas no se exponen;
- continúa viendo lecturas ajenas.

---

# 12. Presence / Typing

### MSG-T-044 — Presence

El sistema puede representar online/offline/last connection según el
estado funcional definido.

### MSG-T-045 — Typing indicator

Mientras un usuario escribe, los participantes correspondientes pueden
recibir indicador de escritura.

---

# 13. Search

### MSG-T-046 — Search message text

Texto existente puede localizarse en conversaciones accesibles.

### MSG-T-047 — Search filters

Los filtros por:

- fecha;
- participante;
- conversación;
- tipo de contenido

reducen el conjunto de resultados conforme al criterio.

### MSG-T-048 — Voice not a content filter

La búsqueda no ofrece voz como tipo de contenido filtrable.

### MSG-T-049 — Deleted message absent

Mensaje eliminado no aparece en búsqueda normal.

### MSG-T-050 — Edited message current content

Búsqueda devuelve el texto visible actual, no el contenido anterior.

---

# 14. Commercial Associations

### MSG-T-051 — Multiple associations

Una conversación puede asociarse simultáneamente a Customer, Order,
Sale, Product y Purchase.

### MSG-T-052 — Entity-origin association

Crear conversación desde una entidad crea asociación correspondiente.

### MSG-T-053 — Customer → Order/Sale association

Crear Order o Sale desde una conversación asociada a Customer agrega la
asociación correspondiente.

### MSG-T-054 — Explicit Product interaction

Seleccionar/consultar/agregar Product en una interacción comercial
explícita puede crear asociación.

Una mera visualización no.

### MSG-T-055 — Purchase association

Contexto/interacción explícita de Purchase crea asociación según la regla
funcional.

### MSG-T-056 — Terminal entity keeps association

Cancelar una entidad no elimina automáticamente la asociación.

### MSG-T-057 — Historical association

Modificar/eliminar asociación:

- no la muestra como activa;
- conserva historial/auditoría.

---

# 15. Blocking

### MSG-T-058 — Block 1:1

Bloquear impide nuevos mensajes 1:1.

### MSG-T-059 — Block preserves history

El historial permanece accesible.

### MSG-T-060 — Unblock

Desbloquear permite nuevamente mensajes en la misma conversación.

### MSG-T-061 — Group unaffected

Bloqueo 1:1 no impide participación conjunta en grupos.

---

# 16. Links / Previews

### MSG-T-062 — External preview

URL con metadatos puede generar preview.

### MSG-T-063 — External active content blocked

Preview externa no ejecuta contenido activo externo.

### MSG-T-064 — Internal entity preview authorization

Preview de Customer/Order/Sale/Product/Purchase respeta permisos.

---

# 17. Deletion / Retention

### MSG-T-065 — Conversation deletion

Administrador elimina conversación.

**Then:** deja de ser accesible para usuarios.

### MSG-T-066 — Functional deletion vs internal retention

La desaparición funcional no exige destrucción física inmediata de los
datos internos requeridos para auditoría.

La política física concreta queda OPEN DETAIL.

---

# 18. Auditability

### MSG-T-067 — Participant events

Join, leave, expulsion y rejoin quedan trazables.

### MSG-T-068 — Association changes

Cambios relevantes de asociaciones quedan trazables.

### MSG-T-069 — Downloads

Descargas registran usuario y fecha/hora.

---

# 19. Security / IDOR Evaluations

### MSG-E-001 — Conversation IDOR

Cambiar el identificador de conversación por uno perteneciente a otro
Business no debe revelar contenido.

### MSG-E-002 — Message IDOR

Cambiar el identificador de mensaje por uno fuera del ámbito autorizado
no debe revelar contenido.

### MSG-E-003 — Attachment IDOR

Un object/file identifier por sí solo nunca concede descarga.

### MSG-E-004 — Search leakage

Resultados, snippets, counts o metadata de conversaciones inaccesibles no
deben filtrarse.

### MSG-E-005 — Realtime authorization

Suscribirse a un canal/room de otro Business o conversación no autorizada
debe ser rechazado.

### MSG-E-006 — Revoked membership

Una Membership revocada no conserva acceso autorizado a Messaging.

---

# 20. Concurrency / Consistency Evaluations

### MSG-E-007 — Group capacity race

Dos solicitudes simultáneas sobre el último cupo no pueden producir más
de 50 participantes.

### MSG-E-008 — Duplicate message submission

Reintentos no deben producir duplicación indebida si el contrato técnico
posterior establece idempotencia.

**Nota:** el mecanismo de idempotencia todavía es OPEN DETAIL.

### MSG-E-009 — Concurrent deletion/edit

Editar y eliminar concurrentemente no debe producir un estado visible
contradictorio con las reglas funcionales.

El mecanismo de resolución técnica queda OPEN DETAIL.

---

# 21. Storage Evaluations

### MSG-E-010 — Unauthorized object access

Conocer el identificador de un objeto no permite descargarlo sin
autorización.

### MSG-E-011 — Deleted attachment access

Después de eliminación funcional, el objeto no es accesible para usuarios.

### MSG-E-012 — Business isolation

Un objeto almacenado para Business A no puede ser descargado desde el
contexto autorizado de Business B.

---

# 22. Acceptance Gate

Messaging no puede avanzar a implementación si fallan casos críticos de:

1. tenant isolation;
2. authorization;
3. participant boundaries;
4. deletion visibility;
5. attachment authorization;
6. search isolation;
7. realtime authorization;
8. Business isolation del storage.

---

# 23. OPEN DETAIL

Este documento no decide:

- framework de testing;
- nombres de suites;
- fixtures;
- factories;
- seed;
- IDs físicos;
- API;
- protocolo realtime;
- storage engine;
- search engine;
- CI pipeline;
- observability stack.

---

# 24. Estado

**APPROVED — TEST BASELINE**

Siguiente etapa:

**TESTS/EVALS → IMPLEMENTATION PLAN → TASKS → IMPLEMENTATION**
