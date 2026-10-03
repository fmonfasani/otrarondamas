# WAPSELL — MESSAGING MVP
## Contracts Baseline v0.1

**Estado:** DRAFT — PROPOSED FOR APPROVAL  
**SPEC fuente:** `WAPSELL-MESSAGING-MVP-SPEC-v0.1` — APPROVED  
**Implementación:** NO AUTORIZADA  
**Fecha:** 2026-10-01

---

## 1. Propósito

Este documento transforma la Messaging SPEC aprobada en contratos técnicos de comportamiento.

No define implementación concreta.

Por lo tanto, no fija:

- tablas;
- Prisma models;
- endpoints concretos;
- nombres de eventos;
- WebSocket framework;
- proveedor de storage;
- proveedor de notificaciones;
- índices;
- colas;
- infraestructura.

Todo contrato técnico concreto que requiera una decisión todavía abierta permanece marcado como `OPEN DETAIL`.

---

# 2. Convenciones

Cada contrato contiene:

- **Input conceptual**
- **Precondiciones**
- **Postcondiciones**
- **Errores funcionales**
- **Reglas de aislamiento/autorización**
- **Trazabilidad**

No se define todavía una serialización HTTP/JSON específica.

---

# 3. Conversation Contract

## C-CONV-001 — Crear conversación

### Input

- Business context
- initiating User
- participant set
- conversation type: `1:1` o `GROUP`

### Precondiciones

- El iniciador pertenece al Business mediante una Membership válida o participa como Customer según las reglas funcionales.
- Todos los participantes pertenecen al contexto del mismo Business.
- Una conversación nunca pertenece a más de un Business.

### Postcondiciones

- Se crea una conversación perteneciente a un único Business.
- Los participantes iniciales quedan registrados.
- La conversación queda disponible para los participantes autorizados.

### Reglas

Una conversación no puede utilizarse para obtener acceso a entidades comerciales restringidas.

**Trace:** G1, G2, G65, G66.

---

## C-CONV-002 — Eliminar conversación

### Precondición

El actor tiene capacidad administrativa de la conversación.

### Postcondición

La conversación deja de estar accesible para los usuarios.

### Restricción

La eliminación funcional no implica automáticamente destrucción física de datos internos. La retención de auditoría queda abierta.

**Trace:** G9, G10.

---

# 4. Participant Contract

## C-PART-001 — Agregar participante

Cualquier participante puede agregar un nuevo participante.

### Restricciones

- Debe pertenecer al contexto permitido del Business.
- No se puede superar el máximo de 50 participantes.
- El nuevo participante no obtiene historial anterior a su incorporación.

**Trace:** G3, G70, G79, G80.

---

## C-PART-002 — Abandonar conversación

Un participante puede abandonar voluntariamente.

### Postcondiciones

- pierde acceso a la conversación;
- se registra el evento de salida;
- el cupo queda disponible.

**Trace:** G4, G72, G75, G81.

---

## C-PART-003 — Expulsar participante

El administrador puede expulsar participantes.

### Postcondiciones

- el usuario pierde acceso;
- se conserva el historial de sus mensajes;
- se registra la expulsión;
- el cupo queda disponible.

**Trace:** G7, G72, G73.

---

## C-PART-004 — Reingreso

Un participante puede volver a agregar a un usuario que abandonó o fue expulsado.

### Restricción

El usuario reingresado no recupera el historial previo.

**Trace:** G8, G71, G78.

---

## C-PART-005 — Administración

Si el creador abandona, la administración pasa al segundo participante según orden histórico de incorporación.

El administrador puede transferir administración libremente a cualquier participante.

**Trace:** G5, G6.

---

# 5. Message Contract

## C-MSG-001 — Crear mensaje

### Tipos

- TEXT
- IMAGE
- FILE
- VOICE

### Precondiciones

- El actor tiene acceso a la conversación.
- La conversación permite nuevos mensajes.
- El contenido cumple las restricciones del tipo.

### Postcondición

El mensaje queda registrado como enviado y puede avanzar por:

`ENVIADO → ENTREGADO → LEÍDO`

**Trace:** G11, G25.

---

## C-MSG-002 — Editar texto

Solo el autor puede editar un mensaje de texto.

### Postcondiciones

- se actualiza el contenido visible;
- se conserva indicador de edición;
- el contenido anterior no se muestra al usuario.

No se permite editar imágenes, archivos ni voz.

**Trace:** G14–G16.

---

## C-MSG-003 — Eliminar mensaje

Puede eliminar:

- autor;
- administrador de conversación;
- Owner/Admin.

### Postcondiciones

- contenido no visible para usuarios;
- información necesaria para auditoría conservada internamente.

Un mensaje eliminado no puede reenviarse.

**Trace:** G11–G13, G17, G37.

---

## C-MSG-004 — Reply

Cualquier participante puede responder a cualquier mensaje accesible.

**Trace:** G18.

---

## C-MSG-005 — Reaction

Cualquier participante puede reaccionar a cualquier mensaje accesible.

El sistema admite los emojis disponibles.

**Trace:** G19, G20.

---

## C-MSG-006 — Forward

Cualquier participante puede reenviar un mensaje a cualquier conversación a la que tenga acceso.

El mensaje reenviado identifica:

- que es reenviado;
- autor original.

No se puede reenviar un mensaje eliminado.

**Trace:** G35–G37.

---

# 6. Delivery / Read Contract

## C-DEL-001 — Estados de entrega

El sistema debe representar:

`ENVIADO → ENTREGADO → LEÍDO`

No se define todavía el mecanismo técnico que produce cada transición.

**Trace:** G25.

---

## C-DEL-002 — Read receipts

El usuario puede desactivar sus propias confirmaciones de lectura.

### Regla

Si las desactiva:

- no comunica sus lecturas;
- continúa viendo las lecturas de otros.

**Trace:** G26, G27.

---

# 7. Attachment Contract

## C-ATT-001 — Archivo

Máximo:

**25 MB**

Si excede el límite:

- se rechaza;
- no se publica como mensaje válido.

No existe compresión automática.

**Trace:** G40–G42.

---

## C-ATT-002 — Descarga

Un participante con acceso puede descargar un archivo.

La descarga debe registrar:

- usuario;
- fecha/hora.

**Trace:** G38, G43.

---

## C-ATT-003 — Imagen

Restricciones:

- máximo 5 MB;
- hasta 5 imágenes por mensaje;
- JPG/JPEG;
- PNG;
- WEBP;
- GIF.

Las imágenes se muestran inline y pueden ampliarse/descargarse.

**Trace:** G92–G98.

---

# 8. Voice Contract

## C-VOICE-001

Un mensaje de voz:

- se graba directamente;
- puede cancelarse antes del envío;
- puede previsualizarse;
- se envía como mensaje;
- puede eliminarse según las reglas generales.

### Restricciones

- máximo 2 minutos;
- MP3;
- prioridad funcional: alta calidad.

**Trace:** G84–G88.

---

## C-VOICE-002 — Playback

Debe soportar:

- play/pause;
- avance;
- retroceso;
- volumen;
- 1×;
- 1.5×;
- 2×.

**Trace:** G90, G91.

---

# 9. Group Contract

## C-GRP-001 — Capacidad

Máximo 50 participantes.

Cuando se alcanza el máximo no pueden incorporarse nuevos participantes.

El cupo se libera inmediatamente cuando alguien abandona o es expulsado.

**Trace:** G79–G81.

---

## C-GRP-002 — Grupo con un participante

La conversación puede permanecer activa con un único participante.

Ese participante puede agregar otros.

**Trace:** G82, G83.

---

# 10. Notification / Presence Contract

## C-NOT-001 — Notificación

Un nuevo mensaje genera notificación salvo que la conversación esté silenciada.

Silenciar:

- impide notificaciones;
- no impide recepción;
- mantiene el contador de no leídos.

**Trace:** G21, G22.

---

## C-PRES-001 — Presencia

Debe exponerse:

- online/offline;
- última conexión.

**Trace:** G23.

---

## C-PRES-002 — Typing

Debe existir indicador de escritura.

**Trace:** G24.

---

# 11. Inbox Contract

## C-INBOX-001 — Archive

Un usuario puede archivar individualmente una conversación.

Una conversación archivada con nuevos mensajes:

- permanece archivada;
- muestra indicador de actividad.

**Trace:** G28, G29.

---

## C-INBOX-002 — Pin

El usuario puede fijar conversaciones individualmente en su propia bandeja.

**Trace:** G30.

---

# 12. Search Contract

## C-SEARCH-001

La búsqueda debe cubrir:

- conversaciones;
- texto de mensajes.

El ámbito es todas las conversaciones accesibles por el usuario.

## C-SEARCH-002 — Filters

Filtros:

- fecha;
- participante;
- conversación;
- tipo de contenido.

Tipos:

- texto;
- imagen;
- archivo.

No se incluye voz como filtro de contenido.

**Trace:** G31–G34.

---

# 13. Link Preview Contract

## C-LINK-001 — External

Cuando existan metadatos disponibles, el sistema puede generar preview.

Debe respetar:

- controles de seguridad;
- ausencia de ejecución de contenido activo externo.

**Trace:** G99, G100.

---

## C-LINK-002 — Internal

Los enlaces internos pueden generar previews contextuales.

Entidades:

- Customer;
- Order;
- Sale;
- Product;
- Purchase.

La preview respeta los permisos del usuario.

No puede utilizarse para elevar privilegios.

**Trace:** G101–G104.

---

# 14. Commercial Association Contract

## C-ASSOC-001 — Entidades

Una conversación puede asociarse simultáneamente a:

- Customer;
- Order;
- Sale;
- Product;
- Purchase.

**Trace:** G51, G52.

---

## C-ASSOC-002 — Automatic association

Se crea asociación cuando:

- la conversación se inicia desde una entidad;
- desde una conversación de Customer se crea Order/Sale;
- existe interacción comercial explícita con Product;
- Purchase se inicia desde su contexto o mediante interacción explícita.

Una mera visualización de Product no crea asociación.

**Trace:** G56–G60.

---

## C-ASSOC-003 — Terminal state

Cancelar o finalizar una entidad no elimina la asociación.

Debe mostrarse su estado actual.

**Trace:** G61.

---

## C-ASSOC-004 — Historical association

Una asociación corregida o eliminada:

- permanece trazable;
- no aparece en la vista normal;
- aparece en historial/auditoría.

La auditoría registra cuando corresponda:

- usuario;
- timestamp;
- acción;
- entidad anterior;
- entidad nueva;
- motivo.

**Trace:** G62–G64.

---

# 15. Blocking Contract

## C-BLOCK-001 — 1:1

Bloquear a otro usuario:

- impide nuevos mensajes 1:1;
- conserva historial;
- desbloquear restaura el intercambio.

**Trace:** G46–G48.

---

## C-BLOCK-002 — Groups

El bloqueo 1:1 no elimina ni restringe la participación conjunta en grupos.

**Trace:** G49.

---

# 16. Tenant / Authorization Boundary Contract

## C-AUTH-001

Toda operación Messaging debe ejecutarse dentro de un Business.

## C-AUTH-002

El acceso a una conversación no implica acceso automático a las entidades comerciales asociadas.

## C-AUTH-003

Owner/Admin puede acceder a cualquier conversación del Business.

## C-AUTH-004

Los demás roles acceden únicamente a conversaciones en las que participan.

**Trace:** G53–G69.

---

# 17. OPEN DETAIL — No convertir en contrato definitivo

Quedan fuera de aprobación técnica:

- modelo físico;
- IDs;
- endpoints;
- DTOs;
- WebSocket protocol;
- realtime transport;
- storage;
- CDN;
- antivirus;
- previews externas;
- retención;
- indexación;
- push notifications;
- bitrate/sample rate;
- mecanismos físicos de auditoría;
- mecanismo exacto de permisos de asociaciones.

Estos puntos requieren Technical Proposal independiente antes de convertirse en contratos implementables.

---

# 18. Contratos que requieren especial cuidado

### C-CONTRACT-GAP-01 — Eliminación

La SPEC define desaparición funcional y conservación interna para auditoría, pero no una política física de retención.

### C-CONTRACT-GAP-02 — Realtime

La SPEC exige comportamiento realtime, pero no define transporte ni garantías de orden/reintento.

### C-CONTRACT-GAP-03 — Storage

La SPEC define límites funcionales, pero no almacenamiento físico.

### C-CONTRACT-GAP-04 — Authorization

Las reglas funcionales están definidas, pero el mecanismo técnico de enforcement no.

### C-CONTRACT-GAP-05 — Search

El comportamiento funcional está definido; la estrategia de indexación no.

---

# 19. Estado

**DRAFT — PROPOSED FOR APPROVAL**

No se debe implementar este documento como si estuviera aprobado.

Gate siguiente:

**OWNER APPROVAL → INVARIANTS**

Después:

`Contracts Approved → Invariants → Tests/Evals → Plan → Tasks → Implementation`

