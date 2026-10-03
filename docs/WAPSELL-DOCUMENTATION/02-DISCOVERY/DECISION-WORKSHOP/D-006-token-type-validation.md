# D-006 — ¿Cómo se enforcing la validación de tipo de token en todos los endpoints para prevenir el acceso entre identidades (`Cliente` vs `Usuario`), especialmente con la nueva identidad `User` global?

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: HIGH

Domain: Security, Authorization, Identity

Related conflicts: CON-015 (Riesgo de Seguridad: Tokens de `Cliente` aceptados en Panel sin Type Guard (AS-IS, R01 de SRC-011) vs. Visión de Identidad Unificada (DEC-001))

## Decision Question
Define la estrategia e implementación para hacer cumplir de manera robusta la validación del tipo de token en todos los endpoints de la API de Wapsell. Esto es crucial para prevenir el acceso entre identidades (e.g., un token `Cliente` accediendo a endpoints de `pos-admin`) y para garantizar una autorización segura bajo el nuevo modelo de identidad `User` global, donde `Usuario` y `Cliente` podrían converger.

## AS-IS Evidence
- `05-ASIS/05-ASIS-AUTHORIZATION.md`: "**R01**: tokens de `Cliente` de tienda aceptados en el panel sin guard por `type` — alcanzarían endpoints sin `@RequierePermiso` (`GET /clientes`, `/proveedores`, `/compras`, `/inventario`, `/caja`)." (DOCUMENTED - SRC-011 R01)
- `05-ASIS/05-ASIS-AUTHORIZATION.md`: "Esta sesión **no los re-verificó línea por línea** — se listan con su clasificación original (DOCUMENTED, heredado)." (NOT DETERMINABLE - estado actual)
- `05-ASIS/04-ASIS-IDENTITY.md`: "Dos identidades separadas comparten el mismo mecanismo de JWT, discriminadas por un campo `type` en el payload." (VERIFIED BY CODE)

## Why This Decision Exists
Existe un riesgo de seguridad documentado (R01 de SRC-011, CON-015) que indica que los tokens de `Cliente` podrían obtener acceso no autorizado a los endpoints de `pos-admin` debido a la falta de validación de tipo. Con la visión TO-BE de una identidad `User` global (DEC-001), este riesgo se exacerba, haciendo que la aplicación explícita del tipo de token sea crítica para la `SECURITY_CONFLICT`.

## Alternatives
- **Implementar un guard JWT global para verificar el campo `type` en el payload:** Un guard central intercepta todas las solicitudes y valida el `type` contra los tipos de endpoint permitidos. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Segregación de endpoints basada en roles:** Asegurarse de que los roles (derivados de `Membership`) restrinjan inherentemente el acceso según el tipo de usuario. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Refinar el `@RequierePermiso` existente para incluir verificaciones de tipo:** Añadir validación de tipo explícita a los decoradores de permisos. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (CON-015):** "Vulnerabilidad de seguridad crítica que podría permitir acceso no autorizado, impactando la integridad del sistema."
- **INFERRED:** Previene el acceso y manipulación de datos no autorizados, garantiza el cumplimiento de las políticas de seguridad, potencialmente añade complejidad a la lógica de los guards.

## Dependencies
- Blocks: NONE
- Depends On: D-002 (DIRECT), D-005 (INDIRECT)

## Affected Documents
- `05-ASIS/05-ASIS-AUTHORIZATION.md`
- `02-CANONICAL-SPEC/01-IDENTITY-AND-TENANCY-SPEC.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-015)
- Módulos de autenticación y autorización (`auth/`, guards).
- Todos los endpoints de la API potencialmente accesibles por diferentes tipos de usuario.

## Implementation Impact
- Implementación de guards JWT nuevos o mejorados con validación del `type` del payload.
- Revisión y posible modificación de los decoradores `@RequierePermiso` existentes.
- Pruebas de todos los endpoints para un control de acceso correcto basado en el tipo.

## Open Questions
- ¿La validación del tipo de token debe implementarse a nivel global o por módulo/endpoint?
- ¿Cómo evolucionará el campo `type` en el payload del JWT con una identidad `User` unificada?
- ¿Existen casos excepcionales (e.g., llamadas internas de servidor a servidor) que necesiten exención de la validación de tipo?

## Decision: PENDING
## Approval: PENDING

---

## POST-WORKSHOP DECISION RECONCILIATION (2026-09-28)

> Everything above this line is the **historical workshop record**, preserved verbatim. The
> original `Status: PENDING` / `## Decision: PENDING` / `## Approval: PENDING` markers were
> the document state as produced in Phase 3.5. They are retained as history, not as current state.

**Owner confirmation:** the Owner confirms this decision was APPROVED during the Decision Workshop.

**Repository evidence of decision text:** none, beyond what DEC-001 provides (below).
### Reconstructable decision text
**NOT DETERMINABLE.** RECONSTRUCTED TEXT NOW EXISTS - see 04-DECISIONS/00-DECISION-REGISTER.md section 4 (provenance: DERIVED / RECONSTRUCTED, not Owner-verified). DEC-001 does not address it. The question, AS-IS evidence, alternatives and Open Questions above are preserved verbatim as the historical workshop record and remain unresolved.

### Reconciled status

| Field | Value |
|---|---|
| ID | `D-006` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---