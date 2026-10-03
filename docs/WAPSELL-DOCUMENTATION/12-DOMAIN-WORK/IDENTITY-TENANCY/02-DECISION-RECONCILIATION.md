# WAPSELL — IDENTITY & TENANCY
## 02 — DECISION RECONCILIATION

**Estado:** DRAFT — PROCESS ARTIFACT / NOT APPROVED  
**Fecha:** 2026-10-01  
**Dominio:** Identity & Tenancy  
**Propósito:** separar decisiones ya cerradas de detalles que todavía requieren definición antes de TO-BE técnico, Contracts e Implementation.

---

## 1. Autoridad documental

Esta reconciliación se basa en el orden de precedencia vigente:

1. Owner Ruling primario.
2. Canonical Decision Register.
3. SPEC canónica.
4. TO-BE y derivados.
5. Auditoría como evidencia, no como creadora de decisiones.
6. Workshop / preparación como material no normativo.
7. Documentación histórica como evidencia.

**Regla:** una decisión conceptual cerrada no equivale a autorización de implementación.

Fuentes principales:
- `04-DECISIONS/00-DECISION-REGISTER.md`
- `18-R2-OWNER-DECISION-CLOSURE-REPORT.md`
- `00-PREPROCESS/IDENTITY-TENANCY/00-ASIS-BASELINE.md`
- `00-PREPROCESS/IDENTITY-TENANCY/01-REQUIREMENTS-AND-GAP-DEFINITION.md`
- `02-CANONICAL-SPEC/01-IDENTITY-AND-TENANCY-SPEC.md`

---

## 2. Resultado ejecutivo

La dirección conceptual de Identity & Tenancy está suficientemente definida para continuar hacia una **TO-BE conceptual reconciliada**.

No está suficientemente definida para:
- diseñar el modelo físico definitivo;
- ejecutar migraciones;
- modificar schema o datos;
- definir contratos técnicos finales;
- implementar la transición.

La frontera actual es:

**DECISIONES CERRADAS**
→ Business como unidad de tenancy/aislamiento  
→ User como identidad global  
→ Membership como relación User ↔ Business  
→ Customer independiente de User  
→ destino persistente Empresa → Business  
→ transición incremental con coexistencia temporal y acotada  
→ compatibilidad temporal de sesiones/tokens legacy  
→ invalidación de legacy sessions al finalizar la transición  
→ email de User único global  
→ especificación → aprobación → implementación

**DETALLES ABIERTOS**
→ lifecycle de Membership  
→ catálogo definitivo de roles/permisos  
→ lifecycle de Business/User  
→ contexto activo de Business y switching  
→ mecanismo técnico de autorización  
→ mecanismo físico de aislamiento  
→ migración y cutover  
→ enforcement técnico de unicidad de email  
→ criterio técnico de vinculación Customer ↔ User  
→ administración/onboarding de Business

---

## 3. Decisiones conceptuales cerradas

| Tema | Estado | Fuente / autoridad | Qué queda cerrado | Qué NO queda cerrado |
|---|---|---|---|---|
| Business / Tenant | CLOSED | D-001 + P1-A | Business es el término canónico; funciona como unidad de aislamiento. Empresa tiene destino final Business. | tablas, columnas, FKs, migración, cutover |
| User global | CLOSED | D-002 + OR-002-C | User es identidad global; email único global. | normalización, constraint física, limpieza de duplicados |
| Membership | CLOSED en dirección conceptual | D-002 + OR-002-A/B | User ↔ Business es N:N mediante Membership. | lifecycle, estados, administración, modelo físico |
| Customer independiente | CLOSED | D-002-bis + OR-002-A/D | Customer no se fusiona con User; pertenece al contexto comercial del Business; vínculo a User es opcional. | lifecycle y modelado físico |
| Customer ↔ User | PARCIALMENTE CLOSED | OR-002-D + R2 | El vínculo es opcional. | criterio “mismo email” NO está confirmado; permanece OPEN |
| Empresa → Business persistente | CLOSED en destino | P1-A | La transformación aplica también al modelo persistente; destino final = Business. | migración física, compatibilidad, rollback, cutover |
| Transición | CLOSED en dirección | OR-002-B | Incremental, coexistencia temporal y acotada; no permanente. | duración y mecanismo |
| Legacy sessions/tokens | CLOSED en comportamiento | OR-002-E | Compatibilidad temporal; al finalizar se invalidan sesiones legacy y se requiere nuevo login. | formato, claims, duración, mecanismo de corte |
| Gate de implementación | CLOSED | OR-002-F / P5-B | Especificación → aprobación Owner → implementación. | versión concreta de especificación técnica aún no aprobada |

---

## 4. D-005 y D-006: tratamiento correcto

### D-005 — Roles y permisos

El Decision Register conserva la dirección:

- los roles y permisos pertenecen al Membership;
- un User puede tener distintas autorizaciones en distintos Business;
- el acceso se determina por el Membership activo.

Sin embargo, el registro R2/R3 mantiene **D-005 como NOT CONSULTED para detalles posteriores**.

Por lo tanto, esta fase puede usar la regla conceptual como requisito de diseño, pero **no debe inventar**:
- catálogo definitivo de roles;
- catálogo definitivo de permisos;
- estados de Membership;
- lifecycle administrativo;
- estrategia de asignación/revocación.

### D-006 — Autorización de acceso

El Decision Register conserva como dirección reconstruida:

1. identidad global User;
2. Business objetivo;
3. Membership válido;
4. roles/permisos necesarios.

Y explicita que un token válido por sí solo no autoriza una operación sobre un Business.

No obstante, D-006 permanece **NOT CONSULTED** en el estado R2/R3 para detalles posteriores.

Por lo tanto quedan abiertos:
- secuencia exacta de validación;
- tipo de token y claims;
- guards/middleware/interceptors;
- resolución del Business objetivo;
- errores y estados de sesión;
- mecanismo de revocación.

**Conclusión:** el principio de autorización contextual puede pasar a la TO-BE conceptual; el mecanismo técnico no.

---

## 5. Reglas Customer ↔ User

Las reglas cerradas registradas en R2 son:

- Customer puede existir sin User.
- El vínculo Customer → User es opcional.
- Customers de distintos Business pueden vincularse al mismo User global.
- Cambiar el email de Customer no rompe un vínculo existente.
- Cambiar el email de User no rompe un vínculo existente.
- User tiene email globalmente único.
- El criterio “mismo email = mismo User” para crear automáticamente el vínculo **no fue confirmado**.

Por tanto:

**OPEN:** algoritmo o criterio de matching/linking Customer ↔ User.

No se debe convertir “mismo email” en comportamiento automático hasta contar con una decisión/especificación aprobada.

---

## 6. Gaps que realmente requieren resolución

| Gap | Estado | Tipo | Próximo nivel |
|---|---|---|---|
| Membership lifecycle | OPEN | funcional + técnico | TO-BE / Contracts |
| Role catalog | OPEN | funcional | Requirements / TO-BE |
| Permission catalog | OPEN | funcional | Requirements / TO-BE |
| Business lifecycle | OPEN | funcional | Requirements / TO-BE |
| User lifecycle | OPEN | funcional | Requirements / TO-BE |
| Active Business context | OPEN | funcional + UX | TO-BE / Contracts |
| Business switching | OPEN | funcional + UX | TO-BE / Contracts |
| Authorization mechanism | OPEN | técnico | Technical Spec |
| Tenant isolation mechanism | OPEN | técnico | Technical Spec |
| User email normalization | OPEN | técnico | Technical Spec |
| Existing duplicate emails | OPEN | migración | Migration Spec |
| Customer ↔ User matching | OPEN | funcional | Owner Decision / Spec |
| Legacy session compatibility | direction CLOSED | técnico | Technical Spec |
| Empresa → Business migration | direction CLOSED | técnico | Migration Spec |
| Business onboarding | OPEN | funcional | Requirements |
| Platform/SaaS administration | OPEN | alcance | Requirements / TO-BE |

---

## 7. Lo que NO se decide en este artefacto

Este documento no decide:

- schema Prisma/SQL;
- nombres de tablas o columnas;
- IDs;
- claims JWT;
- estrategia RLS vs application-level scoping;
- endpoints;
- eventos;
- migraciones;
- dual-write;
- cutover;
- rollback;
- duración concreta de coexistencia;
- catálogo final de roles/permisos;
- matching automático Customer ↔ User;
- MFA;
- superadmin;
- onboarding self-service.

Estas cuestiones deberán resolverse en su nivel correspondiente.

---

## 8. Gate de salida

Identity & Tenancy puede avanzar a **TO-BE conceptual** sin introducir decisiones nuevas si se mantiene esta frontera:

**CERRADO**
- Business / User / Membership / Customer como conceptos separados.
- aislamiento por Business como principio.
- User global.
- Customer independiente.
- destino Empresa → Business.
- transición incremental y temporal.
- compatibilidad legacy temporal.
- email User globalmente único.

**OPEN**
- lifecycle;
- authorization mechanics;
- isolation mechanics;
- migration mechanics;
- Customer ↔ User matching;
- administración/onboarding;
- roles/permisos concretos.

La siguiente especificación debe convertir solamente los puntos cerrados en modelo conceptual TO-BE y mantener explícitamente los puntos OPEN.

---

## 9. Evidencia y nivel de certeza

| Elemento | Evidencia |
|---|---|
| AS-IS User ↔ Empresa 1:N | VERIFICADO POR CÓDIGO |
| AS-IS ausencia de Membership | VERIFICADO POR CÓDIGO |
| AS-IS Customer separado de Usuario | VERIFICADO POR CÓDIGO |
| D-001 / D-002 | OWNER-VERBATIM en Decision Register |
| D-002-bis | OWNER-VERBATIM |
| OR-002-A…F | OWNER-RULED según R2 |
| P1-A / P5-B | OWNER-RULED según R2 |
| D-005 / D-006 | DERIVED / RECONSTRUCTED; detalles posteriores NOT CONSULTED |
| Matching “mismo email” | OPEN / NO CONFIRMADO |
| Modelo físico final | NOT DETERMINABLE / OPEN |
| Implementación | NOT AUTHORIZED |

---

## 10. Estado del artefacto

**Estado:** DRAFT — PROCESS ARTIFACT / NOT APPROVED

Este documento **no modifica**:
- Decision Register;
- SPEC canónica;
- TO-BE canónica;
- Contracts;
- Invariants;
- código;
- schema;
- datos.

Su función es preparar la siguiente fase y dejar trazable qué decisiones pueden utilizarse y qué asuntos continúan abiertos.
