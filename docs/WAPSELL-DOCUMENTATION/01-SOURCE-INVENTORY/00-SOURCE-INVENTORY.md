# Wapsell — Source Inventory
**Status:** PROPOSED · Fase 1 (Source Inventory) completada 2026-09-24

Alcance de esta fase acordado explícitamente con el dueño: además de los archivos ya presentes en
`01-SOURCE-INVENTORY/SOURCES/`, se inventaría todo el material documental disperso en `docs/` y en
`assets/brand/` (specs en `.docx`, matrices en `.xlsx`, PDFs de diseño y de research). Se excluye
`docs/pos-admin-files/` por ser snippets de código/scaffolding, no documentación, y las imágenes
sueltas de `assets/brand/` y `docs/Design/Wapsell/KIckoff/` se agrupan como un único registro de
"activos visuales" por carpeta en vez de un SRC-ID por imagen (ver nota al final de la tabla).
Ningún archivo fue movido, editado ni borrado; todas las rutas son las reales del repositorio.

| Source ID | Documento | Tipo | Versión | Fecha | Estado | Autoridad aprox. | Uso primario |
|---|---|---|---|---|---|---|---|
| SRC-001 | `docs/.../SOURCES/HISTORICAL/SDD-especificacion-funcional-v0.1.md` | MD | v0.1 | mtime 2026-09-22 | DRAFT | Alta (spec funcional base del piloto) | Requirements + General Specification |
| SRC-002 | `docs/.../SOURCES/HISTORICAL/criterios-diseno-dueno-D01-D19.md` | MD | s/v (registro intermedio) | mtime 2026-09-19 | DRAFT | Media-alta (dirección de diseño del dueño, no dato cerrado) | Decision candidates |
| SRC-003 | `docs/.../SOURCES/HISTORICAL/prompt-scaffolding-opencode.md` | MD | v2 (reemplaza v1, no incluida en el corpus) | mtime 2026-09-19 | HISTORICAL (prompt ya ejecutado) | Media (instrucción técnica, no requisito de negocio) | Scaffolding / Technical documentation |
| SRC-004 | `docs/.../SOURCES/HISTORICAL/scaffolding-notas.md` | MD | log acumulativo, sin número de versión único | mtime 2026-09-23 | CURRENT (bitácora activa a esa fecha) | Media-alta (única fuente de evidencia de implementación real) | Evidence + Technical documentation |
| SRC-005 | `docs/.../SOURCES/HISTORICAL/spec-catalogo-productos.md` | MD | "Borrador para revisión" | mtime 2026-09-22 | PROPOSED, parcialmente SUPERSEDED (ver nota interna del propio doc, §4.1) | Media (propuesta no aprobada, con partes ya implementadas distinto a lo propuesto) | Specialized Specification |
| SRC-006 | `docs/.../SOURCES/HISTORICAL/spec-login-roles.md` | MD | s/v (sesión 22/09/2026) | mtime 2026-09-22 | APPROVED (decisiones técnicas marcadas "resueltas") | Alta para su alcance (RF-17) | Specialized Specification + Decision |
| SRC-007 | `docs/.../SOURCES/HISTORICAL/spec-modulos_ventas.md` | MD | v0.1 "borrador para revisión del dueño" | 2026-09-24 (fecha propia del doc) | PROPOSED | Alta para su alcance (módulo Ventas) | Specialized Specification |
| SRC-008 | `docs/Funcional Analysis/Modulo ventas - Informe funcional.docx` | DOCX | s/v | mtime 2026-09-24 | PROPOSED (insumo previo a SPEC) | Media | Requirements / Audit-like analysis |
| SRC-009 | `docs/Funcional Analysis/SPEC — Módulo de Ventas.docx` | DOCX | v0.1 | mtime 2026-09-24 | PROPOSED | Alta para su alcance | Specialized Specification (duplica contenido de SRC-007, ver Notas) |
| SRC-010 | `docs/WapSell docs/00-DOCUMENT-GOVERNANCE.md.txt` | TXT | NOT DETERMINABLE | mtime 2026-09-24 | NOT DETERMINABLE | NOT DETERMINABLE | Archivo vacío (0 bytes) — sin contenido que clasificar |
| SRC-011 | `docs/WapSell docs/Idea/Auditoría técnica y funcional.docx` | DOCX | HEAD 066bb91 (referencia a commit) | creado/modificado 2026-09-25 (metadata interna del docx) | CURRENT (auditoría de solo lectura sobre el repo real) | Alta (única fuente basada en lectura directa de código) | Audit + Evidence |
| SRC-012 | `docs/WapSell docs/Idea/WAPSELL SPEC General v1.0.docx` | DOCX | "v0.1" en el cuerpo (el nombre de archivo dice v1.0: discrepancia propia de la fuente) | creado/modificado 2026-09-25 | PROPOSED ("BORRADOR — NO APROBADO", literal en el documento) | Media (propuesta de producto, no confirmada) | General Specification (propuesta) |
| SRC-013 | `docs/WapSell docs/Idea/Wapsell_Informe_Integral_de_Producto.docx` | DOCX | "Versión conceptual" | metadata interna 2013-12-23 (ver Notas: metadata no confiable), mtime real de archivo 2026-09-24 | PROPOSED / conceptual | Media-baja (visión de producto, explícitamente conceptual) | General Specification (propuesta) / Vision document |
| SRC-014 | `docs/WapSell docs/Idea/Wapsell_E2E_Funcional_Modulos_y_Procesos_REENGINEERED.xlsx` | XLSX | "REENGINEERED" (sin número de versión) | creado 2026-09-25 | NOT DETERMINABLE (no se abrió el contenido de las hojas, solo estructura) | NOT DETERMINABLE | Data / Excel (mapa funcional E2E) |
| SRC-015 | `docs/WapSell docs/Idea/Wapsell_Matriz_Integral_del_Proyecto_REENGINEERED.xlsx` | XLSX | "REENGINEERED" | creado 2026-09-25 | NOT DETERMINABLE | NOT DETERMINABLE | Data / Excel (matriz integral: producto, arquitectura, roles, módulos, invariantes, gobernanza) |
| SRC-016 | `docs/WapSell docs/Idea/Wapsell_Sistema_Unificado_REENGINEERED.xlsx` | XLSX | "REENGINEERED" | creado 2026-09-25 | NOT DETERMINABLE | NOT DETERMINABLE | Data / Excel (incluye hoja `16_CONFLICTOS_PENDIENTES`, ver Notas) |
| SRC-017 | `docs/WapSell docs/Idea/Wapsell_Sistema_de_Datos_REENGINEERED.xlsx` | XLSX | "REENGINEERED" | creado 2026-09-25 | NOT DETERMINABLE | NOT DETERMINABLE | Data / Excel (modelo de datos, incluye módulo financiero/contable) |
| SRC-018 | `docs/Design/OTRA_RONDA_MAS_System_Design_v2.pdf` | PDF | v2.0 | "Última actualización: 24/09/2026 03:18" (dentro del propio PDF) | PROPOSED (documento de diseño técnico, no confirmado como decisión) | Media-baja (contradice fuertemente otras fuentes de mayor autoridad, ver 03-CONFLICTS) | Design / General Specification candidate |
| SRC-019 | `docs/Research/pedidoya/Acta-Inscripcion-Registro-Nacional-dez-Contribuyentes-RNC.pdf` | PDF | NOT DETERMINABLE | mtime 2026-09-23 | NOT DETERMINABLE | Baja / contexto de research | Other (research de un tercero — documento fiscal/legal, no de Wapsell/Otra Ronda Más) |
| SRC-020 | `assets/brand/Plantillas_Operativas_Otra_Ronda_Mas.docx` | DOCX | s/v | modificado 2026-09-21 (metadata interna) | NOT DETERMINABLE (no leído en profundidad) | NOT DETERMINABLE | Design / Technical documentation (plantillas operativas) |
| SRC-021 | `assets/brand/Plantillas_Operativas_Otra_Ronda_Mas.pdf` | PDF | s/v | NOT DETERMINABLE | NOT DETERMINABLE | NOT DETERMINABLE | Probable exportación de SRC-020 (no confirmado — no se abrió) |
| SRC-022 | `assets/brand/Plantillas_Otra_Ronda_Mas.docx` | DOCX | s/v | metadata interna 2013-12-23 (no confiable) | NOT DETERMINABLE | NOT DETERMINABLE | Design / Technical documentation |
| SRC-023 | `docs/Design/Wapsell/` (17 PNG sueltos + subcarpeta `KIckoff/` con 23 PNG) | PNG (grupo) | N/A | NOT DETERMINABLE | NOT DETERMINABLE | Baja (mockups visuales de concepto Wapsell, no leídos individualmente) | Design (grupo de activos, ver nota) |
| SRC-024 | `assets/brand/` (imágenes de logo, paleta, UI de Otra Ronda Más, ~35 PNG/JFIF + subcarpetas `Bebidas/`, `UIUX/`) | PNG/JFIF (grupo) | N/A | NOT DETERMINABLE | NOT DETERMINABLE | Media (activos de marca activamente referenciados por SRC-007/009 como "design system") | Design (grupo de activos, ver nota) |

## Nota sobre agrupamiento (SRC-023, SRC-024)

Siguiendo la regla de no inventar estructura no sustentada, no se asignó un SRC-ID por cada imagen
individual: son activos visuales sin metadata textual propia (sin fecha de creación confiable, sin
autor declarado, sin versión), y asignarles IDs individuales no aportaría trazabilidad adicional en
esta fase. Si en una fase posterior se necesita citar una imagen puntual (p. ej. como evidencia de
un diseño aprobado), se le asignará su propio SRC-ID derivado (`SRC-023-<archivo>` /
`SRC-024-<archivo>`) en ese momento.

## Notas generales de esta tabla

- **Rutas abreviadas** `docs/.../SOURCES/HISTORICAL/` = `docs/WAPSELL-DOCUMENTATION/01-SOURCE-INVENTORY/SOURCES/HISTORICAL/`.
- **Metadata de creación de archivos `.docx` generados por `python-docx`** (SRC-013, SRC-020, SRC-022) muestra `2013-12-23`, que es la fecha por defecto de esa librería cuando no se fija explícitamente — **NOT DETERMINABLE como fecha real de creación**, se usa el `mtime` del sistema de archivos como aproximación y se marca la discrepancia.
- **SRC-008/SRC-009 duplican contenido de SRC-007** ("SPEC — Módulo de Ventas") y de una fuente equivalente para el informe funcional: incluidos igual como fuentes separadas, porque son artefactos de archivo distintos (posible export/import entre un documento vivo de Claude Docs — ver `cp:description` con `Claude Docs node/...` en su metadata — y el `.md` versionado en Git). No se asume cuál es la fuente canónica; se registra como **CONFLICT CANDIDATE de duplicación** en `03-CONFLICTS`.
- **SRC-016 contiene una hoja `16_CONFLICTOS_PENDIENTES`**: sugiere que ese archivo ya trae su propio registro de conflictos detectados por su proceso de generación ("REENGINEERED"). No se leyó el contenido de esa hoja en esta fase (excede el alcance de Fase 1 abrir y transcribir every hoja de cada Excel); queda señalado como punto de atención prioritario para Fase 2/3.
- Todas las fuentes con fecha de archivo en 2026-09-2x son coherentes con la fecha de sistema reportada (2026-09-24), no se detectaron fechas imposibles.
