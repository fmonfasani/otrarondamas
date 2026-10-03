# Wapsell — Branding & Experience (TO-BE)
**Fase:** 6.7 — TO-BE Branding & Experience · **Creado:** 2026-09-29 · **Estado:** DRAFT — NOT APPROVED

> ## Autoridad y gobierno
>
> DEC-001 establece que Brand define la identidad comercial del Business mostrada a sus clientes.
> D-004 figura en el Decision Register como APPROVED — DERIVED / RECONSTRUCTED, pero la única
> dirección trazable en el repositorio es la de DEC-001:15. El detalle del design system no está decidido.
>
> 06-BRANDING-AND-EXPERIENCE-SPEC.md es actualmente un placeholder DRAFT — NOT APPROVED.
> El AS-IS contiene cuatro conjuntos de tokens visuales sin jerarquía normativa. Ninguno se promueve
> automáticamente a TO-BE.
>
> Este documento establece únicamente el TO-BE conceptual respaldado por las fuentes existentes.
> No define tokens, colores, tipografías, componentes, schema, API, permisos, rutas físicas,
> arquitectura frontend ni contratos.
>
> **Decisiones creadas: 0. Requisitos inventados: 0. Tokens normativos creados: 0. Entidades físicas:
> 0. Contratos: 0. Invariantes: 0. Tests: 0. Conflictos resueltos: 0.**

---

## 1. Propósito

Wapsell necesita distinguir claramente entre:

- la identidad de la plataforma Wapsell;
- la identidad comercial del Business;
- el sistema de diseño común de la plataforma;
- la experiencia que recibe un cliente;
- la experiencia operativa de quienes trabajan para el Business.

La dirección aprobada establece que la marca del Business debe ser protagonista frente a sus clientes,
mientras Wapsell permanece como plataforma subyacente.

Esto no constituye una aprobación de un sistema visual concreto.

---

## 2. Brand como identidad comercial del Business

Conceptualmente:

    Wapsell Platform
          |
          +---- Business
                  |
                  +---- Brand
                  |
                  +---- Customer Experience

Brand representa la identidad comercial que el cliente reconoce durante su interacción con un Business.

La dirección aprobada no determina:

- estructura de configuración;
- assets;
- logos;
- colores;
- tipografías;
- iconografía;
- componentes;
- temas;
- tokens;
- límites de personalización;
- persistencia;
- versionado.

Todos esos puntos permanecen OPEN DETAIL.

---

## 3. Design System de Wapsell

D-004 establece como dirección que Wapsell tendrá un Design System canónico común y que cada Business
configurará su Brand sobre ese sistema.

La separación conceptual es:

| Capa | Función |
|---|---|
| Wapsell Design System | lenguaje visual y componentes comunes de la plataforma |
| Business Brand | identidad comercial configurable del Business |
| Experience | aplicación de ambos según contexto de usuario |

El concepto de Design System está aprobado como dirección, pero su contenido concreto no lo está.

### No decidido

- palette;
- typography;
- spacing;
- component library;
- iconography;
- motion;
- accessibility tokens;
- dark/light themes;
- responsive breakpoints;
- token hierarchy;
- customization limits;
- inheritance rules.

---

## 4. Business Brand frente a Wapsell

La experiencia orientada al cliente debe identificarse principalmente con el Business.

Conceptualmente:

    Customer
       |
       v
    Business Brand
       |
       v
    Wapsell capabilities

Wapsell actúa como plataforma subyacente y no debe confundirse conceptualmente con el Brand del Business.

No se define aquí cómo se representa visualmente Wapsell ni en qué superficies aparece.

---

## 5. Customer Experience vs. Staff Experience

El principio de Brand se refiere especialmente a la experiencia comercial orientada al cliente.

Wapsell tiene también superficies operativas para usuarios que actúan dentro de un Business.

Conceptualmente existen dos contextos:

| Contexto | Objetivo |
|---|---|
| Customer-facing | interacción comercial con el Business |
| Business-facing | operación y gestión del Business |

No se establece que deban existir dos Design Systems diferentes.

No se establece tampoco una lista definitiva de pantallas, navegación o layouts.

---

## 6. Role-based experience

La experiencia de un usuario dentro de un Business depende conceptualmente de:

    Global User
       |
    Membership
       |
    Role / Permissions
       |
    Authorized Experience

D-005 establece que roles y permisos pertenecen a la Membership.

Por lo tanto, una experiencia contextualizada por rol es compatible con la dirección aprobada.

Sin embargo, el catálogo concreto de roles y permisos no está decidido. Tampoco está aprobada una
correspondencia definitiva entre roles y módulos de navegación.

La navegación de ocho ítems del SPEC General es TO-BE PROPOSED, no una decisión.

---

## 7. Navigation y experiencia

El SPEC General propone una navegación de primer nivel:

1. Inicio
2. Mensajería
3. Caja
4. Compras
5. Stock
6. Reportes
7. Usuarios y permisos
8. Configuración
9. Perfil como capacidad transversal

Esta lista debe tratarse como TO-BE PROPOSED.

Este documento no la convierte en requisito aprobado.

Tampoco se define:

- qué roles ven cada entrada;
- qué permisos habilitan cada acción;
- qué rutas frontend existirán;
- qué elementos aparecen en mobile/tablet/desktop;
- qué navegación pertenece a Customer y cuál a staff.

---

## 8. Responsive experience

La plataforma debe poder ofrecer experiencias apropiadas a los contextos de uso, pero no existe una
decisión aprobada sobre breakpoints, layouts o estrategia responsive concreta.

Por ello permanecen OPEN DETAIL:

- breakpoints;
- layouts por dispositivo;
- navegación mobile;
- navegación desktop;
- comportamiento tablet;
- densidad de información;
- patrones de interacción.

No se fijan valores CSS ni componentes.

---

## 9. Accessibility

No existe en las fuentes consultadas una decisión específica que establezca un estándar de
accesibilidad o un catálogo de requisitos WCAG.

Por tanto, este documento no introduce un estándar normativo.

Quedan OPEN DETAIL:

- nivel de conformidad;
- requisitos de contraste;
- navegación por teclado;
- semántica;
- lectores de pantalla;
- tamaño mínimo de interacción;
- motion preferences.

---

## 10. AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| AS-IS | GAP | DECISION | TO-BE | OPEN DETAIL |
|---|---|---|---|---|
| Identidad visual histórica del producto | No existe una separación normativa completa entre plataforma y Business Brand | DEC-001 / D-004 | Brand pertenece conceptualmente al Business | modelo de configuración |
| Existen cuatro conjuntos de tokens visuales sin jerarquía | No hay un Design System canónico verificable | D-004 solo fija la dirección | Design System común de Wapsell | tokens, jerarquía y contenido |
| Hay superficies operativas del negocio | La experiencia por rol no tiene catálogo TO-BE definitivo | D-005 fija roles/permisos en Membership | Experiencia contextual al Membership | roles, permisos y navegación concreta |
| La navegación propuesta está en SPEC General | No existe aprobación específica de la lista | Ninguna | Navegación propuesta como referencia | lista definitiva |
| Wapsell y la marca del Business pueden confundirse | Falta una frontera conceptual explícita | DEC-001:15 | Business Brand protagonista frente al cliente | tratamiento visual de Wapsell |
| No hay decisión de responsive | No existe especificación de experiencia por dispositivo | Ninguna | Experiencia responsive como dirección futura | breakpoints/layouts |
| No hay estándar de accesibilidad documentado | No existe requisito formal | Ninguna | Sin requisito nuevo en esta fase | estándar y criterios |

---

## 11. Open Details

| # | Open Detail | Autoridad / origen |
|---|---|---|
| 1 | Contenido del Design System canónico | D-004 / Branding SPEC |
| 2 | Design tokens | DEC-001 exclusions |
| 3 | Paleta de colores canónica | CON-012 / AS-IS |
| 4 | Tipografía | Branding SPEC |
| 5 | Spacing | Branding SPEC |
| 6 | Component library | Branding SPEC |
| 7 | Iconografía | Branding SPEC |
| 8 | Motion | No decidido |
| 9 | Temas light/dark | No decidido |
| 10 | Token inheritance Business Brand → Design System | D-004 implementation detail |
| 11 | Assets configurables por Business | D-004 implementation detail |
| 12 | Límites de personalización del Brand | D-004 implementation detail |
| 13 | Persistencia/versionado del Brand | No decidido |
| 14 | Tratamiento visual de Wapsell frente al Business Brand | DEC-001:15, detalle no definido |
| 15 | Navegación definitiva | SPEC General §25, TO-BE PROPOSED |
| 16 | Navegación por rol | D-005 + catálogo de roles OPEN |
| 17 | Experiencia específica de Customer | No decidido |
| 18 | Experiencia específica de staff | No decidido |
| 19 | Breakpoints responsive | No decidido |
| 20 | Layouts por dispositivo | No decidido |
| 21 | Accesibilidad / estándar de conformidad | No decidido |
| 22 | Contraste y tokens de accesibilidad | No decidido |
| 23 | Reglas de personalización sin romper consistencia del Design System | D-004 implementation detail |
| 24 | Separación visual entre superficies Customer-facing y Business-facing | No decidido |

---

## 12. Evidencia

| Conclusión | Clasificación |
|---|---|
| Brand representa la identidad comercial del Business | DOCUMENTADO — DEC-001 |
| Design System común como dirección | DOCUMENTADO — D-004 / DEC-001 |
| Business Brand debe protagonizar la experiencia del cliente | DOCUMENTADO — DEC-001 / D-004 direction |
| Design tokens concretos | NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE |
| Tipografía canónica | NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE |
| Component library canónica | NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE |
| Cuatro token sets AS-IS | DOCUMENTADO — AS-IS Branding |
| Navegación definitiva | NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE |
| Roles concretos por navegación | NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE |

---

## 13. Conflictos relacionados

### CON-012 — Branding / Design System

**Estado: OPEN.**

El AS-IS contiene múltiples conjuntos de tokens sin jerarquía. Este TO-BE establece únicamente la
dirección aprobada de Brand + Design System común y no selecciona ningún conjunto de tokens.

### CON-018 — Authorization / role experience

**Estado: OPEN.**

La experiencia contextual por Membership es compatible con D-005, pero el catálogo de roles,
permisos y navegación concreta continúa abierto.

Ninguno de estos conflictos se cierra en esta fase.

---

## 14. Trazabilidad

| Dirección | Fuente |
|---|---|
| Brand = identidad comercial del Business | DEC-001:15 |
| Design System común | D-004 / DEC-001 direction |
| Roles/permisos dentro de Membership | D-005 |
| Experiencia contextualizada al Business | D-001 / D-005 |
| Navegación propuesta | SPEC General §25 |
| Cuatro token sets AS-IS | AS-IS Branding |
| CON-012 | Conflict Register |
| CON-018 | Conflict Register |

Contracts, invariants, tests y código no son producidos por este documento.

---

## 15. Cierre de fase

**Fase 6.7 — TO-BE Branding & Experience: completada como documentación conceptual.**

Se establece:

- Brand como identidad comercial del Business.
- Design System canónico común como dirección.
- Separación conceptual Platform ↔ Business Brand.
- Experiencia contextualizada por Membership como principio compatible con D-005.
- Navegación existente tratada como propuesta, no como requisito aprobado.

No se establece:

- tokens;
- colores;
- tipografías;
- componentes;
- breakpoints;
- rutas;
- permisos;
- roles concretos;
- modelo físico de Brand;
- contratos;
- invariantes;
- tests;
- implementación.

**Decisiones creadas: 0. Requisitos inventados: 0. Tokens normativos creados: 0. Conflictos resueltos: 0.**

El siguiente dominio TO-BE puede continuar con **Platform & Governance**, antes de abordar Contracts,
Invariants, Tests y Plan.
