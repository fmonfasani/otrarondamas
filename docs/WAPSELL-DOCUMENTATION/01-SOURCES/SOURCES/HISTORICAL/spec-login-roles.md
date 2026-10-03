# Login y roles del negocio (RF-17)

Sesión de definición: 22/09/2026. Complementa `docs/SDD-especificacion-funcional-v0.1.md`
(RF-17, actor §3.1, decisión D-20) con el detalle completo. Versión resumida navegable en
[el artifact publicado](https://claude.ai/artifact/N3UDLNcow1Uk8DPUjmWgMz).

## Origen

El dueño pidió inicialmente un selector visual único de login/registro ("Cliente" vs "todo lo
demás", tipo grid de cajas) más un sistema de pedidos a proveedores en tiempo real. Tras
preguntas de alcance, ambos pedidos se separaron: este documento cubre **solo** el login/roles;
el sistema de pedidos a proveedores en tiempo real queda como roadmap aparte, sin diseñar
todavía.

La forma final del selector también cambió durante la definición: de un grid visual de 6 cajas
se pasó a **dos URLs separadas sin selector**, porque el dueño lo pidió explícitamente así
("no quiero selector, quiero dos URL o Endpoint").

## 1. Las dos puertas de entrada

No hay pantalla de "¿quién sos?". Cada dominio ya sabe para quién es.

| Dominio | Para quién | Login |
|---|---|---|
| `otrarondamas.wapsell.com` | Cliente minorista únicamente | Email + contraseña, o Google |
| `admin.otrarondamas.wapsell.com` | Dueño, Asistente de local, Cliente mayorista, Proveedor, Repartidor | El rol ya está asignado a la cuenta desde la invitación — no se elige en el login |

Motivo de mantenerlas separadas: pos-admin y tienda-online ya son proyectos distintos a
propósito (bundles, dominios y código separados, documentado explícitamente en el código desde
las fases previas de Tienda Online). Este requisito agrega una puerta de entrada limpia a cada
una, sin fusionar las apps ni meter un selector intermedio.

## 2. Cómo se llegó a los 5 roles del lado "Negocio"

El primer intento de agrupación (Cliente minorista + mayorista juntos vs. personal) se corrigió
dos veces durante la sesión:

1. "Vendedor mayorista" se identificó como un **Cliente B2B** (otro comercio que compra al
   negocio por mayor), no como personal propio — inicialmente se había asumido lo contrario.
2. El dueño pidió explícitamente que el Cliente mayorista fuera agrupado junto con
   Proveedor/Repartidor/Owner/Asistente en el lado "Negocio", **no** junto al Cliente minorista
   — aunque comercialmente sea un comprador, su acceso es al panel interno (`admin.*`), no a la
   tienda pública.

El actor "Vendedor" de la v0.1 original del SDD se renombra a **Asistente de local** — mismas
responsabilidades y permisos, sólo cambia el nombre (para distinguirlo del nuevo "Cliente
mayorista", que ya no puede llamarse "vendedor").

| Rol | Qué es | Antecedentes penales | Pantallas funcionales en este incremento |
|---|---|---|---|
| Owner | Dueño del negocio. Sin cambios de permisos. | No aplica | Todas las actuales |
| Asistente de local | Antes "Vendedor" — mostrador/caja/POS del local. | Requerido | Todas las actuales de Vendedor (solo renombrado) |
| Cliente mayorista | Otro comercio que compra por mayor (B2B). No es personal del negocio. | No aplica | Ninguna — fuera de este incremento |
| Proveedor | Hoy es una fila en la tabla `Proveedor`, sin login. Pasa a tener cuenta propia. | No aplica | Ninguna — fuera de este incremento |
| Repartidor | Rol nuevo. Sin módulo de entregas (RF-13) implementado todavía. | Requerido | Ninguna — solo existe como rol y legajo |

## 3. Legajo por rol

Cada rol completa datos de texto y, cuando corresponde, sube documentos (PDF o imagen). La
cuenta queda en estado **Pendiente** hasta que el dueño la revisa y aprueba manualmente — nadie
opera sin esa aprobación explícita.

| Rol | Campos de texto | Documentos a subir |
|---|---|---|
| Owner | CUIT, razón social, condición ante IVA | Ninguno |
| Asistente de local | DNI, teléfono, dirección personal | Certificado de antecedentes penales, constancia de CUIL (cada uno con su fecha de vencimiento) |
| Cliente mayorista | CUIT, razón social, condición ante IVA, dirección comercial | Ninguno |
| Proveedor | CUIT, razón social, tipo de factura, dirección comercial | Ninguno |
| Repartidor | DNI, teléfono, dirección personal, datos del vehículo, N.º de licencia de conducir | Certificado de antecedentes penales, constancia de CUIL (cada uno con su fecha de vencimiento) |

El certificado de antecedentes penales es información especialmente sensible. Ver §5 (storage)
para cómo se protege.

## 4. Flujo de alta — invitación, no auto-registro

El dueño sigue siendo quien inicia la cuenta, como ya pasa hoy con `Usuario`. Nadie entra a
`admin.otrarondamas.wapsell.com` sin haber sido invitado primero.

1. **El dueño invita.** Desde el panel, con el rol ya elegido (Asistente / Proveedor /
   Repartidor / Mayorista). El sistema manda un email con un link de activación (Resend, ver
   §5).
2. **La persona activa su cuenta.** Define su contraseña (o entra con Google) y accede por
   primera vez a `admin.otrarondamas.wapsell.com`.
3. **Completa su legajo.** El sistema pide los campos y documentos de su rol (§3) antes de
   dejarla operar. Mientras falte algo, la cuenta queda en estado **Pendiente**.
4. **El dueño aprueba.** Revisa los datos y documentos desde el panel y aprueba manualmente.
   Recién ahí la cuenta pasa a **Aprobada** y puede operar.

## 5. Decisiones técnicas resueltas

| Decisión | Resolución | Motivo |
|---|---|---|
| Modelo de datos: ¿Cliente y Usuario se unifican? | **Se mantienen separados.** Cada tabla gana los campos de su propio legajo. | Un Cliente mayorista es un `Cliente` con datos fiscales extra y acceso a `admin.*`, nunca un `Usuario` del panel interno. Respeta la separación de apps ya decidida; un bug en un lado nunca compromete permisos del otro. |
| Almacenamiento de documentos sensibles | **Disco local del VPS**, en una carpeta fuera del webroot (ej. `/var/otrarondamas/legajos/`), nunca servidos directo por nginx — la API los entrega solo autenticado, y solo al dueño. | Sin cuenta de cloud storage nueva por ahora; más simple de implementar con la infraestructura ya existente. |
| Vencimiento de legajo | **Sí se rastrea.** Cada documento sensible guarda su fecha de vencimiento (cargada por la persona al subirlo). El sistema alerta al dueño cuando se acerca. | Mismo patrón ya usado para vencimiento de `Lote` en Inventario, reusado tal cual. |
| Email transaccional | **Resend.** Se usa solo para el link de invitación y las alertas de vencimiento de legajo — no se diseña un sistema de notificaciones general todavía. | El sistema hoy no puede mandar ningún email saliente (solo login con Google/password). Resend: buen soporte Node/Nest, tier gratuito generoso, API simple. |

## 6. Qué entra en este incremento y qué no

**Entra:**
- Los dos dominios de entrada (Cliente / Negocio).
- Login real para Cliente (hoy no tiene — Fases 1-3 de Tienda Online lo dejaban sin
  autenticación, cualquiera con el link de un pedido podía verlo).
- Modelo de datos de los 5 roles nuevos + legajo.
- Carga de documentos y aprobación del dueño.
- Renombrar "Vendedor" → "Asistente de local" (sin cambio de permisos).

**No entra (queda como roadmap aparte):**
- Pantallas funcionales de Proveedor.
- Pantallas funcionales de Repartidor (depende de RF-13, Entregas, sin implementar todavía).
- Pantallas funcionales de Cliente mayorista.
- Sistema de pedidos a proveedores en tiempo real (el pedido original del dueño, separado a
  propósito de este alcance).
- Precios/condiciones mayoristas (D-01 del SDD, ya en backlog aparte).

## 7. Pendiente para la fase de diseño técnico

No cerrado todavía, a resolver antes de escribir el schema/migraciones:

- Plazo exacto de retención de documentos del legajo tras su vencimiento.
- Si el disco donde se guardan los documentos requiere cifrado en reposo.
- Período de vigencia esperado por tipo de documento (cada cuánto vence en la práctica un
  certificado de antecedentes penales vs. una constancia de CUIL) — no se asume un valor en
  meses sin confirmación explícita, mismo criterio que el resto de las decisiones pendientes
  del SDD (D-01 a D-19).
