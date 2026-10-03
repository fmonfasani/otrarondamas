# WAPSELL — Documentación canónica

**Estado:** estructura documental reorganizada  
**Rama de trabajo:** `docs/reorganize-wapsell-documentation`  
**Fecha de reorganización:** 2026-10-03

Esta carpeta es la documentación de diseño y transformación de **Wapsell**, con **Otra Ronda Más** como primer Business/tenant de validación.

## Principio documental

La documentación sigue esta cadena:

`REQUIREMENTS → SPEC GENERAL → SPECIALIZED SPECS → ARCHITECTURE → CONTRACTS → INVARIANTS → TESTS/EVALS → PLAN → TASKS → IMPLEMENTATION → VALIDATION → REVIEW → DELIVERY`

La estructura separa deliberadamente:

- estado real verificable (**AS-IS**);
- definición funcional y técnica (**SPECIFICATIONS / DESIGN**);
- estado objetivo (**TO-BE**);
- cambios requeridos (**TRANSFORMATION**);
- preparación de implementación (**PLAN / TASKS**);
- trabajo específico de dominios y auditorías;
- material histórico o reconstruido.

## Estado R1–R8

Los baselines R1–R8 existentes se conservan y quedan agrupados según su función:

| Fase | Ubicación |
|---|---|
| R1 Requirements | `05-REQUIREMENTS/` |
| R2 Specialized Specs | `06-SPECIFICATIONS/SPECIALIZED/` |
| R3 Architecture | `07-DESIGN/ARCHITECTURE/BASELINE/` |
| R4 Contracts | `07-DESIGN/CONTRACTS/BASELINE/` |
| R5 Invariants | `07-DESIGN/INVARIANTS/BASELINE/` |
| R6 Tests / Evals | `07-DESIGN/TESTS-EVALS/BASELINE/` |
| R7 Transformation Plan | `11-IMPLEMENTATION-READINESS/PLAN/TRANSFORMATION/` |
| R8 Tasks | `11-IMPLEMENTATION-READINESS/TASKS/R8/` |

**Importante:** la existencia de R8 no implica autorización de implementación. Su propio baseline mantiene la separación entre preparación documental e implementación.

## Estructura

### `00-GOVERNANCE/`
Reglas de autoridad documental, source of truth, evidencia, conflictos, versionado y estado del proyecto.

### `01-SOURCES/`
Inventario y fuentes originales/históricas que alimentaron el diseño.

### `02-DISCOVERY/`
Conflictos y workshop de decisiones. Aquí se conserva el proceso de descubrimiento, no se lo confunde con decisiones canónicas.

### `03-DECISIONS/`
Decision Register, Owner rulings, reconciliaciones y cierres de decisiones.

### `04-ASIS/`
Baseline del sistema existente: producto, arquitectura, datos, identidad, autorización, módulos, flujos, integraciones, UI, branding y evidencia.

### `05-REQUIREMENTS/`
Requisitos reconciliados.

### `06-SPECIFICATIONS/`
Especificaciones canónicas y especializadas.

### `07-DESIGN/`
Diseño derivado de las especificaciones:
- Architecture
- Contracts
- Invariants
- Tests / Evals

Se separan baselines, derivados y auditorías para evitar mezclar autoridad con evidencia.

### `08-TOBE/`
Estado objetivo por dominio y experiencia.

### `09-TRANSFORMATION/`
Cambios necesarios para pasar de AS-IS a TO-BE, incluyendo identidad, tenancy, autorización, commerce, messaging, branding, arquitectura y migración.

### `10-TRACEABILITY/`
Trazabilidad entre requirements, specs, dominios, módulos, entidades, API/UI, E2E, tests y evidencia.

### `11-IMPLEMENTATION-READINESS/`
Material previo a implementación:
- planes de transformación;
- planes de implementación;
- R8 Tasks;
- baselines controlados de tareas.

### `12-DOMAIN-WORK/`
Trabajo controlado específico de dominios que evolucionó posteriormente al baseline general, actualmente principalmente:
- Identity & Tenancy
- Messaging
- paquetes de diseño controlado

Este material se conserva separado para que su evolución no se confunda con la cadena canónica R1–R8.

### `13-AUDIT/`
Auditorías y evidencia de repositorio, código, schema, migraciones, bases de datos y readiness.

### `14-ANNEXES/`
Material de soporte y registros auxiliares, incluyendo deuda técnica.

### `15-HISTORY/`
Material reconstruido, derivado o histórico que debe conservarse para trazabilidad pero no utilizarse como fuente canónica.

## Reglas de autoridad

No asumir que un documento está aprobado por el solo hecho de existir.

La evidencia debe clasificarse como:

- **VERIFICADO POR CÓDIGO**
- **VERIFICADO POR TEST**
- **VERIFICADO POR EJECUCIÓN**
- **DOCUMENTADO**
- **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE**

La documentación canónica no reemplaza la evidencia del código y los tests para describir el estado real.

## Regla de evolución

La reorganización es documental. No cambia requisitos, decisiones, contratos, invariants, arquitectura, schema, datos ni implementación.

Los documentos reconstruidos permanecen accesibles bajo `15-HISTORY/RECONSTRUCTED-DRAFTS/` y no se promocionan automáticamente a canonical.

## Próximo ciclo

La secuencia documental continúa con:

`R8 REVIEW / APPROVAL → READY TASKS → IMPLEMENTATION → VALIDATION → EVIDENCE → DELIVERY`

Cualquier promoción de un artefacto de PROPOSED/DRAFT a APPROVED requiere la autoridad correspondiente y debe quedar trazable.
