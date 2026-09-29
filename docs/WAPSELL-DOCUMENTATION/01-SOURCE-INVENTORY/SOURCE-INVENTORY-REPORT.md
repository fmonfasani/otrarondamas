# SOURCE INVENTORY REPORT — Fase 1
**Fecha:** 2026-09-24 · **Alcance acordado con el dueño:** todo el material documental de `docs/` y
`assets/brand/` relevante a Wapsell/Otra Ronda Más, excluyendo `docs/pos-admin-files/` (código, no
documentación). Ningún archivo fuente fue movido, editado ni borrado.

## Summary

**24 fuentes** catalogadas con Source ID (SRC-001 a SRC-024), de las cuales 22 son documentos
individuales y 2 son agrupaciones de activos visuales sin metadata textual propia (SRC-023, SRC-024
— ver nota de agrupamiento en `00-SOURCE-INVENTORY.md`). Contando cada imagen suelta, el corpus
físico real supera los 60 archivos.

## By type

| Tipo | Cantidad |
|---|---|
| MD | 7 (SRC-001 a 007) |
| DOCX | 8 (SRC-008, 009, 011, 012, 013, 020, 022, y el .txt vacío SRC-010 se cuenta aparte) |
| TXT | 1 (SRC-010, vacío) |
| XLSX | 4 (SRC-014 a 017) |
| PDF | 3 (SRC-018, 019, 021) |
| PNG/JFIF (agrupados) | 2 grupos (SRC-023 ≈40 archivos, SRC-024 ≈35+ archivos) |

## By classification

(una fuente puede contar en más de una categoría; ver detalle en `01-SOURCE-CLASSIFICATION.md`)

| Categoría | Fuentes |
|---|---|
| REQUIREMENTS | SRC-001, 002, 008, 012 |
| GENERAL SPECIFICATION | SRC-001, 012, 013, 015 (candidata), 018 |
| SPECIALIZED SPECIFICATION | SRC-001, 005, 006, 007, 009 |
| AUDIT | SRC-008, 011 |
| TECHNICAL DOCUMENTATION | SRC-003, 004, 014, 015, 016, 017, 020, 022 |
| SCAFFOLDING | SRC-003 |
| DECISION | SRC-002, 006 |
| DESIGN | SRC-018, 020, 021, 022, 023, 024 |
| LEGACY | SRC-005 (parcial) |
| DATA / EXCEL | SRC-014, 015, 016, 017 |
| EVIDENCE | SRC-004, 011 |
| OTHER | SRC-010 (vacío), SRC-013 (visión/conceptual), SRC-019 (tercero) |

## Historical documents

- **SRC-003** (prompt-scaffolding-opencode v2) — ya ejecutado según evidencia de SRC-004, pero sigue vigente como referencia de diseño técnico.
- **SRC-005** (spec-catalogo-productos), sección 4.1 — conserva explícitamente su propuesta original superada junto al registro de qué se implementó en su lugar.

No se identificó ninguna fuente que sea un "historical spec" completo y plenamente reemplazado
por otro documento del corpus — el patrón dominante en este proyecto es que las fuentes se
actualizan con notas internas ("Actualización: ...") en vez de crear una versión nueva separada.

## Current / potentially current documents

SRC-001, 002, 004, 006, 007, 008, 009, 011, 012, 013 (a su fecha, sin indicación de reemplazo).
SRC-014 a 017 y SRC-018 a 024 quedan como UNKNOWN respecto de vigencia (ver `03-SOURCE-STATUS.md`).

## Documents with implementation evidence

- **SRC-004** (scaffolding-notas.md): evidencia directa de ejecución (comandos, códigos de
  respuesta HTTP, bugs encontrados y resueltos). La fuente más rica en evidencia VERIFIED BY
  EXECUTION del corpus, aunque no leída en su totalidad (ver limitación abajo).
- **SRC-011** (Auditoría técnica y funcional.docx): evidencia por lectura directa de código
  (cifras de modelos, handlers, cobertura de tests, contradicciones) referenciada contra un commit
  específico. Solo se leyó su extracto inicial en esta fase.
- **SRC-001** §7.1 contiene evidencia verificada por inspección de un repositorio externo
  (`wapsell`, no el propio), relevante para decisiones de arquitectura pero no para el estado de
  Otra Ronda Más en sí.

Ninguna otra fuente del corpus aporta evidencia de implementación verificable; todo lo demás es
DOCUMENTED o NOT DETERMINABLE según la Evidence Policy.

## Documents containing proposed behavior

Prácticamente todas las specs (SRC-001, 002, 005, 006, 007, 009, 012, 013, 018) contienen
comportamiento propuesto no implementado. Las más extensas en este sentido son SRC-007 (30
requisitos, 18 reglas de negocio, contratos de API completos) y SRC-018 (arquitectura y roadmap
completos, sin ninguna marca de "pendiente" — ver Conflict Candidates).

## Decision candidates

Ver detalle completo en `04-DECISIONS/00-DECISION-REGISTER.md` (a construir en fase de decisiones;
por ahora, candidatas identificadas y dejadas sin cerrar):

1. **D-01 a D-19** (SRC-001 §10 / SRC-002): 19 decisiones de negocio con "dirección de diseño
   aprobada" pero dato comercial concreto pendiente.
2. **D-20 / RF-17** (SRC-006 §5): 4 decisiones técnicas marcadas "resueltas" (modelo Cliente/Usuario
   separado, storage de legajo en disco local fuera de webroot, tracking de vencimiento, Resend
   como proveedor de email transaccional).
3. **D-VTA-01 a D-VTA-14** (SRC-007 §14): 14 decisiones específicas del módulo de Ventas, 5 de
   ellas bloqueantes del MVP (D-VTA-01, 02, 04, 05, 07).
4. **Restricciones nuevas explícitas del dueño** (SRC-002, sección final): 7 reglas de diseño
   (no PIN en texto plano, ningún proceso se autoautoriza, bloqueo por lote no por producto, no
   inferir conversión de presentación, no asumir costo de zona sin match, no aplicar cobro a deuda
   sin regla definida, presentar costos antes de contratar infraestructura) — candidatas a
   invariantes formales, pendientes de confirmación explícita del dueño sobre su alcance.
5. **Discrepancia de stack en SRC-001 §7.3** (declarada "desactualizada" por SRC-003, pero nunca
   editada de vuelta en SRC-001) — candidata a una decisión formal de "actualizar SRC-001 §7.3"
   simplemente documental, sin implicar cambio de producto.

## Conflict candidates

1. **CONFLICT CANDIDATE — Alcance de producto (el más significativo del corpus).**
   SRC-001/003/004 (y SRC-011 como evidencia de código) describen "Otra Ronda Más" como una
   aplicación **standalone e independiente**, sin dependencia de código con Wapsell, desplegada en
   su propio dominio (`otrarondamas.wapsell.com`) simplemente por convención de nombre de host.
   SRC-012/013 y el grupo SRC-014–017/023 describen **Wapsell como una plataforma multi-tenant de
   comercio conversacional** en la que "Otra Ronda Más" sería el primer Business/tenant —
   arquitectura de negocio, no solo de código, mutuamente incompatible con la anterior salvo que se
   defina una migración explícita. SRC-011 confirma por lectura de código que Wapsell (el repo real
   inspeccionado) hoy no tiene messaging ni multi-tenant de negocios genérico, lo que es evidencia
   en contra de que la visión de SRC-012/013 esté implementada, pero no resuelve si es la dirección
   *futura* aprobada.

2. **CONFLICT CANDIDATE — Arquitectura técnica.**
   SRC-003/SRC-004 fijan como decisión ya tomada: NestJS + Prisma + PostgreSQL + React/Vite (SPA,
   sin SSR), Docker Compose simple para desarrollo, sin Kubernetes, sin GraphQL. SRC-018 (System
   Design v2.0) propone Kubernetes con autoscaling, GraphQL como opción, 2FA, PCI DSS, ELK Stack,
   CI/CD con staging formal — un nivel de infraestructura sustancialmente mayor y sin ninguna
   sección de "pendiente" pese a solaparse en fecha (24/09/2026) con el resto del corpus.

3. **CONFLICT CANDIDATE — Alcance funcional (contabilidad/fiscal).**
   SRC-001 §2.2 excluye explícitamente del MVP "contabilidad completa y asientos contables
   automáticos" y "facturación fiscal electrónica". SRC-017 (Wapsell_Sistema_de_Datos_REENGINEERED)
   incluye hojas `16_CONTABILIDAD`, `17_FINANZAS_TESORERIA`, `19_IMPUESTOS`, `20_REPORTES_FINANCIEROS`
   — no se confirmó el contenido, pero el nombre de las hojas por sí solo contradice el alcance
   declarado del MVP.

4. **CONFLICT CANDIDATE — Duplicación de fuentes sin fuente canónica declarada.**
   SRC-007 (.md) y SRC-009 (.docx) tienen título y contenido inicial idénticos ("SPEC — Módulo de
   Ventas", "Sep 24, 2026 · @Monfasani Federico"). La metadata de SRC-009 sugiere origen en una
   plataforma externa (Claude Docs, revisión 25). No se determinó si son idénticas en su totalidad,
   si una es una exportación desincronizada de la otra, o si divergieron. Mismo patrón entre el
   informe funcional en SRC-008 (.docx) y un posible equivalente en .md no incluido en SOURCES/.

5. **CONFLICT CANDIDATE — Rol del actor "Cliente mayorista" y su acceso.**
   Registrado dentro de la propia SRC-006 como una corrección durante la sesión de definición (no
   es un conflicto entre dos fuentes distintas, sino un conflicto ya resuelto internamente): se
   deja mencionado aquí porque el patrón de razonamiento ("se asumió lo contrario inicialmente")
   podría repetirse en otras fuentes no revisadas con el mismo detalle.

6. **CONFLICT CANDIDATE — Autonumeración de versión.**
   SRC-012: el nombre de archivo dice "v1.0", el cuerpo del documento dice "Versión: v0.1". No se
   resuelve cuál es la versión real.

## Missing information

- Contenido completo de **SRC-004** más allá de la línea 323 (de 939 totales) — quedan sin leer las
  secciones posteriores a "Importación del catálogo real Lista minorista al seed", que según su
  propio índice progresan hasta al menos una "sección 10" adicional no confirmada como final.
- Contenido interno de las **4 hojas de cálculo REENGINEERED** (SRC-014 a 017) — se inventariaron
  únicamente nombres de hoja y metadata del paquete, no los datos ni fórmulas.
- Contenido completo de **SRC-011** (Auditoría técnica y funcional) más allá del extracto inicial
  (~3000 de aproximadamente 64.000 caracteres).
- Contenido de **SRC-012/013** más allá de sus primeras secciones (~3000 caracteres cada una).
- Contenido de **SRC-018** más allá de lo ya extraído (el PDF completo de 15 páginas sí fue leído
  íntegramente, a diferencia de los .docx).
- Contenido de los **PDFs SRC-019 y SRC-021** — no abiertos en absoluto.
- Contenido de **SRC-020/022** (Plantillas Otra Ronda Más, .docx) — no abierto.
- Metadata de autoría y fecha de las **imágenes agrupadas en SRC-023/024** — no extraída (requeriría
  inspeccionar EXIF/metadata de cada PNG individualmente, fuera del alcance práctico de esta fase).
- **No existe en este corpus la versión v1 del prompt de scaffolding** que SRC-003 menciona haber
  reemplazado ("auditada por separado") — esa auditoría de la v1 tampoco está presente.
- **No se pudo confirmar la relación exacta entre SRC-007/SRC-009** ni entre SRC-008 y un eventual
  .md equivalente no presente en SOURCES/.

## Recommendations for next phase

(recomendaciones exclusivamente documentales, no de producto ni de arquitectura, según lo pedido)

1. Antes de iniciar AS-IS, decidir con el dueño si el eje "Otra Ronda Más standalone" (SRC-001/003/004)
   o el eje "Wapsell plataforma" (SRC-012/013/014-017) es el que gobierna la reconstrucción AS-IS, o
   si ambos deben reconstruirse en paralelo como dos AS-IS distintos hasta que exista una DECISION
   formal de alcance. Este documento no recomienda cuál elegir.
2. Completar la lectura de SRC-004 en su totalidad antes de dar por cerrado el inventario de
   evidencia de implementación — es la fuente más rica en hechos verificables y solo un tercio fue
   revisado en esta fase.
3. Abrir el contenido real (no solo nombres de hoja) de los 4 archivos `.xlsx` REENGINEERED,
   priorizando la hoja `16_CONFLICTOS_PENDIENTES` de SRC-016, que podría ya contener un registro de
   conflictos preparado por su proceso de generación y ahorrar trabajo de detección manual.
4. Resolver la duplicación SRC-007/SRC-009 (y el par equivalente de SRC-008) confirmando cuál
   archivo es la fuente editable/canónica antes de citarlos en fases posteriores, para no propagar
   una cita a una copia desactualizada.
5. Determinar el origen y la relación de autoría de los archivos "REENGINEERED" (generados por
   OpenAI/openpyxl) — si fueron producidos por un proceso ajeno a este proyecto y simplemente
   depositados en el repo, su nivel de autoridad documental debe fijarse explícitamente antes de
   citarlos como fuente en el Canonical Spec.
6. Confirmar si `docs/Research/pedidoya/` y su único PDF son, en efecto, material de research de
   competencia/proveedor (inferencia actual basada solo en el nombre de carpeta) o pertenecen a otro
   propósito no relacionado con Wapsell/Otra Ronda Más.

## STOP CONDITION

Fase 1 — Source Inventory completada. No se avanza a Fase 2 (AS-IS Reconstruction) sin nueva
instrucción explícita.
