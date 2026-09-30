# Wapsell — Decision Closure Report

**Fase:** 04-DECISIONS · **Fecha:** 2026-09-28 · **Estado:** INFORME — no decide nada
**Fuentes (exclusivas):** `04-DECISIONS/10-OPEN-DECISIONS.md`, `04-DECISIONS/00-DECISION-REGISTER.md`, `WAPSELL-DECISION-REGISTER-D001-D018.md`, `00-GOVERNANCE/01-SOURCE-OF-TRUTH.md`

> **Este informe no cierra, aprueba ni reinterpreta ninguna decisión.** Clasifica el estado de las
> decisiones ya registradas según lo que bloquean. Toda afirmación deriva de las fuentes citadas;
> donde una fuente calla, este informe dice que calla.

## 1. La distinción que gobierna todo el informe

El registro canónico establece dos ejes **independientes** que no deben confundirse:

| Eje | Pregunta | Estado actual |
|---|---|---|
| **Aprobación de la decisión** | ¿El Owner decidió la dirección? | **D-001…D-018: `APPROVED`** |
| **`IMPLEMENTATION DETAIL`** | ¿Está autorizado el cómo técnico? | **`OPEN` en las 18, sin excepción** |

Cita textual del registro canónico (§4):

> `IMPLEMENTATION DETAIL` remains `OPEN` throughout: **no migration, schema, naming, ID or physical model is authorised by any entry below.**

**Consecuencia operativa:** ninguna de las 18 decisiones autoriza hoy escribir una migración ni fijar un modelo físico. Eso no es un defecto del registro — es su postura explícita.

### 1.1 Aparente contradicción entre fuentes, y su resolución

`10-OPEN-DECISIONS.md` afirma que *"all 18 workshop decisions are open"*. El registro D001-D018 las marca todas `APPROVED`. **No se contradicen: hablan de ejes distintos.** El registro canónico resuelve la jerarquía:

- `WAPSELL-DECISION-REGISTER-D001-D018.md` está clasificado como **`PROPOSED — non-canonical`** y es descrito como *"the only file labelling all 18 `APPROVED`"*.
- `04-DECISIONS/00-DECISION-REGISTER.md` §4 es **"the canonical carrier"**.

Este informe usa §4 como autoridad, conforme a `01-SOURCE-OF-TRUTH.md` ("Approved decisions → Decision Register").

### 1.2 Provenance de dos niveles — no aplanar

| Clase | Decisiones | Qué permite |
|---|---|---|
| **`OWNER-VERBATIM`** | D-001, D-002, D-002-bis | Citable como texto aprobado |
| **`OWNER-RULED`** (texto `DERIVED`) | D-010, D-014 | Ruling vinculante (§4.3.1); el texto no es citable verbatim |
| **`DERIVED / RECONSTRUCTED`** | D-003…D-009, D-011…D-013, D-015…D-018 | Usable **como requisito**, **no** citable como redacción aprobada |

Cita del registro: *"faithful to the workshop register summaries and internally consistent, but **not** yet Owner-verified. These may be used as requirements, **not** as quotable approved text."*

---

## 2. Clasificación A — decisiones que BLOQUEAN arquitectura

Bloquean en el sentido de que **ningún modelo de datos ni contrato puede escribirse sin resolver su `IMPLEMENTATION DETAIL`**. La dirección está aprobada; el cómo no.

| ID | Decisión (resumen del registro) | Qué bloquea | `IMPLEMENTATION DETAIL` abierto |
|---|---|---|---|
| **D-001** | Business = Tenant; `Empresa` pasa a ser la unidad de aislamiento | **Raíz del modelo de datos.** Todo lo que hoy cuelga de `empresaId` | Migración y modelo físico no definidos |
| **D-002** | `User` global; `User ↔ Business` vía `Membership` (N:N) | **Identidad y autenticación completas** | Migración `Usuario`/`Cliente`, modelo de datos, ciclo de vida |
| **D-002-bis** | `Customer` **NO** se fusiona con `User`; vínculo opcional | Modelado de la entidad comercial del comprador | Lifecycle de `Customer`, modelado del vínculo con `User` |
| **D-005** | Roles y permisos pertenecen al `Membership` | **Todo el subsistema de autorización** | Catálogo definitivo de roles y permisos, lifecycle, administración |
| **D-006** | Todo acceso valida User + Business + Membership + permisos; *"un token válido por sí solo no autoriza"* | Guards, middleware, forma del token | Tipos de token, guards, interceptors, errores, sesión. **Además: 4 checks (v1.0) vs 2 (v1.1) sin resolver** (§4.3.2 #2) |
| **D-017** | Monolito modular; evolución incremental sin migrar a microservicios | Topología y límites de módulos | Topología física, infraestructura, comunicación, seguridad adicional. **Además: la cláusula sobre no adoptar Kubernetes/GraphQL/colas está `PENDING OWNER RULING`** (§4.3.2 #8) |

**Estas 6 forman una cadena:** D-001 → D-002 → D-005 → D-006. No son resolubles en paralelo ni en otro orden — el modelo de tenancy precede a la identidad, que precede a los roles, que preceden al enforcement.

### 2.1 Bloqueo con invariante ya derivable

| ID | Estado especial | Invariante |
|---|---|---|
| **D-014** | **`OWNER-RULED`** — v1.0 prevalece (§4.3.1) | *"No code path may move stock between Business."* La prohibición de transferencia inter-Business **no es `OPEN`**: es normativa. La democión de v1.1 a `OPEN DETAIL` fue **RECHAZADA** |

Es la única decisión del grupo que ya produce una restricción verificable sobre el código, aunque su `IMPLEMENTATION DETAIL` (ubicaciones, modelo físico) siga `OPEN`.

---

## 3. Clasificación B — decisiones que NO bloquean arquitectura

Definen comportamiento de dominio. Su ausencia de detalle **no impide** avanzar el modelo de tenancy/identidad, aunque sí impide implementar el dominio respectivo.

| ID | Dominio | Por qué no bloquea la arquitectura base |
|---|---|---|
| **D-003** | Messaging activo en MVP; IA preparada pero **inactiva** | Dominio nuevo, sin dependencia inversa del modelo de tenancy |
| **D-004** | Design System canónico + Brand configurable por Business | Capa de presentación; consume el modelo, no lo define |
| **D-007** | `Order` y `Sale` son entidades distintas; no toda Order es Sale | Ya existen como modelos separados en el AS-IS |
| **D-008** | `Sale` con lifecycle explícito; anulación transaccional | Extiende comportamiento de una entidad existente |
| **D-011** | Pasarelas externas; Mercado Pago prioritario; proveedor desacoplado | Integración desacoplada por diseño de la propia decisión |
| **D-012** | Cuentas por Cobrar por Business | Los modelos ya existen en el schema sin servicios |
| **D-013** | Caja por Business; caja cerrada no se modifica directamente | Ya implementado para un Business |
| **D-015** | Compras + Cuentas por Pagar por Business | Ya implementado parcialmente |
| **D-016** | Fulfillment dentro del dominio de **Pedidos**, no módulo independiente | Decisión de ubicación de dominio, sin impacto en tenancy |

### 3.1 Decisión con estatus transversal

| ID | Por qué es aparte |
|---|---|
| **D-010** | **`OWNER-RULED`** — v1.0 prevalece. Su ruling declara que *"verificar los controles de integridad EXISTENTES es obligatorio"*, y que las cantidades inválidas se rechazan **sin excepción por Business** (carve-out de v1.1 **RECHAZADO**). Esa verificación **ya se ejecutó** (`10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md`) y el resultado es `IMPLEMENTATION NON-COMPLIANT / GAP`. No bloquea arquitectura, pero es el único requisito aprobado con **incumplimiento verificado** en el código actual |

### 3.2 Decisión de proceso, con problema auto-referencial

| ID | Naturaleza |
|---|---|
| **D-009** | *"La SPEC es la fuente de verdad"*; toda implementación trazable a requisito/decisión/SPEC. **No bloquea arquitectura: gobierna cómo se aprueba todo lo demás.** El registro marca una advertencia propia: v1.1 rebaja a `OPEN` precisamente la cláusula que rige el proceso de aprobación de este registro — *"Self-referential; needs resolution"* (§4.3.2 #4) |

### 3.3 Decisión de infraestructura de entrega

| ID | Naturaleza |
|---|---|
| **D-018** | CI/CD automatizado e incremental con quality gates; *"los cambios que no superen validaciones obligatorias no deben avanzar al siguiente entorno"*. No bloquea el modelo de datos. **Sin embargo**, el AS-IS registra 0 tests y ausencia total de CI/CD (CON-027, TD-001): la brecha entre esta decisión aprobada y el estado real es total |

---

## 4. Clasificación C — qué requiere decisión del Owner

Tres categorías distintas. **Ninguna se cierra en este informe.**

### 4.1 Confirmación de redacción — 16 decisiones

D-003…D-009, D-011…D-013, D-015…D-018 (y el texto de D-010/D-014) están `DERIVED / RECONSTRUCTED`: **aprobadas en dirección, sin redacción verificada por el Owner.**

Hasta que el Owner confirme el wording, no son citables como texto aprobado. El registro es explícito: *"not quotable as approved text until the Owner confirms wording."*

Solo **D-001, D-002 y D-002-bis** están libres de esta condición.

### 4.2 Divergencias v1.0 vs v1.1 — 8 cláusulas `PENDING OWNER RULING`

Registradas en §4.3.2. Existen en **solo uno** de los dos drafts, ninguna es normativa todavía:

| # | ID | Cláusula en disputa |
|---|---|---|
| 1 | D-003 | *"El MVP inicial no depende de WhatsApp como canal"* (solo v1.0) — *(R3, 2026-09-30, aditivo: `RESOLVED — OWNER-RULED` el 2026-09-30, Register §8.1; estado histórico preservado)* |
| 2 | **D-006** | **4** checks de autorización (v1.0) vs **2** (v1.1 + root) |
| 3 | D-008 | Si la anulación de Sale debe revertir explícitamente stock, caja, pagos y AR |
| 4 | **D-009** | Cláusula de aprobación documental obligatoria (solo v1.0) — **auto-referencial** |
| 5 | D-011 | Si `conciliación` es un estado normativo de pago |
| 6 | D-013 | *"Las operaciones sensibles están sujetas a permisos del Membership"* (solo v1.0) |
| 7 | D-015 | Si *"trazabilidad y conciliación de saldos"* es normativo |
| 8 | **D-017** | No adopción obligatoria de Kubernetes/GraphQL/colas (solo v1.1) |

**Las tres marcadas en negrita tienen impacto arquitectónico directo:** #2 define la forma del enforcement de autorización, #4 gobierna el proceso de aprobación de todo el registro, #8 fija los límites tecnológicos del monolito modular.

### 4.3 Numeración sin resolver — `GRF-02`

`04-DECISIONS/02-MULTITENANCY.md:53` reservó la numeración `DEC-002, DEC-003, …` para las decisiones necesarias para ejecutar DEC-001. **Esa numeración nunca se aplicó.** El registro canónico declara explícitamente que **no la inventa**: *"The relationship is documented, not renumbered."*

Estado: **`UNRESOLVED — see GRF-02`**. Requiere decisión del Owner sobre si D-001…D-018 se renumeran como `DEC-002…DEC-019` o si la equivalencia queda solo documentada.

### 4.4 Los 5 puntos que DEC-001 explícitamente NO decidió

El registro los lista en `02-MULTITENANCY.md:53-72`:

1. Modelo de datos concreto
2. Plan de migración
3. Alcance funcional de messaging/IA
4. Destino del repositorio
5. Impacto en las specs que asumen premisa standalone

El registro señala que estos 5 se mapean a D-001, D-002, D-003, D-004 (parcialmente) y gobernanza — *"They are the reason D-001…D-018 existed at all"*. Los puntos **2** y **4** no tienen una decisión D-xxx que los cubra de forma evidente según las fuentes leídas; **no se afirma acá que estén huérfanos** — determinarlo requiere una verificación que este informe no hizo.

---

## 5. Resumen

Total de fichas en el registro canónico §4: **19** = D-001…D-018 (18) + D-002-bis (resolución posterior del Owner, con ficha y provenance propios).

| Clasificación | Cantidad | IDs |
|---|---|---|
| **Bloquean arquitectura** | **7** | D-001, D-002, D-002-bis, D-005, D-006, D-014, D-017 |
| **No bloquean arquitectura** | **12** | D-003, D-004, D-007, D-008, D-009, D-010, D-011, D-012, D-013, D-015, D-016, D-018 |
| | **19** | **Total (7 + 12)** |

Ejes transversales, aplicables sobre ese total:

| Eje | Cantidad | Detalle |
|---|---|---|
| **`IMPLEMENTATION DETAIL` `OPEN`** | **19 de 19** | Sin excepción |
| **Requieren confirmación de redacción** | **16** | Todas menos D-001, D-002, D-002-bis |
| **`OWNER-VERBATIM`** | **3** | D-001, D-002, D-002-bis |
| **`OWNER-RULED`** (texto `DERIVED`) | **2** | D-010, D-014 |
| **Cláusulas `PENDING OWNER RULING`** | **8** | §4.3.2 — afectan D-003, D-006, D-008, D-009, D-011, D-013, D-015, D-017 *(R3, 2026-09-30, aditivo: la de D-003 quedó `RESOLVED`; recuento histórico)* |

### 5.1 Lo que este informe NO hace

- **No cierra ninguna decisión.** Las 18 siguen con `IMPLEMENTATION DETAIL` `OPEN`.
- **No resuelve ninguna de las 8 cláusulas** `PENDING OWNER RULING`.
- **No confirma redacción** de las 16 `DERIVED / RECONSTRUCTED`.
- **No renumera** `D-xxx` → `DEC-xxx` (`GRF-02` sigue `UNRESOLVED`).
- **No inventa decisiones** para los puntos 2 y 4 de §4.4.
- **No promueve** ninguna observación a requisito.

### 5.2 Orden sugerido para desbloquear arquitectura

Derivado de la cadena de dependencias de §2, **no es una decisión**:

1. **D-001 → D-002 → D-005 → D-006** (cadena de tenancy/identidad/autorización). Sin esto, ningún modelo de datos de Wapsell es escribible.
2. **§4.3.2 #2** (4 vs 2 checks de autorización) junto con D-006: define la forma del enforcement.
3. **§4.3.2 #4** (cláusula auto-referencial de D-009): gobierna cómo se aprueba todo lo demás, incluido este informe.
4. **§4.3.2 #8** (límites tecnológicos) junto con D-017.
5. **`GRF-02`** (numeración): cosmético frente a lo anterior, pero afecta toda cita futura.

Los dominios de §3 pueden especificarse en paralelo una vez cerrada la cadena de tenancy.
