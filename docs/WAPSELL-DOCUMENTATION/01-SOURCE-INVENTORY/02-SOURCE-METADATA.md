# Wapsell — Source Metadata
**Status:** PROPOSED · Fase 1

Para cada fuente: campos pedidos por el protocolo. `NOT DETERMINABLE` donde el dato no está
disponible en el propio archivo o su metadata de sistema — no se completó con inferencia.

---

### SRC-001 — SDD-especificacion-funcional-v0.1.md
- **Filename:** SDD-especificacion-funcional-v0.1.md · **Tipo:** MD
- **Título:** "Especificación funcional SDD — MVP piloto"
- **Autor:** NOT DETERMINABLE (sin metadata de autor; el .md no tiene front-matter de autoría)
- **Fecha de creación:** NOT DETERMINABLE (el nombre indica v0.1; el cuerpo cita una sesión del 22/09/2026 como última actualización registrada) · **Modificación (mtime):** 2026-09-22
- **Versión:** v0.1 (explícita en el título) · **Origen:** Repositorio (`docs/`, ahora movido a SOURCES/HISTORICAL)
- **Estado:** DRAFT / "Pendiente de validación del dueño" (literal)
- **Alcance:** General — todo el MVP del piloto
- **Autoridad aprox.:** Alta (es la base de la que derivan SRC-002, SRC-003, SRC-005, SRC-006, SRC-007)
- **¿Actual o histórico?:** Mixto — el cuerpo mismo dice que fue actualizado en sesiones posteriores (20/09, 22/09) sin cambiar el número de versión v0.1
- **¿Contiene requisitos?:** Sí (RF-01 a RF-17) · **¿Decisiones?:** Sí (D-20 marcada resuelta; D-01 a D-19 pendientes con "criterio aprobado") · **¿Evidencia de implementación?:** Sí, parcial — sección 7.1 documenta hallazgos de inspección del repo de Wapsell (no de Otra Ronda Más) · **¿Comportamiento propuesto a futuro?:** Sí (backlog sección 8)
- **Dependencias:** Referencia a `docs/spec-login-roles.md`, `docs/criterios-diseno-dueno-D01-D19.md`, `docs/spec-catalogo-productos.md`, `docs/scaffolding-notas.md` (rutas relativas tal como estaban antes de mover los archivos a SOURCES/)
- **Notas:** Es la única fuente con una sección dedicada a inspeccionar el repositorio real de Wapsell (`D:\...\wapsell`, remote `github.com/fmonfasani/wapsell.git`) como paso previo a decidir arquitectura de Otra Ronda Más.

---

### SRC-002 — criterios-diseno-dueno-D01-D19.md
- **Filename:** criterios-diseno-dueno-D01-D19.md · **Tipo:** MD
- **Título:** "Criterios de diseño propuestos por el dueño — D-01 a D-19"
- **Autor:** NOT DETERMINABLE (registra respuestas atribuidas al "dueño", pero el documento en sí no declara quién lo redactó)
- **Fecha de creación:** NOT DETERMINABLE · **Modificación (mtime):** 2026-09-19
- **Versión:** Sin numerar — "registro intermedio para revisión" (literal)
- **Origen:** Repositorio · **Estado:** "Propuestas de dirección de diseño, no datos comerciales cerrados" (literal, no PROPOSED/APPROVED del vocabulario estándar sino una categoría intermedia propia del documento)
- **Alcance:** Las 19 decisiones pendientes (D-01 a D-19) originalmente listadas en SRC-001 §10
- **Autoridad aprox.:** Media-alta para "dirección de diseño"; explícitamente sin autoridad sobre "datos comerciales concretos"
- **¿Actual o histórico?:** Actual a su fecha, sin indicación de haber sido superado
- **¿Requisitos?:** No nuevos, aplica los de SRC-001 · **¿Decisiones?:** Sí, 19 DECISION CANDIDATES explícitas + 7 "restricciones nuevas explícitas" · **¿Evidencia de implementación?:** No · **¿Comportamiento propuesto?:** Sí, extensamente
- **Dependencias:** SRC-001 (deriva de su sección 10)
- **Notas:** Contiene una cita textual atribuida al dueño que restringe expresamente el uso de este documento ("Claude Code no debe convertir estas propuestas en reglas definitivas ni modificar el SDD o el repositorio sin autorización explícita").

---

### SRC-003 — prompt-scaffolding-opencode.md
- **Filename:** prompt-scaffolding-opencode.md · **Tipo:** MD
- **Título:** "Prompt para OpenCode — Scaffolding de Otra Roonda Más (v2)"
- **Autor:** NOT DETERMINABLE · **Fecha de creación:** NOT DETERMINABLE · **Modificación (mtime):** 2026-09-19
- **Versión:** v2 (reemplaza v1, no presente en el corpus inventariado)
- **Origen:** Repositorio · **Estado:** HISTORICAL en el sentido de que ya fue ejecutado (SRC-004 documenta su ejecución), aunque el propio texto no se autodeclara superado
- **Alcance:** Instrucción técnica de scaffolding de monorepo (no requisitos de negocio)
- **Autoridad aprox.:** Media — subordinado explícitamente a SRC-001 y SRC-002 en su propia sección de precedencia
- **¿Actual o histórico?:** Histórico (ya ejecutado según SRC-004), pero sigue siendo la referencia técnica activa citada por fuentes posteriores (SRC-007 lo cita como fuente)
- **¿Requisitos?:** No nuevos · **¿Decisiones?:** No, las hereda · **¿Evidencia de implementación?:** No en sí mismo (es el prompt, no el resultado) · **¿Comportamiento propuesto?:** Sí, exhaustivamente (modelo de datos completo propuesto)
- **Dependencias:** SRC-001, SRC-002 (precedencia declarada explícitamente en el propio texto)
- **Notas:** Declara explícitamente una discrepancia consigo mismo respecto a SRC-001 §7.3 ("el stack final... sigue sin decidir") y resuelve fijar un stack concreto (NestJS+Prisma+Postgres+React/Vite) por decisión tomada fuera del documento — deja constancia de que esa sección de SRC-001 quedó desactualizada, sin editarla.

---

### SRC-004 — scaffolding-notas.md
- **Filename:** scaffolding-notas.md · **Tipo:** MD
- **Título:** "Notas de Scaffolding para Otra Roonda Más"
- **Autor:** NOT DETERMINABLE · **Fecha de creación:** NOT DETERMINABLE · **Modificación (mtime):** 2026-09-23 (archivo de 939 líneas / ~146 KB, el más extenso del corpus; leído parcialmente en esta fase — primeras ~323 líneas, secciones 1 a 8 de un total no confirmado de secciones)
- **Versión:** N/A — bitácora acumulativa por sección numerada, sin número de versión único
- **Origen:** Repositorio · **Estado:** CURRENT a su última fecha de modificación
- **Alcance:** Todo el desarrollo incremental del scaffolding y primeros módulos reales (auth, aislamiento multiempresa, CRUD de catálogo, importación de datos de seed)
- **Autoridad aprox.:** Alta como evidencia de implementación; no es fuente de requisitos nuevos
- **¿Actual o histórico?:** Actual — es un log vivo que se sigue extendiendo (nueva sección 10 en progreso al final de lo leído)
- **¿Requisitos?:** No · **¿Decisiones?:** Documenta decisiones técnicas tomadas dentro de los grados de libertad dejados por SRC-003 (ej. npm workspaces vs. pnpm, Prisma Client Extension vs. RLS) · **¿Evidencia de implementación?:** Sí, extensamente y con detalle inusual (comandos exactos, códigos de respuesta HTTP observados, bugs encontrados y su resolución) · **¿Comportamiento propuesto?:** No, documenta lo ya hecho, con TODOs explícitos para lo que falta
- **Dependencias:** SRC-001, SRC-002, SRC-003, SRC-005 (sección 8 discute fricciones con SRC-005)
- **Notas:** **No leído en su totalidad en esta fase** (excede el límite práctico de una sola lectura — 939 líneas). Lo leído cubre secciones 1–8 (decisiones técnicas, reparación de entorno, módulo auth, login frontend, aislamiento multiempresa, fricciones con spec de catálogo, CRUD de productos). El archivo continúa al menos hasta una "sección 10" (importación de catálogo real) no leída en detalle — **queda pendiente de lectura completa para Fase 2 (AS-IS)**, marcado explícitamente aquí para no perder el rastro.

---

### SRC-005 — spec-catalogo-productos.md
- **Filename:** spec-catalogo-productos.md · **Tipo:** MD
- **Título:** "SPEC — Módulo de Catálogo de Productos"
- **Autor:** NOT DETERMINABLE · **Fecha de creación:** NOT DETERMINABLE · **Modificación (mtime):** 2026-09-22
- **Versión:** "Borrador para revisión y aprobación" (sin número) · **Origen:** Repositorio
- **Estado:** PROPOSED, con una sección (4.1) marcada por una nota propia como ya IMPLEMENTADA de forma distinta a lo propuesto ("Actualización 22/09/2026")
- **Alcance:** Catálogo, variantes, presentaciones, SKU, importación y conciliación de proveedores, listas de precios
- **Autoridad aprox.:** Media — es un documento "propuesto, no aprobado" según su propia sección 15/16
- **¿Actual o histórico?:** Mixto en el mismo archivo (ver nota de actualización arriba)
- **¿Requisitos?:** Sí, extensamente (CA-01 a CA-12) · **¿Decisiones?:** No resuelve ninguna, lista 13 pendientes explícitas en su sección 14 · **¿Evidencia de implementación?:** No en sí mismo, pero referencia friction points documentados en SRC-004 §8 · **¿Comportamiento propuesto?:** Sí, es su contenido central
- **Dependencias:** Referenciado desde SRC-001 (RF-03) y discutido en SRC-004 §8
- **Notas:** Contiene instrucciones explícitas dirigidas a "el agente de desarrollo" (secciones 15-16) sobre cómo proceder — son instrucciones de proceso, no requisitos de producto.

---

### SRC-006 — spec-login-roles.md
- **Filename:** spec-login-roles.md · **Tipo:** MD
- **Título:** "Login y roles del negocio (RF-17)"
- **Autor:** NOT DETERMINABLE · **Fecha de creación:** Sesión del 22/09/2026 (declarada en el cuerpo) · **Modificación (mtime):** 2026-09-22
- **Versión:** Sin numerar · **Origen:** Repositorio, complementa a SRC-001
- **Estado:** Parcialmente APPROVED — sección 5 ("Decisiones técnicas resueltas") declara 4 decisiones cerradas
- **Alcance:** RF-17 — dos dominios de login, 5 roles del lado "Negocio", legajo, flujo de invitación
- **Autoridad aprox.:** Alta para su alcance específico
- **¿Actual o histórico?:** Actual · **¿Requisitos?:** Sí · **¿Decisiones?:** Sí, 4 explícitamente resueltas (modelo de datos Cliente/Usuario, storage de legajo, vencimiento, email transaccional) · **¿Evidencia de implementación?:** No directamente (es especificación, la implementación se documenta en SRC-004) · **¿Comportamiento propuesto?:** Sección 7 deja explícitamente pendientes 3 puntos para diseño técnico
- **Dependencias:** SRC-001 (RF-17, actor §3.1, decisión "D-20")
- **Notas:** Menciona un artifact externo publicado (`claude.ai/artifact/N3UDLNcow1Uk8DPUjmWgMz`) como "versión resumida navegable" — no accedido en esta fase, queda como referencia externa no verificada.

---

### SRC-007 — spec-modulos_ventas.md
- **Filename:** spec-modulos_ventas.md · **Tipo:** MD
- **Título:** "SPEC — Módulo de Ventas" · **Autor:** "@Monfasani Federico" (declarado en el propio cuerpo, línea 3)
- **Fecha de creación:** "Sep 24, 2026" (declarada en el cuerpo) · **Modificación (mtime):** 2026-09-24
- **Versión:** v0.1 "borrador para revisión del dueño" · **Origen:** Repositorio
- **Estado:** PROPOSED, "Aprobación: Pendiente del dueño" (literal)
- **Alcance:** Venta presencial POS: carrito, cobro, pagos mixtos, historial, detalle, anulación, UI completa
- **Autoridad aprox.:** Alta para su alcance — es la SPEC especializada más reciente y más detallada del corpus
- **¿Actual o histórico?:** Actual, la más reciente del corpus (2026-09-24)
- **¿Requisitos?:** Sí, 30 (RF-VTA-01 a 30) · **¿Decisiones?:** No resuelve ninguna propia; lista 14 pendientes (D-VTA-01 a 14) · **¿Evidencia de implementación?:** Indirectamente — cada requisito está etiquetado "Implementado / Cambio / Nuevo" contra hallazgos de código citados como "C1–C29" de un informe externo (ver SRC-008) · **¿Comportamiento propuesto?:** Sí, extensamente (contratos de API, modelo de datos, UI/UX completos)
- **Dependencias:** Declaradas explícitamente: "Informe funcional — Módulo de Ventas" (SRC-008), SRC-001, SRC-002, SRC-004 (§11-33), y "código leído (hallazgos C1–C29)" — más un Design System externo (artifact `claude.ai/artifact/4gto4VZJ6hGFiKKiujYij4`, no accedido en esta fase)
- **Notas:** Contenido casi idéntico a SRC-009 (docx). Ver conflicto de duplicación en `03-CONFLICTS`.

---

### SRC-008 — Modulo ventas - Informe funcional.docx
- **Filename:** "Modulo ventas - Informe funcional.docx" · **Tipo:** DOCX
- **Título (interno):** "Informe funcional — Módulo de Ventas" · **Autor:** "@Monfasani Federico" (declarado en el cuerpo); metadata `docProps/core.xml` no declara `dc:creator` propio, solo un `dc:description` con `Claude Docs node/7e01be11-8c73@88 docx-w6`
- **Fecha:** "Sep 24, 2026" (cuerpo) · **Modificación (mtime del archivo):** 2026-09-24
- **Versión:** Revisión 88 según metadata interna (`cp:revision`) — sugiere un documento editado iterativamente en una plataforma externa (Claude Docs) antes de exportarse a este repo
- **Origen:** Exportado desde Claude Docs (inferido de la metadata, no confirmado por el propio contenido)
- **Estado:** "Propuesta / insumo para especificación" (literal)
- **Alcance:** Análisis funcional del módulo de Ventas, contrastando SPEC general vs. estado implementado
- **Autoridad aprox.:** Media-alta como insumo de auditoría funcional
- **¿Requisitos?:** Indirectamente, citando los de SRC-001 · **¿Decisiones?:** No · **¿Evidencia de implementación?:** Sí — declara explícitamente su "evidencia usada" y su "evidencia faltante" (caja, fidelización y autorizaciones "se tomaron de las notas, sin leer su código") · **¿Comportamiento propuesto?:** No es su foco, es diagnóstico
- **Dependencias:** SRC-001, SRC-002, SRC-004, SRC-005, SRC-006, 7 pantallas de un rediseño no incluidas en este corpus, y un Design System externo
- **Notas:** Es la fuente base que SRC-007/SRC-009 citan como "Deriva de".

---

### SRC-009 — SPEC — Módulo de Ventas.docx
- **Filename:** "SPEC — Módulo de Ventas.docx" · **Tipo:** DOCX
- **Título interno:** "SPEC — Módulo de Ventas" · **Autor:** "@Monfasani Federico" en cuerpo; metadata con `dc:description` = `Claude Docs node/3bec803b-b935@25 docx-w6`
- **Fecha:** "Sep 24, 2026" · **Modificación (mtime):** 2026-09-24 · **Versión:** `cp:revision` = 25
- **Estado:** PROPOSED — texto idéntico al inicio de SRC-007 en la porción leída
- **Notas:** Ver `03-CONFLICTS` — CONFLICT CANDIDATE de duplicación con SRC-007. No se determinó en esta fase cuál de los dos es la fuente canónica ni si difieren en contenido más allá del inicio leído.

---

### SRC-010 — 00-DOCUMENT-GOVERNANCE.md.txt
- **Filename:** 00-DOCUMENT-GOVERNANCE.md.txt · **Tipo:** TXT (extensión doble sugiere un `.md` renombrado o exportado como `.txt`)
- **Tamaño:** 0 bytes — archivo vacío
- Todos los demás campos: **NOT DETERMINABLE** (no hay contenido que analizar)
- **Notas:** Su nombre coincide con `00-GOVERNANCE/00-DOCUMENT-GOVERNANCE.md` (SRC no numerada, es un archivo de gobernanza del propio framework, no una fuente de negocio) — posible intento fallido o interrumpido de copiar/exportar ese archivo de gobernanza a esta ubicación. No se modifica ni se completa: se registra vacío.

---

### SRC-011 — Auditoría técnica y funcional.docx
- **Filename:** "Auditoría técnica y funcional.docx" · **Tipo:** DOCX
- **Título interno:** "Auditoría técnica y funcional — Otra Ronda Más → Wapsell"
- **Autor (metadata):** "Monfasani Federico Cesar" (`dc:creator` y `cp:lastModifiedBy`) · **Creado/modificado (metadata):** 2026-09-25T01:59:00Z · **Revisión:** 2
- **Versión:** N/A — auditoría puntual fechada 2026-09-24, referenciada contra `HEAD 066bb91` en la rama `deploy/otrarondamas-wapsell-com`
- **Origen:** Generado a partir de lectura directa del repositorio (309 archivos trackeados al momento de la auditoría)
- **Estado:** CURRENT a su fecha — "Solo lectura — no se modificó, creó ni borró nada en el repositorio" (literal)
- **Alcance:** General — arquitectura, backend, frontend, BD, multi-tenancy, identity/roles, commerce/ERP, messaging, branding, flujos E2E, tests, dependencias
- **Autoridad aprox.:** Alta como evidencia — es la única fuente que declara cifras verificadas por lectura de código (42 modelos, 84 handlers, 0% cobertura de tests, 24 contradicciones código-vs-docs, 18 riesgos verificados)
- **¿Actual o histórico?:** Actual · **¿Requisitos?:** No, es diagnóstico · **¿Decisiones?:** No · **¿Evidencia de implementación?:** Sí, extensamente, y explícitamente distingue "verificado por código" de lo documentado · **¿Comportamiento propuesto?:** No es su función (aunque tiene sección "Próximos pasos")
- **Dependencias:** El propio repositorio de Otra Ronda Más (no cita los .md de SOURCES/ explícitamente en el fragmento leído)
- **Notas:** Título contiene la flecha "Otra Ronda Más → Wapsell", sugiriendo que la auditoría fue encargada para evaluar aplicabilidad/integración hacia Wapsell — coherente con el resto del material "WapSell docs/Idea/" que discute una visión de plataforma Wapsell más amplia. Solo se leyó el extracto inicial (~3000 caracteres de un documento de 64 KB) — **lectura parcial, pendiente de profundizar en Fase 2**.

---

### SRC-012 — WAPSELL SPEC General v1.0.docx
- **Filename:** "WAPSELL SPEC General v1.0.docx" · **Tipo:** DOCX
- **Título interno:** "WAPSELL — SPEC GENERAL" · **Autor (metadata):** "Monfasani Federico Cesar" · **Creado (metadata):** 2026-09-25T00:55Z · **Modificado:** 2026-09-25T01:59Z · **Revisión:** 3
- **Versión:** El nombre de archivo dice "v1.0"; el cuerpo del documento dice "Versión: v0.1" — **discrepancia propia de la fuente, registrada tal cual, no resuelta**
- **Estado:** "BORRADOR — NO APROBADO" (literal, mayúsculas en el original) / "[PROPUESTA DE PRODUCTO]"
- **Alcance:** General — visión completa de Wapsell como plataforma de comercio conversacional multi-tenant (messaging, identidad de negocio, catálogo, ventas, pedidos, pagos, inventario, compras, entregas, reportes, auditoría, asistentes)
- **Autoridad aprox.:** Media — es una propuesta de producto explícitamente no aprobada, y a nivel de alcance (Wapsell como plataforma) es un nivel distinto al de SRC-001 (Otra Ronda Más como aplicación independiente)
- **¿Actual o histórico?:** Actual (fecha 24/09/2026 en el cuerpo) — pero su relación con el resto del corpus, centrado en Otra Ronda Más como app standalone, es tensa. Ver `03-CONFLICTS`.
- **¿Requisitos?:** Sí, a nivel de principios generales (conversación como interfaz, ERP como motor, multi-tenant, separación de dominios) · **¿Decisiones?:** No, es "[PROPUESTA]" explícitamente etiquetada en cada sección leída · **¿Evidencia de implementación?:** No · **¿Comportamiento propuesto?:** Sí, es su contenido íntegro
- **Notas:** Contradice directamente la premisa de SRC-001 §7 ("Otra Roonda Más como aplicación independiente, sin dependencias de código con el repo wapsell") al proponer que Otra Ronda Más sea "el primer Business/piloto" dentro de la plataforma Wapsell. Esta es la tensión central del corpus — ver `03-CONFLICTS/00-CONFLICT-REGISTER.md`.

---

### SRC-013 — Wapsell_Informe_Integral_de_Producto.docx
- **Filename:** Wapsell_Informe_Integral_de_Producto.docx · **Tipo:** DOCX
- **Título interno:** "WAPSELL — Informe integral de producto y visión de plataforma"
- **Autor (metadata):** `python-docx` (genérico de librería, no una persona) · **Creado/modificado (metadata):** 2013-12-23 (fecha por defecto de la librería, no confiable) · **mtime real del archivo:** 2026-09-24
- **Versión:** "Versión conceptual — 24/09/2026" (declarada en el cuerpo)
- **Estado:** Conceptual / propuesta, sin etiqueta de aprobación explícita en el fragmento leído
- **Alcance:** Visión de producto — "Wapsell como teléfono comercial virtual", con Otra Ronda Más como "primer caso concreto"
- **Autoridad aprox.:** Baja-media — es explícitamente conceptual/discursivo, no normativo
- **¿Requisitos?:** No en sentido verificable, son enunciados de visión · **¿Decisiones?:** No · **¿Evidencia de implementación?:** No · **¿Comportamiento propuesto?:** Sí, a nivel de visión (comparación con "ERP tradicional")
- **Notas:** Mismo eje temático que SRC-012, coherente con la misma visión de plataforma Wapsell multi-tenant.

---

### SRC-014 a SRC-017 — Los cuatro `.xlsx` "REENGINEERED"
- **Autor (metadata):** SRC-014 y SRC-015 declaran `dc:creator = OpenAI`; SRC-016 y SRC-017 declaran `dc:creator = openpyxl` (librería, no persona)
- **Creado/modificado (metadata):** Los cuatro comparten timestamp de modificación `2026-09-25T01:48:05Z`, sugiriendo un proceso de generación por lote (batch) que tocó los cuatro archivos en la misma corrida
- **Título/Subtítulo (metadata, cuando existe):**
  - SRC-014: "Wapsell — E2E Funcional, Conexión de Módulos y Procesos" / "Mapa funcional end-to-end de Wapsell"
  - SRC-015: "Wapsell — Matriz Integral del Proyecto" / "Producto, arquitectura, roles, módulos, UX, circuitos, requisitos, invariantes, contratos y gobernanza"
  - SRC-016, SRC-017: sin título/subject en metadata
- **Versión:** "REENGINEERED" en el nombre de archivo — sugiere una versión posterior a una anterior no incluida en este corpus ("Wapsell_E2E...", "Wapsell_Matriz...", etc. sin sufijo, no encontrados)
- **Estado:** NOT DETERMINABLE (no se abrió el contenido de las celdas, solo nombres de hoja y metadata del paquete)
- **Alcance:** General, a nivel de la visión "Wapsell como plataforma" (mismo eje que SRC-012/013, no el de "Otra Ronda Más standalone" de SRC-001)
- **Autoridad aprox.:** NOT DETERMINABLE sin leer contenido
- **¿Requisitos/Decisiones/Evidencia/Propuesto?:** NOT DETERMINABLE — pendiente de apertura de contenido en una fase posterior si se decide que aporta valor
- **Notas:** El nombre "REENGINEERED" y la autoría por herramienta (OpenAI/openpyxl) indican que este material fue generado por un proceso externo automatizado, probablemente para consolidar/reconciliar las fuentes .docx de "WapSell docs/Idea/" en formato tabular. **No se asume que su contenido sea correcto, aprobado, ni siquiera consistente con el resto del corpus** — es material para revisión, no fuente de verdad per se.

---

### SRC-018 — OTRA_RONDA_MAS_System_Design_v2.pdf
- **Filename:** OTRA_RONDA_MAS_System_Design_v2.pdf · **Tipo:** PDF
- **Título interno:** "OTRA RONDA MAS — Sistema de Gestión Integral para Kiosko/Polirubro — System Design Document v2.0"
- **Autor:** NOT DETERMINABLE (sin metadata de autor extraída; no se inspeccionó `docinfo` del PDF en esta fase)
- **Fecha:** "Última actualización: 24/09/2026 03:18" (declarada en el propio documento, portada y pie de página) · **mtime del archivo:** 2026-09-24
- **Versión:** v2.0 · **Origen:** NOT DETERMINABLE
- **Estado:** No se autodeclara PROPOSED/APPROVED explícitamente, pero su contenido (stack Kubernetes, GraphQL, 2FA, PCI DSS, roadmap de 12 semanas) no coincide con ninguna decisión ya tomada en el resto del corpus — tratado como PROPOSED hasta confirmación
- **Alcance:** General — todo el sistema (visión, branding, arquitectura, módulos, BD, plantillas, flujos, UI/UX, roadmap, infraestructura, seguridad)
- **Autoridad aprox.:** Baja-media — en fuerte tensión con SRC-001/SRC-003 (ver conflictos)
- **¿Requisitos?:** Sí, a alto nivel · **¿Decisiones?:** No, presenta todo como ya definido sin marcar pendientes (a diferencia del resto del corpus, que es sistemático marcando "pendiente") — esto en sí mismo es una discrepancia de método respecto a las demás fuentes · **¿Evidencia de implementación?:** No · **¿Comportamiento propuesto?:** Sí, íntegramente
- **Notas:** Pie de página dice "© 2024", mientras el resto de metadata del documento es de 2026 — inconsistencia interna menor, registrada sin interpretar.

---

### SRC-019 — Acta-Inscripcion-Registro-Nacional-dez-Contribuyentes-RNC.pdf
- **Filename:** (nombre con error tipográfico aparente: "dez-Contribuyentes", probablemente "de Contribuyentes") · **Tipo:** PDF
- **Ubicación:** `docs/Research/pedidoya/`
- **Tamaño:** 534 KB (el archivo más grande del corpus después de posibles imágenes)
- Todos los demás campos: **NOT DETERMINABLE** — no se abrió el contenido del PDF en esta fase
- **Notas:** El nombre y la carpeta contenedora ("pedidoya") sugieren un documento de registro fiscal/legal de un tercero (posiblemente una referencia de investigación sobre PedidosYa como competidor o modelo operativo), pero esto es una inferencia razonable a partir del nombre de carpeta, **no un hecho confirmado por el contenido** — se marca explícitamente como no leído.

---

### SRC-020/021/022 — Plantillas Otra Ronda Más (docx/pdf/docx)
- **SRC-020** `assets/brand/Plantillas_Operativas_Otra_Ronda_Mas.docx`: `dc:creator=python-docx`, `cp:lastModifiedBy=Monfasani Federico Cesar`, `cp:lastPrinted=2026-09-21T00:39Z`, `cp:revision=2`
- **SRC-021** `assets/brand/Plantillas_Operativas_Otra_Ronda_Mas.pdf`: metadata no extraída en esta fase (no se abrió como zip por ser PDF; no se leyó su contenido)
- **SRC-022** `assets/brand/Plantillas_Otra_Ronda_Mas.docx`: `dc:creator=python-docx`, sin `lastModifiedBy`, `cp:revision=1`, metadata de fecha no confiable (2013-12-23, default de librería)
- **Estado, alcance, autoridad, contenido:** NOT DETERMINABLE para los tres — no se leyó el contenido interno, solo metadata de archivo
- **Notas:** SRC-021 es probablemente una exportación a PDF de SRC-020 dado el nombre idéntico salvo extensión, pero esto **no está confirmado** — podrían diferir en contenido o versión.

---

### SRC-023 — Activos visuales `docs/Design/Wapsell/` (+ `KIckoff/`)
- **Cantidad:** 17 PNG en la carpeta raíz + 23 PNG en la subcarpeta `KIckoff/` = 40 archivos
- Todos los campos de metadata textual: **NOT DETERMINABLE** (son imágenes, sin metadata de autoría/versión extraída en esta fase)
- **Notas:** Nombres de archivo sugieren mockups de: branding, roles por sección (Caja, Compras, Configuración, Inicio, Mensajería, Perfil, Reportes, Usuario), login, roadmap y vistas de reportes — todo bajo el nombre "Wapsell" (no "Otra Ronda Más"), consistente con SRC-012/013/014-017.

---

### SRC-024 — Activos visuales `assets/brand/` (+ `Bebidas/`, `UIUX/`)
- **Cantidad aproximada:** ~35 archivos PNG/JFIF en la raíz de `assets/brand/`, más subcarpetas `Bebidas/Linea Coca` y `UIUX/Modulo Ventas`
- Todos los campos de metadata textual: **NOT DETERMINABLE**
- **Notas:** Incluye logos en múltiples variantes (fondo negro/blanco/amarillo, cuadrado, redes), paleta de colores, imágenes de producto (bebidas, snacks) y capturas de UI de Login y del módulo de Ventas (`UIUX/Modulo_ventas.png`) — esta última carpeta es señalada por SRC-007/SRC-009 como el origen del "rediseño de 7 pantallas" que esas SPECs corrigen. Mayor relevancia funcional que SRC-023 por estar activamente referenciado desde una fuente normativa (SRC-007).
