# Wapsell — Source Classification
**Status:** PROPOSED · Fase 1

Categorías usadas (una fuente puede pertenecer a más de una): REQUIREMENTS, GENERAL SPECIFICATION,
SPECIALIZED SPECIFICATION, AUDIT, TECHNICAL DOCUMENTATION, SCAFFOLDING, DECISION, DESIGN, LEGACY,
DATA / EXCEL, EVIDENCE, OTHER.

| Source ID | Categorías asignadas | Justificación breve |
|---|---|---|
| SRC-001 (SDD v0.1) | REQUIREMENTS, GENERAL SPECIFICATION | Define objetivo, alcance, actores, 17 RF, invariantes y estados del MVP de Otra Ronda Más. Es la especificación funcional general del piloto. |
| SRC-002 (criterios-diseno-dueno) | DECISION, REQUIREMENTS | Registra respuestas explícitas del dueño a 19 decisiones pendientes del SDD; el propio documento se autodefine como "no reemplaza al SDD", por eso no es GENERAL SPECIFICATION en sí mismo. |
| SRC-003 (prompt-scaffolding-opencode v2) | SCAFFOLDING, TECHNICAL DOCUMENTATION | Es literalmente un prompt de instrucción técnica para generar scaffolding de código; no contiene requisitos de negocio nuevos, solo los traduce a estructura técnica. |
| SRC-004 (scaffolding-notas) | EVIDENCE, TECHNICAL DOCUMENTATION | Bitácora con comandos ejecutados y resultados observados (builds, requests HTTP, códigos de estado) — es la fuente con mayor densidad de afirmaciones verificables por evidencia directa de ejecución. |
| SRC-005 (spec-catalogo-productos) | SPECIALIZED SPECIFICATION, LEGACY (parcial) | Especificación propuesta para Catálogo; su propia sección 4.1 se marca a sí misma como parcialmente superada por una implementación real distinta — combina propuesta vigente y contenido histórico en el mismo archivo. |
| SRC-006 (spec-login-roles) | SPECIALIZED SPECIFICATION, DECISION | Detalla RF-17 y dos decisiones técnicas ("D-20") que el propio documento marca como resueltas. |
| SRC-007 (spec-modulos_ventas .md) | SPECIALIZED SPECIFICATION | Especificación funcional y de UI/UX completa del módulo de Ventas, con requisitos, reglas, contratos de API, invariantes y 14 decisiones pendientes propias (D-VTA-xx). |
| SRC-008 (Informe funcional Ventas .docx) | REQUIREMENTS, AUDIT | Se autodescribe como "análisis funcional previo a la SPEC", contrastando lo implementado contra la SPEC general — funciona como una auditoría funcional acotada al módulo de Ventas. |
| SRC-009 (SPEC Módulo de Ventas .docx) | SPECIALIZED SPECIFICATION | Mismo rol que SRC-007; ver nota de duplicación en `00-SOURCE-INVENTORY.md`. |
| SRC-010 (00-DOCUMENT-GOVERNANCE.md.txt) | OTHER | Archivo vacío, sin contenido clasificable. |
| SRC-011 (Auditoría técnica y funcional .docx) | AUDIT, EVIDENCE | Explícitamente "solo lectura — no se modificó, creó ni borró nada"; reporta cifras concretas de código (42 modelos, 0% cobertura de tests, 24 contradicciones detectadas) — es la fuente de evidencia más directa sobre el estado real del código. |
| SRC-012 (WAPSELL SPEC General v1.0 .docx) | GENERAL SPECIFICATION, REQUIREMENTS | Propuesta de producto de alcance general para Wapsell (no Otra Ronda Más específicamente); el propio documento se etiqueta "BORRADOR — NO APROBADO". |
| SRC-013 (Informe Integral de Producto) | GENERAL SPECIFICATION (propuesta), OTHER (visión/marketing) | Documento de visión de producto ("Versión conceptual"), más discursivo que normativo; no fija requisitos verificables. |
| SRC-014 (E2E Funcional xlsx) | DATA / EXCEL, TECHNICAL DOCUMENTATION | Matriz de mapeo funcional end-to-end entre módulos; no se abrió el contenido de las hojas en esta fase, la clasificación se basa en nombres de hoja y metadata. |
| SRC-015 (Matriz Integral xlsx) | DATA / EXCEL, GENERAL SPECIFICATION (candidata), TECHNICAL DOCUMENTATION | Sus nombres de hoja (`12_Requisitos`, `13_Invariantes`, `17_Decisiones`, `18_Roadmap`) sugieren que replica en formato tabular gran parte del contenido que en otras fuentes está en prosa — no se confirmó el contenido real. |
| SRC-016 (Sistema Unificado xlsx) | DATA / EXCEL, TECHNICAL DOCUMENTATION | Incluye explícitamente una hoja de conflictos pendientes (`16_CONFLICTOS_PENDIENTES`) y una de crosswalk de terminología — sugiere que este archivo ya intentó una reconciliación entre fuentes por su cuenta; no se validó ese contenido. |
| SRC-017 (Sistema de Datos xlsx) | DATA / EXCEL, TECHNICAL DOCUMENTATION | Modelo de datos con extensión hacia módulo financiero/contable (`16_CONTABILIDAD`, `17_FINANZAS_TESORERIA`, `19_IMPUESTOS`) — nótese que esto contradice el alcance explícito de SRC-001 §2.2 ("fuera del alcance inicial: contabilidad completa... facturación fiscal electrónica"). Ver `03-CONFLICTS`. |
| SRC-018 (System Design Document v2.0 pdf) | DESIGN, GENERAL SPECIFICATION (propuesta) | Documento de diseño de sistema con arquitectura, stack, roadmap y seguridad propuestos — en fuerte tensión con el stack y alcance ya decididos en SRC-001/SRC-003. Ver `03-CONFLICTS`. |
| SRC-019 (Acta RNC PedidosYa pdf) | OTHER | Documento de un tercero (registro fiscal), sin vínculo textual confirmado con Wapsell/Otra Ronda Más más allá de estar en una carpeta `Research/pedidoya/`; no se abrió su contenido completo. |
| SRC-020/021/022 (Plantillas Otra Ronda Más) | DESIGN, TECHNICAL DOCUMENTATION | Nombre y ubicación (`assets/brand/`) sugieren plantillas operativas de branding/documentos comerciales; no se leyó su contenido interno en esta fase. |
| SRC-023 (PNG Design/Wapsell + KIckoff) | DESIGN | Mockups visuales de concepto Wapsell (nombre de carpeta "KIckoff" sugiere sesión de arranque de proyecto); no interpretados individualmente. |
| SRC-024 (PNG assets/brand) | DESIGN | Activos de marca de Otra Ronda Más; SRC-007/009 los referencian activamente como "design system" para la SPEC de Ventas, lo que les da mayor peso funcional que a SRC-023. |

## Fuentes sin evidencia de implementación (aclaración transversal)

Ninguna fuente de esta lista, por sí sola, constituye VERIFIED BY CODE / VERIFIED BY TEST / VERIFIED
BY EXECUTION según la política de evidencia (`00-GOVERNANCE/02-EVIDENCE-POLICY.md`). La única fuente
con afirmaciones basadas en ejecución real observada es **SRC-004** (comandos y resultados HTTP
documentados) y, de forma más sistemática y por lectura directa de código (no ejecución), **SRC-011**.
El resto son DOCUMENTED en el mejor de los casos. Ver `03-SOURCE-STATUS.md` para el detalle por
fuente.
