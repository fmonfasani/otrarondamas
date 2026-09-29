# AS-IS — Integrations
**Evidencia:** VERIFIED BY CODE (grep + lectura de código, esta sesión)

| Integración | Estado real | Evidencia |
|---|---|---|
| **Resend** (email transaccional) | **REAL e integrado** | `apps/api/src/email/email.service.ts`, dependencia `resend@6.28.1`. Usado para invitaciones y alertas de vencimiento de legajo. Degradación explícita: si `RESEND_API_KEY`/`RESEND_FROM_EMAIL` faltan, no tumba el servidor — solo loguea y devuelve `enviado: false` |
| **Google OAuth 2.0** | **REAL e integrado** | `passport-google-oauth20`, para ambas identidades (Usuario y Cliente). Variables de entorno obligatorias en producción (`GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL`) — el arranque falla si faltan, según `docker-compose.prod.yml`. VERIFIED BY EXECUTION también (SRC-004 §15) |
| **Mercado Pago** | **NO IMPLEMENTADO** | Ni un stub que intente una llamada saliente. El DTO de pagos rechaza explícitamente el string "Mercado Pago" con 400 (D-03 sin definir) — ausencia confirmada por grep, no solo por falta de mención |
| **WhatsApp** | **NO IMPLEMENTADO** | Ninguna integración ni SDK relacionado a WhatsApp Business API en `apps/api/src`. `Pedido.canalOrigen` acepta el string libre "WhatsApp" como valor posible, pero es solo un dato descriptivo sin integración funcional detrás (RF-07 no implementado) |
| **Stripe, Twilio u otro proveedor de pagos/mensajería** | **NO IMPLEMENTADO** | Ausencia confirmada por grep |

## Relevancia para DEC-001

La ausencia total de integraciones de mensajería (WhatsApp, u otro canal conversacional) es
consistente con la ausencia de todo el dominio de messaging a nivel de modelo de datos y código (ver
`04-ASIS-IDENTITY.md`). No hay ninguna pieza de infraestructura parcial sobre la cual construir la
visión conversacional de DEC-001 — ese trabajo parte de cero, tal como advierte también SRC-011 en
su sección 22 ("Messaging y asistentes parten de cero").
