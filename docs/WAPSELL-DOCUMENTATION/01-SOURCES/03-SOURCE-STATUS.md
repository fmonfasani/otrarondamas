# Wapsell — Source Status
**Status:** PROPOSED · Fase 1

Clasificación de cada fuente según el vocabulario pedido: CURRENT, HISTORICAL, PROPOSED, DRAFT,
APPROVED, SUPERSEDED, UNKNOWN. Donde una fuente mezcla estados en su propio contenido (frecuente en
este corpus), se listan todos los aplicables con la sección que sustenta cada uno.

| Source ID | Estado(s) | Sustento |
|---|---|---|
| SRC-001 | DRAFT | El propio título dice "Borrador funcional v0.1 · Pendiente de validación del dueño" (línea 3-4 del documento) |
| SRC-002 | DRAFT (categoría propia: "registro intermedio") | No suplanta ni aprueba nada por sí mismo; ver cita textual del dueño en el propio documento |
| SRC-003 | HISTORICAL (ejecutado) + CURRENT (referenciado activamente) | SRC-004 documenta su ejecución completa; SRC-007 lo sigue citando como fuente vigente para el módulo de Ventas |
| SRC-004 | CURRENT | Es un log que se sigue extendiendo; mtime es el más reciente de las fuentes .md leídas en detalle salvo SRC-007 |
| SRC-005 | DRAFT + PROPOSED, con una sub-sección SUPERSEDED | Sección 4.1 del propio archivo declara que su modelo de Categoría original quedó reemplazado por lo implementado; el resto del documento sigue sin aprobar |
| SRC-006 | APPROVED (parcial) + DRAFT (parcial) | Sección 5 declara 4 decisiones "resueltas"; sección 7 deja 3 puntos explícitamente no cerrados |
| SRC-007 | DRAFT | "v0.1 — borrador para revisión del dueño" explícito en la ficha (sección 1) |
| SRC-008 | DRAFT / "Propuesta - insumo" | Ficha del documento, campo "Estado" |
| SRC-009 | DRAFT | Contenido inicial idéntico a SRC-007 |
| SRC-010 | UNKNOWN | Archivo vacío, no hay estado que determinar |
| SRC-011 | CURRENT | Auditoría puntual "solo lectura" fechada y referenciada a un commit concreto (`HEAD 066bb91`); no se auto-declara como reemplazable |
| SRC-012 | DRAFT | "BORRADOR — NO APROBADO" literal en el propio documento |
| SRC-013 | DRAFT ("conceptual") | "Versión conceptual" declarado en el propio título |
| SRC-014 | UNKNOWN | No se abrió contenido; no hay indicación de estado en la metadata disponible |
| SRC-015 | UNKNOWN | Ídem |
| SRC-016 | UNKNOWN | Ídem — nótese que el nombre de una de sus hojas (`16_CONFLICTOS_PENDIENTES`) sugiere que el propio archivo se autoclasifica contenido como pendiente, pero no se confirmó leyendo la hoja |
| SRC-017 | UNKNOWN | Ídem |
| SRC-018 | DRAFT/PROPOSED (inferido, no autodeclarado) | El documento no trae una etiqueta de estado explícita como el resto del corpus; se infiere PROPOSED por su fuerte discrepancia con decisiones ya tomadas en otras fuentes de mayor antigüedad y especificidad (ver conflictos) — **esta inferencia de estado queda marcada como la única de esta tabla que no se apoya en una declaración textual directa de la fuente misma** |
| SRC-019 | UNKNOWN | No se abrió el contenido |
| SRC-020 | UNKNOWN | No se abrió el contenido, solo metadata de archivo |
| SRC-021 | UNKNOWN | Ídem |
| SRC-022 | UNKNOWN | Ídem |
| SRC-023 | UNKNOWN | Activos visuales sin metadata de estado |
| SRC-024 | UNKNOWN | Ídem, aunque con mayor indicio de vigencia por ser citado desde SRC-007/009 |

## Fuentes HISTORICAL explícitas o candidatas, con qué conservan

- **SRC-003** (prompt de scaffolding v2): conserva la decisión de stack técnico (NestJS/Prisma/Postgres/React-Vite) y el modelo de datos inicial completo propuesto — sigue siendo la referencia de diseño técnico aunque ya fue "ejecutado".
- **SRC-005** (spec-catálogo): conserva, en su propia sección 4.1, tanto la propuesta original (5 niveles jerárquicos, opcionales) como el registro de qué se implementó realmente en su lugar (4 niveles obligatorios con nodo "GEN") — es un caso donde una misma fuente documenta su propia evolución sin que haya sido reescrita, cumpliendo el principio de no sobrescribir historia.
- **SRC-018**: si se confirma en una fase posterior que es una fuente antigua/paralela sin relación de autoridad con SRC-001/003, debe conservarse igual como evidencia de una línea de diseño alternativa que existió, no descartarse.

## Fuentes cuyo estado depende de resolver primero un conflicto (ver `03-CONFLICTS`)

- **SRC-001/003/004 (línea "Otra Ronda Más standalone")** vs. **SRC-012/013/014-017/023 (línea "Wapsell plataforma multi-tenant conversacional")**: son dos visiones de alcance de producto mutuamente incompatibles tal como están escritas. Ninguna de las dos se marca aquí como SUPERSEDED porque ninguna fuente declara explícitamente haber reemplazado a la otra — se documentan ambas como vigentes hasta que exista una DECISION explícita al respecto.
- **SRC-007 vs. SRC-009**: posible duplicado exacto o casi exacto; su estado real (¿son la misma fuente en dos formatos, o divergieron?) no pudo determinarse completo en esta fase.

## Resumen de NOT DETERMINABLE / UNKNOWN

13 de las 24 fuentes catalogadas (SRC-010, 014–017, 019–024) quedan en UNKNOWN o con la mayoría de
sus campos NOT DETERMINABLE, porque esta fase no incluyó abrir el contenido completo de archivos
binarios pesados (xlsx multi-hoja, PDFs de terceros, imágenes) más allá de metadata de sistema y,
cuando fue posible, un extracto de texto inicial. Esto es deliberado: la regla fundamental de esta
fase es no completar vacíos con inferencia. Estas fuentes quedan señaladas como candidatas
prioritarias a profundizar en Fase 2 si su contenido resulta relevante para AS-IS.
