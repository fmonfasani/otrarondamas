# Wapsell — Platform & Governance (TO-BE)
**Fase:** 6.8 — TO-BE Platform & Governance · **Creado:** 2026-09-29 · **Estado:** DRAFT — NOT APPROVED

> ## Autoridad y gobierno
>
> D-017 y D-018 están registrados como APPROVED — DERIVED / RECONSTRUCTED. Se utilizan como
> requisitos de dirección, no como citas OWNER-VERBATIM.
>
> La SPEC canónica de Platform & Governance es actualmente un placeholder DRAFT — NOT APPROVED.
> El General SPEC contiene propuestas adicionales sobre Platform, Reports, Audit, Notifications,
> Security, Observability y arquitectura; esas propuestas no se convierten aquí en requisitos.
>
> Este documento separa dirección aprobada, AS-IS verificable y OPEN DETAIL. No define stack TO-BE,
> Kubernetes, GraphQL, microservicios, colas, observabilidad concreta, política de seguridad concreta,
> CI/CD específico, modelo físico de plataforma ni contratos.
>
> **Decisiones creadas: 0. Requisitos inventados: 0. Conflictos resueltos: 0. Contratos: 0.
> Invariantes: 0. Tests: 0. Implementación: 0.**

---

## 1. Propósito

Platform & Governance reúne las capacidades transversales necesarias para operar Wapsell como
plataforma SaaS, sin convertir cada capacidad transversal en una decisión técnica prematura.

La dirección aprobada establece dos puntos principales:

1. Wapsell evolucionará inicialmente como **monolito modular**.
2. Wapsell deberá incorporar un **pipeline CI/CD automatizado e incremental** para controlar calidad
   antes de integración y despliegue.

El resto de las capacidades de plataforma permanece sujeto a definición posterior.

---

## 2. Arquitectura TO-BE

D-017 establece:

- monolito modular como arquitectura inicial;
- separación clara de dominios y responsabilidades;
- posibilidad de evolucionar componentes individualmente;
- no se requiere una migración inicial a microservicios;
- infraestructura y capacidades adicionales se incorporan cuando exista un requisito concreto que
  las justifique.

Conceptualmente:

    WAPSELL
       |
       +--------------------------------+
       |          MODULAR MONOLITH      |
       |                                |
       | Identity / Tenancy              |
       | Authorization                   |
       | Commerce                        |
       | Inventory                       |
       | Cash                            |
       | Messaging                       |
       | Branding                        |
       | Platform / Governance           |
       +--------------------------------+

El diagrama es conceptual. No define procesos físicos, paquetes, aplicaciones, servidores ni
deployment topology.

---

## 3. Qué D-017 NO decide

D-017 no autoriza por sí mismo:

- microservicios;
- Kubernetes;
- GraphQL;
- gRPC;
- brokers;
- colas;
- WebSocket;
- Redis;
- service mesh;
- infraestructura cloud específica;
- topología de servidores;
- estrategia de escalamiento;
- proveedor de observabilidad;
- proveedor de logs;
- mecanismos adicionales de seguridad.

El AS-IS confirma que actualmente no existen gRPC, colas, WebSocket ni comunicación server-to-server
entre las SPAs; eso es evidencia del estado actual, no una prohibición futura.

---

## 4. Dominios y límites

El monolito modular debe mantener separación de responsabilidades entre los dominios definidos
conceptualmente por el TO-BE.

La lista de 22 dominios del General SPEC continúa siendo **TO-BE PROPOSED** y no se transforma en
una decisión por este documento.

Los dominios con dirección específica ya documentada incluyen:

- Identity / Tenancy / Authorization;
- Branding;
- Messaging;
- Orders / Sales;
- Payments;
- Cash;
- Inventory;
- Purchases / Suppliers / Accounts Payable;
- Accounts Receivable;
- Fulfillment.

La relación exacta entre dominio, módulo de navegación y módulo de código permanece OPEN DETAIL.

---

## 5. Platform Administration

La administración transversal de la plataforma aparece como área propuesta en el General SPEC, pero
no existe una decisión aprobada que defina:

- superadministrador SaaS;
- onboarding self-service;
- lifecycle de Business;
- suspensión/reactivación;
- billing;
- planes;
- límites de uso;
- administración transversal de usuarios;
- soporte multi-Business.

Por lo tanto, ninguno de esos comportamientos se convierte en requisito en esta fase.

---

## 6. Audit

El AS-IS posee un `AuditLog` genérico, pero no existe una especificación TO-BE aprobada que defina
el dominio de Audit.

No se decide aquí:

- qué operaciones deben auditarse;
- retención;
- inmutabilidad;
- estructura de eventos;
- actor;
- Business context;
- consulta;
- exportación;
- integraciones.

La existencia del modelo AS-IS no constituye aprobación de su reutilización futura.

---

## 7. Notifications

El AS-IS posee un modelo `Notificacion`, pero no existe un módulo funcional de notificaciones y
la Platform & Governance SPEC no contiene reglas.

Por tanto, quedan OPEN DETAIL:

- tipos de notificación;
- canales;
- preferencias;
- entrega;
- retries;
- persistencia;
- lectura;
- relación con Messaging;
- relación con Fulfillment;
- email/push/in-app;
- infraestructura.

No se crea una arquitectura de notificaciones en esta fase.

---

## 8. Reports

Reports figura como dominio propuesto, pero no existe una definición TO-BE aprobada de:

- catálogo de reportes;
- fuentes de datos;
- permisos;
- periodicidad;
- exportaciones;
- agregaciones;
- métricas;
- consistencia temporal;
- dashboards.

El documento no convierte la navegación propuesta de “Reportes” en requisito funcional.

---

## 9. Security

D-006 establece la dirección de autorización contextual:

    Global User
        |
    Business Context
        |
    Membership
        |
    Role / Permission
        |
    Authorization
        |
    Resource Access

La seguridad técnica adicional no queda definida por este documento.

No se fijan:

- 2FA/MFA;
- PCI DSS;
- secrets manager;
- WAF;
- rate limiting;
- device management;
- session policy;
- encryption architecture;
- threat model;
- security provider.

El AS-IS contiene JWT, Google OAuth y guards; esos mecanismos son evidencia del sistema actual y no
constituyen automáticamente la arquitectura de seguridad TO-BE.

---

## 10. Observability

No existe una especificación aprobada de observabilidad.

Quedan OPEN DETAIL:

- logs estructurados;
- métricas;
- tracing;
- correlation IDs;
- alerting;
- dashboards;
- SLO/SLI;
- retention;
- incident management.

No se selecciona una herramienta ni una plataforma.

---

## 11. CI/CD

D-018 establece que Wapsell deberá contar progresivamente con un pipeline CI/CD automatizado que
controle calidad antes de integración y despliegue.

La dirección conceptual es:

    Change
      |
      v
    Validation
      |
      +--> code validation
      |
      +--> build
      |
      +--> automated tests
      |
      +--> integration / E2E when applicable
      |
      v
    Controlled deployment

Los cambios que no superen las validaciones obligatorias no deben avanzar al siguiente entorno.

D-018 no define:

- proveedor CI/CD;
- branches;
- environments concretos;
- estrategia de merge;
- release strategy;
- deployment platform;
- rollback mechanism;
- exact test suite;
- frecuencia de ejecución;
- required checks concretos.

Todos esos puntos son OPEN DETAIL.

---

## 12. AS-IS de calidad y su relación con el TO-BE

El AS-IS verifica:

- cero archivos reales de tests;
- Jest configurado pero sin tests escritos;
- ausencia de CI/CD;
- despliegues y migraciones manuales;
- linting configurado y utilizado;
- validaciones manuales mediante servidor y base de datos reales.

Estos hechos constituyen baseline, no requisitos nuevos.

D-018 proporciona la dirección para transformar progresivamente ese estado, pero no autoriza todavía
una implementación concreta del pipeline.

---

## 13. Governance documental

D-009 establece que la SPEC es la fuente de verdad y que las propuestas deben distinguirse de los
requisitos aprobados.

Por lo tanto, la gobernanza TO-BE debe conservar:

- autoridad de decisiones;
- separación AS-IS / TO-BE;
- trazabilidad;
- estado de aprobación;
- OPEN DETAIL;
- distinción entre requisito y propuesta;
- evidencia de implementación;
- validación posterior.

Este documento no crea un workflow técnico adicional de aprobación.

---

## 14. AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| AS-IS | GAP | DECISION | TO-BE | OPEN DETAIL |
|---|---|---|---|---|
| Arquitectura monolítica NestJS/Prisma/PostgreSQL | No existe separación TO-BE formal de plataforma | D-017 | Monolito modular | límites físicos y módulos concretos |
| No existen microservicios | No aplica como déficit por sí mismo | D-017 | No se requiere migración inicial a microservicios | futura extracción de componentes |
| No existe CI/CD | Deploy/migrations manuales | D-018 | Pipeline CI/CD progresivo y automatizado | proveedor, gates, environments |
| Cero tests reales | No existe red automatizada de regresión | D-018 | Tests automatizados forman parte del pipeline progresivo | suite y cobertura requerida |
| AuditLog existe AS-IS | No existe definición TO-BE de Audit | Ninguna | Audit permanece como dominio a definir | reglas de auditoría |
| Notificacion existe AS-IS pero no módulo funcional | No existe definición TO-BE | Ninguna | Notifications permanece abierta | canales y lifecycle |
| Reports aparece como propuesta | No existe catálogo aprobado | Ninguna | Reports permanece propuesto | alcance |
| JWT/Google OAuth/guards existen AS-IS | No existe arquitectura TO-BE completa de seguridad | D-006 solo fija autorización contextual | Seguridad debe respetar el contexto User/Business/Membership | mecanismo técnico |
| No existe observabilidad formal | Falta definición transversal | Ninguna | Observability permanece abierta | logs, metrics, tracing |
| Deployment manual en VPS | Falta automatización | D-018 | despliegue controlado dentro de CI/CD progresivo | infraestructura y rollback |

---

## 15. Open Details

| # | Open Detail | Autoridad / origen |
|---|---|---|
| 1 | Límites concretos del monolito modular | D-017 |
| 2 | Organización física de módulos | D-017 |
| 3 | Estrategia futura de extracción de componentes | D-017 |
| 4 | Stack TO-BE definitivo | D-017 no lo fija |
| 5 | Infraestructura de deployment | D-017 |
| 6 | CI provider | D-018 |
| 7 | Branching / merge policy | D-018 |
| 8 | Environment model | D-018 |
| 9 | Required CI gates | D-018 |
| 10 | Test suite mínima | D-018 |
| 11 | Integration/E2E scope | D-018 |
| 12 | Deployment strategy | D-018 |
| 13 | Rollback strategy | D-018 |
| 14 | Release strategy | D-018 |
| 15 | Platform administrator / superadmin | Platform SPEC |
| 16 | Business lifecycle | Platform SPEC |
| 17 | SaaS onboarding | Platform SPEC |
| 18 | Billing/plans/limits | Platform SPEC |
| 19 | Audit rules | Platform SPEC |
| 20 | Notification model | Platform SPEC |
| 21 | Reports scope | Platform SPEC |
| 22 | Security hardening | Platform SPEC |
| 23 | Observability architecture | Platform SPEC |
| 24 | Incident management | Platform SPEC |
| 25 | Operational SLO/SLI | Platform SPEC |
| 26 | Platform-wide permissions | D-005/D-006 + Platform |
| 27 | Cross-Business administrative operations | D-001/D-006 |
| 28 | Data retention policies | Platform / domain specs |

---

## 16. Evidence

| Conclusion | Classification |
|---|---|
| Modular Monolith as initial architecture | DOCUMENTED — D-017 |
| No initial migration to microservices required | DOCUMENTED — D-017 |
| CI/CD automated and progressive | DOCUMENTED — D-018 |
| Current NestJS/Prisma/PostgreSQL stack | VERIFIED BY CODE — AS-IS |
| Current absence of CI/CD | VERIFIED BY CODE — AS-IS |
| Current absence of automated test files | VERIFIED BY CODE — AS-IS |
| Current manual deployment/migrations | DOCUMENTED / VERIFIED BY CODE where applicable |
| Current absence of WebSocket/gRPC/queues | VERIFIED BY CODE — AS-IS |
| Concrete future CI provider | NOT DETERMINABLE |
| Concrete future infrastructure | NOT DETERMINABLE |
| Concrete observability stack | NOT DETERMINABLE |
| Platform admin model | NOT DETERMINABLE |
| Reports definition | NOT DETERMINABLE |
| Notification definition | NOT DETERMINABLE |

---

## 17. Conflicts

### CON-002 / CON-026 — Architecture

**OPEN.**

The repository contains both the real simple stack and historical enterprise-grade proposals. D-017
establishes the modular-monolith direction but does not select the enterprise proposal's technologies.

### CON-027 — CI/CD

**OPEN.**

D-018 establishes the direction toward automated CI/CD, while the concrete implementation remains
undefined.

No conflict is closed by this document.

---

## 18. Traceability

| Direction | Source |
|---|---|
| Modular Monolith | D-017 |
| No initial migration to microservices | D-017 |
| CI/CD progressive and automated | D-018 |
| Governance / SPEC as source of truth | D-009 |
| Authorization context | D-006 |
| Current architecture baseline | AS-IS Architecture |
| Current quality baseline | AS-IS Quality |
| CON-002 / CON-026 | Conflict Register |
| CON-027 | Conflict Register |

Contracts, invariants, tests and implementation are intentionally untouched.

---

## 19. Phase closure

**Fase 6.8 — TO-BE Platform & Governance: completada como documentación conceptual.**

Established:

- modular monolith as initial architectural direction;
- progressive automated CI/CD direction;
- governance boundary;
- platform capabilities that remain open;
- explicit separation between AS-IS evidence and TO-BE direction.

Not established:

- concrete stack;
- infrastructure;
- microservices;
- Kubernetes;
- GraphQL;
- queues;
- observability tools;
- security products;
- CI provider;
- branch/release model;
- platform admin model;
- reports/notifications detailed behavior;
- contracts;
- invariants;
- tests;
- implementation.

**Decisions created: 0. Requirements invented: 0. Conflicts resolved: 0.**

The next phase is not implementation. First the TO-BE coverage should be reviewed for remaining
domain gaps and then the project can move to Contracts → Invariants → Tests → Plan.
