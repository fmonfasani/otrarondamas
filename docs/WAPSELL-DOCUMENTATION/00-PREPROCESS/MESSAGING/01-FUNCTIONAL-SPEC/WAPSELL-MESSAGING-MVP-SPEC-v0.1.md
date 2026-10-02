# WAPSELL --- MESSAGING MVP

## Specialized Functional & Technical Specification Baseline

**Estado:** DRAFT --- NOT APPROVED\
**Fecha:** 2026-10-01\
**Fuente funcional:** Owner Decision Pack G1--G105\
**Implementación:** NO AUTORIZADA\
**Contracts / Invariants / Tests:** NO DEFINIDOS EN ESTE ARTEFACTO

------------------------------------------------------------------------

## 1. Propósito

Esta especificación transforma las decisiones funcionales G1--G105 en
una baseline especializada de Messaging.

No modifica código, schema, datos ni contratos. Tampoco autoriza
implementación.

La documentación existente identifica `04-MESSAGING-SPEC.md` como un
placeholder y el TO-BE existente establece que las specialized specs
preceden a Contracts, Invariants, Tests/Evals y Plan.

------------------------------------------------------------------------

## 2. Autoridad y trazabilidad

### 2.1 Fuente primaria de este documento

La fuente primaria funcional es la confirmación explícita del Owner
durante el Owner Decision Pack, G1--G105.

### 2.2 Restricciones superiores

Messaging debe respetar:

-   Wapsell como plataforma.
-   Business como límite de aislamiento tenant.
-   User como identidad global.
-   Membership como relación User ↔ Business.
-   Customer como relación comercial independiente con vínculo opcional
    a User.
-   Messaging como experiencia comercial central.
-   Commerce como motor operativo.
-   Messaging MVP propio de Wapsell y sin dependencia de WhatsApp.
-   La SPEC como fuente de verdad.
-   Ningún detalle técnico se considera aprobado por inferencia.

------------------------------------------------------------------------

# 3. Alcance funcional

Messaging MVP comprende:

1.  conversaciones 1:1;
2.  conversaciones grupales;
3.  participantes y administración de grupos;
4.  mensajes de texto;
5.  edición y eliminación;
6.  replies;
7.  reacciones;
8.  reenvío;
9.  imágenes;
10. archivos;
11. mensajes de voz;
12. estados de entrega/lectura;
13. presencia;
14. indicador de escritura;
15. notificaciones;
16. archivado;
17. fijado;
18. búsqueda;
19. previews de enlaces;
20. contexto comercial;
21. aislamiento por Business;
22. privacidad;
23. auditoría conceptual.

------------------------------------------------------------------------

# 4. Modelo conceptual

Los conceptos funcionales son:

``` text
Business
   │
   └── Conversation
          ├── Participants
          ├── Messages
          │     ├── Text
          │     ├── Image
          │     ├── File
          │     └── Voice
          ├── Replies
          ├── Reactions
          ├── Commercial Associations
          │     ├── Customer
          │     ├── Order
          │     ├── Sale
          │     ├── Product
          │     └── Purchase
          └── Audit / History
```

Este diagrama es conceptual. No define tablas, claves, relaciones
físicas ni endpoints.

------------------------------------------------------------------------

# 5. Business isolation

## 5.1 Regla

Una conversación pertenece exclusivamente a un Business.

No existe conversación multi-Business en el MVP.

## 5.2 Consecuencia

Un mismo User global puede participar en conversaciones de distintos
Businesses, pero:

-   las conversaciones permanecen separadas;
-   los mensajes permanecen separados;
-   las asociaciones comerciales permanecen separadas;
-   el contexto de un Business no se expone a otro.

**Trazabilidad:** G65.

------------------------------------------------------------------------

# 6. Acceso a conversaciones

## 6.1 Participantes ordinarios

Los miembros distintos de Owner/Admin solo acceden a conversaciones en
las que participan.

**Trazabilidad:** G66, G69.

## 6.2 Owner/Admin

Owner/Admin puede acceder a cualquier conversación del Business.

Ese acceso no requiere una auditoría adicional específica.

**Trazabilidad:** G67, G68.

## 6.3 Acceso a entidades asociadas

Tener acceso a una conversación no concede automáticamente acceso a las
entidades comerciales asociadas.

Si una entidad está restringida:

-   la asociación puede permanecer visible;
-   la entidad se muestra como restringida/sin acceso.

**Trazabilidad:** G53, G54.

------------------------------------------------------------------------

# 7. Conversaciones

## 7.1 Tipos

-   1:1
-   grupal

## 7.2 Creación

Customer y miembros autorizados del Business pueden iniciar
conversaciones.

**Trazabilidad:** G1, G2.

## 7.3 Estado de participación

La participación tiene comportamiento temporal:

-   incorporación;
-   participación;
-   salida;
-   expulsión;
-   reingreso.

El historial de estos cambios se conserva con usuario y fecha/hora.

**Trazabilidad:** G72.

------------------------------------------------------------------------

# 8. Grupos

## 8.1 Incorporación

Cualquier participante puede agregar participantes.

**Trazabilidad:** G3, G77.

## 8.2 Administración

-   el administrador puede transferir administración;
-   si el creador abandona, la administración pasa al segundo
    participante según orden histórico de incorporación;
-   el administrador puede expulsar participantes.

**Trazabilidad:** G5, G6, G7.

## 8.3 Reingreso de expulsados

Cualquier participante puede volver a agregar a un usuario expulsado.

**Trazabilidad:** G8, G78.

## 8.4 Salida

Cualquier participante puede abandonar voluntariamente.

**Trazabilidad:** G4.

## 8.5 Capacidad

Máximo: **50 participantes**.

Al alcanzar 50:

-   no se agregan nuevos participantes;
-   cuando alguien abandona o es eliminado, el cupo queda disponible
    inmediatamente.

**Trazabilidad:** G79, G80, G81.

## 8.6 Grupo con un participante

La conversación permanece activa con un único participante. Ese
participante puede agregar nuevamente a otros.

**Trazabilidad:** G82, G83.

## 8.7 Eventos de sistema

La conversación muestra eventos de:

-   `X se unió a la conversación`;
-   `X abandonó la conversación`;
-   `X fue eliminado de la conversación`.

Los participantes pueden distinguir abandono voluntario de eliminación.

**Trazabilidad:** G75, G76.

## 8.8 Historial de nuevos participantes

Un usuario incorporado solo accede a mensajes y archivos posteriores a
su incorporación.

Si vuelve a ingresar posteriormente, tampoco recupera el historial
anterior.

**Trazabilidad:** G70, G71.

------------------------------------------------------------------------

# 9. Mensajes

## 9.1 Tipos funcionales

-   texto;
-   imagen;
-   archivo;
-   voz.

## 9.2 Estados

Los mensajes exponen:

`ENVIADO → ENTREGADO → LEÍDO`

**Trazabilidad:** G25.

## 9.3 Edición

El autor puede editar un mensaje enviado.

Solo el texto es editable.

Los usuarios pueden ver que el mensaje fue editado, pero no su contenido
anterior.

**Trazabilidad:** G14, G15, G16.

## 9.4 Eliminación

Pueden eliminar mensajes:

-   autor;
-   administrador de conversación;
-   Owner/Admin del Business.

Al eliminar:

-   el contenido deja de estar visible para usuarios;
-   el registro/información necesaria para auditoría se conserva
    internamente.

**Trazabilidad:** G11, G12, G13.

## 9.5 Adjuntos de un mensaje eliminado

Si el mensaje contiene texto y adjuntos, todo el contenido deja de estar
disponible para usuarios y se conserva internamente para auditoría.

**Trazabilidad:** G17.

## 9.6 Replies

Cualquier participante puede responder directamente a cualquier mensaje.

**Trazabilidad:** G18.

## 9.7 Reacciones

Cualquier participante puede reaccionar a cualquier mensaje.

Se admite cualquier emoji disponible en el sistema.

**Trazabilidad:** G19, G20.

## 9.8 Reenvío

Cualquier participante puede reenviar mensajes a cualquier conversación
a la que tenga acceso.

El mensaje reenviado:

-   se identifica como reenviado;
-   conserva el autor original.

Un mensaje eliminado no puede reenviarse.

**Trazabilidad:** G35, G36, G37.

------------------------------------------------------------------------

# 10. Archivos e imágenes

## 10.1 Archivos

-   máximo 25 MB;
-   si supera 25 MB, se rechaza;
-   los archivos compatibles tienen preview;
-   cualquier participante con acceso puede descargar;
-   no existe compresión automática;
-   las descargas registran usuario y fecha/hora.

**Trazabilidad:** G38--G43.

## 10.2 Imágenes

Las imágenes:

-   se muestran inline;
-   pueden ampliarse;
-   pueden descargarse;
-   pueden enviarse hasta 5 en un mismo mensaje;
-   máximo 5 MB por imagen;
-   una imagen >5 MB es rechazada.

Formatos:

-   JPG/JPEG;
-   PNG;
-   WEBP;
-   GIF.

Los GIF animados se reproducen automáticamente.

**Trazabilidad:** G92--G98.

------------------------------------------------------------------------

# 11. Mensajes de voz

## 11.1 Capacidades

-   grabación directa;
-   cancelación antes del envío;
-   previsualización;
-   confirmación y envío;
-   eliminación según reglas generales.

**Trazabilidad:** G84, G89.

## 11.2 Restricciones

-   duración máxima: 2 minutos;
-   formato: MP3;
-   prioridad: alta calidad.

**Trazabilidad:** G85, G87, G88.

## 11.3 Reproducción

Se permite:

-   reproducir;
-   pausar;
-   avanzar;
-   retroceder;
-   controlar volumen;
-   cambiar velocidad.

Velocidades:

`1×`, `1.5×`, `2×`.

**Trazabilidad:** G90, G91.

------------------------------------------------------------------------

# 12. Notificaciones y presencia

## 12.1 Notificaciones

Los mensajes generan notificación salvo que la conversación esté
silenciada.

Silenciar:

-   elimina las notificaciones;
-   no impide recibir mensajes;
-   no elimina el contador de no leídos.

**Trazabilidad:** G21, G22.

## 12.2 Presencia

Se muestra:

-   EN LÍNEA;
-   DESCONECTADO;
-   última conexión.

**Trazabilidad:** G23.

## 12.3 Escritura

Se muestra `escribiendo...`.

**Trazabilidad:** G24.

## 12.4 Confirmaciones

Cada usuario puede desactivar las confirmaciones de lectura.

Si lo hace:

-   no informa sus propias lecturas;
-   continúa viendo las confirmaciones de otros usuarios.

**Trazabilidad:** G26, G27.

------------------------------------------------------------------------

# 13. Bandeja

## 13.1 Archivado

Un usuario puede archivar una conversación.

La conversación:

-   desaparece de la bandeja principal;
-   permanece en Archivadas.

Si recibe un nuevo mensaje:

-   permanece archivada;
-   muestra indicador de mensajes nuevos.

**Trazabilidad:** G28, G29.

## 13.2 Fijado

Cada usuario puede fijar conversaciones individualmente para mantenerlas
arriba de su propia bandeja.

**Trazabilidad:** G30.

------------------------------------------------------------------------

# 14. Búsqueda

La búsqueda permite:

-   conversaciones;
-   texto de mensajes.

La búsqueda de mensajes es global sobre todas las conversaciones
accesibles al usuario.

Filtros:

-   fecha;
-   participante;
-   conversación;
-   tipo de contenido.

Tipos filtrables:

-   texto;
-   imágenes;
-   archivos.

**Trazabilidad:** G31--G34.

------------------------------------------------------------------------

# 15. Enlaces y previews

## 15.1 URLs externas

Wapsell intenta generar automáticamente una preview cuando puede obtener
metadatos.

Debe hacerlo aplicando controles de seguridad y sin ejecutar contenido
activo del sitio externo.

**Trazabilidad:** G99, G100.

## 15.2 Enlaces internos

Los enlaces internos de Wapsell generan preview contextual.

La preview respeta los permisos del usuario.

Entidades:

-   Customer;
-   Order;
-   Sale;
-   Product;
-   Purchase.

La preview muestra un resumen contextual con datos principales.

Al seleccionarla, se abre directamente la entidad.

**Trazabilidad:** G101--G104.

------------------------------------------------------------------------

# 16. Contexto comercial

## 16.1 Entidades asociables

Una conversación puede asociarse simultáneamente con:

-   Customer;
-   Order;
-   Sale;
-   Product;
-   Purchase.

**Trazabilidad:** G51, G52.

## 16.2 Asociación automática

Si la conversación se inicia desde una entidad, la asociación se crea
automáticamente.

Si desde una conversación asociada a Customer se crea Order o Sale, se
agregan automáticamente.

La interacción explícita con Product puede generar asociación. Una mera
visualización no.

Purchase también puede asociarse automáticamente desde su contexto o
interacción explícita.

**Trazabilidad:** G56--G60.

## 16.3 Entidades terminales

Si una entidad asociada se cancela o alcanza un estado terminal, la
asociación permanece y la entidad se muestra con su estado actual.

**Trazabilidad:** G61.

## 16.4 Asociaciones históricas

Las asociaciones corregidas o eliminadas conservan trazabilidad.

Las asociaciones históricas:

-   no aparecen en la vista normal;
-   quedan disponibles mediante historial/auditoría.

La auditoría registra, cuando disponible:

-   usuario;
-   fecha/hora;
-   acción;
-   entidad anterior;
-   entidad nueva;
-   motivo.

**Trazabilidad:** G62--G64.

## 16.5 Administración de asociaciones

Las asociaciones son administradas por el sistema y por usuarios
autorizados.

El detalle exacto de qué permiso permite corregir/eliminar una
asociación queda como OPEN DETAIL.

**Trazabilidad:** G55.

------------------------------------------------------------------------

# 17. Bloqueo

## 17.1 1:1

Un usuario puede bloquear a otro participante.

El bloqueo impide nuevos mensajes entre ambos mientras esté activo.

El historial permanece accesible.

Al desbloquear:

-   se restablece el envío;
-   continúa la misma conversación.

**Trazabilidad:** G46--G48.

## 17.2 Grupos

En grupos, el bloqueo solo afecta la comunicación 1:1.

Ambos continúan participando y viendo normalmente el grupo.

**Trazabilidad:** G49.

------------------------------------------------------------------------

# 18. Eliminación de conversación

El administrador puede eliminar una conversación para todos.

Para los usuarios, la conversación deja de estar accesible.

Esto no debe interpretarse automáticamente como destrucción física de
datos internos: las reglas de auditoría establecidas para mensajes,
adjuntos y asociaciones requieren conservación interna cuando
corresponda.

**Trazabilidad:** G9, G10, G12, G17, G64.

La política física de retención queda como OPEN DETAIL técnico.

------------------------------------------------------------------------

# 19. Auditoría conceptual

Messaging requiere trazabilidad conceptual para:

-   eliminaciones;
-   descargas;
-   cambios de participantes;
-   asociaciones;
-   acciones administrativas relevantes.

La estructura física del audit log no está definida por esta
especificación.

------------------------------------------------------------------------

# 20. OPEN DETAIL

Los siguientes puntos no se deben inventar ni convertir directamente en
contratos:

### OD-MSG-01 --- Modelo físico

No están definidos:

-   tablas;
-   IDs;
-   foreign keys;
-   índices;
-   constraints;
-   estrategia de soft delete;
-   particionamiento.

### OD-MSG-02 --- Realtime

Está decidido funcionalmente que Messaging es realtime, pero no:

-   protocolo;
-   transporte;
-   estrategia de reconexión;
-   presencia distribuida;
-   ordenamiento técnico;
-   persistencia de eventos.

### OD-MSG-03 --- Storage

No está decidido:

-   proveedor;
-   bucket;
-   naming;
-   URLs;
-   expiración;
-   antivirus;
-   CDN;
-   thumbnails.

### OD-MSG-04 --- Preview externa

Está decidido el comportamiento de seguridad, pero no el mecanismo
técnico concreto.

### OD-MSG-05 --- Permisos de asociaciones

G55 deja pendiente el permiso exacto para modificar asociaciones.

### OD-MSG-06 --- Retención

No se definió plazo de retención física de mensajes eliminados, adjuntos
eliminados ni auditoría.

### OD-MSG-07 --- Audio

MP3 y alta calidad están decididos. Bitrate, sample rate, encoder y
tamaño máximo efectivo requieren especificación técnica.

### OD-MSG-08 --- Notificaciones

No está definido el mecanismo de push, in-app, background delivery ni
preferencias fuera del silencio de conversación.

### OD-MSG-09 --- Búsqueda

No está definida la tecnología ni la estrategia de indexación.

### OD-MSG-10 --- Administración

No están definidos físicamente los mecanismos de
administración/transferencia de grupos.

------------------------------------------------------------------------

# 21. No objetivos de esta especificación

Este documento no define:

-   schema Prisma;
-   migrations;
-   REST/GraphQL endpoints;
-   WebSocket contracts;
-   event names;
-   queues;
-   proveedores externos;
-   clases o módulos de código;
-   nombres de archivos;
-   DTOs;
-   códigos HTTP;
-   índices;
-   políticas de infraestructura;
-   tests concretos.

------------------------------------------------------------------------

# 22. Trazabilidad resumida

  Área                 Decisiones
  -------------------- --------------------
  Scope                G1--G2
  Groups               G3--G8, G70--G83
  Messages             G11--G20, G35--G37
  Notifications        G21--G27
  Inbox                G28--G30
  Search               G31--G34
  Files                G38--G43
  Membership history   G44--G45, G70--G76
  Blocking             G46--G49
  Commerce context     G51--G64
  Tenant isolation     G65
  Privacy              G66--G69
  Voice                G84--G91
  Images               G92--G98
  Links                G99--G104

------------------------------------------------------------------------

# 23. Estado de aprobación

**Estado actual: DRAFT --- NOT APPROVED**

La presente especificación:

-   no reemplaza la SPEC canónica;
-   no modifica la SPEC canónica;
-   no autoriza implementación;
-   no autoriza migraciones;
-   no autoriza cambios de schema;
-   no autoriza contratos.

### Próximo gate

**OWNER APPROVAL OF MESSAGING SPEC**

Una vez aprobada, la siguiente fase será:

`Messaging SPEC aprobada → Contracts → Invariants → Tests/Evals`
