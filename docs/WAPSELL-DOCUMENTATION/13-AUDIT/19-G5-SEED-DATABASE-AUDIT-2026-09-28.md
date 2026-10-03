# G5 — USER RECONCILIATION AUDIT (base de seed)

**Fase:** 10-AUDIT · **Fecha:** 2026-09-28 · **Tipo:** auditoría de solo lectura
**Veredicto:** **G5 = OPEN** (ver §16)

> **Ningún dato fue modificado.** Solo se ejecutaron consultas `SELECT`. Evidencia en §18.

## Relación con otros artefactos de G5

Este documento es la **auditoría ejecutada** sobre la base de desarrollo. Se complementa con dos artefactos, sin contradecirlos:

| Artefacto | Rol |
|---|---|
[`17-G5-USER-RECONCILIATION-FOLLOW-UP-2026-09-29.md`](17-G5-USER-RECONCILIATION-FOLLOW-UP-2026-09-29.md) | **Gate formal de G5.** Cita esta auditoría como insumo (*"The supplied G5 audit reports…"*) y fija las 12 verificaciones que la auditoría de producción debe cubrir |
[`G5-PROD-AUDIT-QUERIES.sql`](G5-PROD-AUDIT-QUERIES.sql) | **Instrumento ejecutable.** 12 bloques `SELECT`-only que satisfacen esos 12 requisitos, más 4 adicionales: migraciones aplicadas, variantes de capitalización, volumen histórico por usuario, y cuentas del seed en producción (`TD-006`) |

**Ambos documentos concluyen `G5 = OPEN` por la misma razón**: la evidencia disponible es un seed de desarrollo, no producción.

**Corrección a §4.2 y OD-05 de este documento.** Acá se clasificó `Empresa Demo Aislamiento` como fixture de test por **inferencia** a partir de su nombre. El follow-up `17-…` lo eleva a **`VERIFICADO POR CÓDIGO`**: *"the repository seed explicitly creates a second company… solely to verify development tenant isolation"* y *"must not be interpreted as evidence of a second production business"*. **OD-05 queda respondido**; la inferencia de §4.2 era correcta pero ahora tiene respaldo de código.

---

## 1. Evidence

| Campo | Valor |
|---|---|
**Repositorio** | `fmonfasani/otrarondamas` |
**Branch** | `deploy/otrarondamas-wapsell-com` |
**Commit** | `0197d5b78d90d61c3298fd040c2b6f8b6c36e30e` |
**Base de datos** | `otrarondamas` — contenedor `otrarondamas-db-1`, puerto 5500, `healthy` |
**Tablas** | 43 en schema `public` |
**Tipo de entorno** | **DESARROLLO LOCAL con datos de seed** — ver §3.1 |
**Fecha/hora** | 2026-09-28 |

**Credenciales, `DATABASE_URL`, `JWT_SECRET` y tokens no fueron impresos.** Los emails se reportan ofuscados o descompuestos en local-part/dominio, nunca completos.

### 1.1 Advertencia de alcance — determina el veredicto

Este entorno **no es producción**. La auditoría describe el estado del seed local, **no** el de la base que sirve a `otrarondamas.wapsell.com`.

Cualquier conclusión sobre la población real de usuarios es **`NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE`**.

---

## 2. Repository findings

### 2.1 Modelo `Usuario` — `VERIFICADO POR CÓDIGO`

De `apps/api/prisma/schema.prisma`:

| Campo | Definición | Relevancia para G5 |
|---|---|---|
`id` | `String @id @default(uuid())` | Candidato a `User.id` |
`empresaId` | `String` — **NOT NULL**, escalar obligatorio | Pertenencia fija: impide `Membership` N:N |
`email` | `String @unique` — **unicidad GLOBAL** | Una persona no puede tener dos cuentas con el mismo email |
`passwordHash` | `String?` nullable | Usuario solo-Google no tiene password |
`googleId` | `String? @unique` | Nullable; unicidad global |
`activo` | `Boolean @default(true)` | Sin estados intermedios |
`rol` | `RolUsuario @default(OWNER)` | Enum, **no autoriza por sí solo** |
`estadoLegajo` | `EstadoLegajo @default(APROBADO)` | Guard de operación |

`Usuario` es referenciado por **19 relaciones** de histórico: `ventas`, `pedidos`, `movimientosCaja`, `audits`, `aperturasCaja`, `cierresCaja`, `arqueosCaja`, `arqueosComoEntrante`, `entregasPreparadas`, `entregasRepartidas`, `pagos`, `compras`, `recepcionesCompra`, `pagosProveedor`, `devolucionesProveedor`, `movimientosStock`, `autorizaciones`, `invitacionesCreadas`, `usuarioPermisos`.

**Consecuencia para el backfill:** preservar `Usuario` como actor histórico exige que esas 19 FKs sigan resolviendo. Es el requisito más restrictivo sobre cualquier estrategia de migración.

### 2.2 HALLAZGO R-01 — el login NO normaliza el email

`VERIFICADO POR CÓDIGO` — `apps/api/src/auth/auth.service.ts:46`

```
where: { email },
```

El email se usa **tal como llega**, sin `LOWER()` ni `TRIM()`.

**Relevancia:** la Fase 3 de este mandato pide normalizar conceptualmente vía `LOWER(TRIM(email))`. El código **no** lo hace. Si existieran `Juan@x.com` y `juan@x.com`, serían dos `Usuario` distintos para Prisma —`@unique` es sensible a mayúsculas en Postgres— pero **la misma persona** bajo la normalización del mandato.

**En este seed no se materializa** (los 3 emails ya están normalizados), pero es un riesgo real para producción.

### 2.3 HALLAZGO R-02 — Google OAuth asume que mismo email = misma persona

`VERIFICADO POR CÓDIGO` — `apps/api/src/auth/auth.google.service.ts:36-53`

Lógica actual:
1. Busca por `googleId`.
2. Si no existe, busca por `email`.
3. Si lo encuentra, **vincula el `googleId` a ese `Usuario`** — comentario textual del código: *"mismo email, misma persona"*.

**Relevancia crítica:** el mandato de G5 dice explícitamente *"NO asumir que dos Users con el mismo email representan a la misma persona"*. **El código en producción ya opera bajo la suposición contraria.**

No es un defecto del código bajo el modelo actual —donde `email` es `@unique` global, así que solo puede haber un match— pero **sí es una contradicción con la regla de reconciliación de G5**, y quedará activa durante cualquier convivencia temporal.

### 2.4 Diferencias entre código y documentación Wapsell

| # | Código actual | Documentación | Estado |
|---|---|---|---|
1 | `Empresa` como raíz de aislamiento | `Business` = tenant | `CON-009` `RESOLVED` en dirección; migración `OPEN` |
2 | `Usuario.empresaId` 1:N fijo | `Membership` N:N | `CON-010` `RESOLVED` en dirección; mecanismo **OR-002-B pendiente** |
3 | **No existe** `Membership`, `Business`, `Tenant` | Requeridos | Gap #4 de `07-TOBE/01` |
4 | `Usuario.email @unique` **global** | `User` reutilizable entre `Business` | **OR-002-C pendiente** |
5 | `Cliente` separado, `@@unique([empresaId,email])` | `Customer` separado, vínculo opcional a `User` | `D-002-bis` `OWNER-VERBATIM`; lifecycle → OR-003 |
6 | `RolUsuario` enum de 4 valores | 6 roles objetivo | Ver §8.1 |
7 | `Permiso`/`UsuarioPermiso` ligados a `Usuario` | `Membership → Role → RolePermission → Permission` | `D-005`, catálogo `NOT DECIDED` |
8 | Sin `Supplier` como entidad de identidad | `Supplier` separado de `User` | No verificado en esta auditoría |

**El mandato de G5 menciona `Role`, `Permission` y `RolePermission` como arquitectura aprobada.** El registro canónico (`00-DECISION-REGISTER.md` §4, `D-005`) la marca `APPROVED — DERIVED / RECONSTRUCTED` con *"catálogo definitivo de roles y permisos"* en `OPEN`. **No se asume que `RolePermission` sea un modelo aprobado** — se reporta la diferencia.

---

## 3. Database findings

### 3.1 El entorno es un seed de desarrollo — `VERIFICADO POR EJECUCIÓN`

| Tabla | Filas |
|---|---|
`Producto` | **4.343** |
`Venta` | **0** |
`Pedido` | **0** |
`Compra` | **0** |
`MovimientoCaja` | **0** |
`AuditLog` | **0** |

4.343 productos con cero transacciones y cero auditoría es la firma de `db:seed`. Los 3 usuarios tienen `createdAt` = `updatedAt` = **2026-09-22**, coherente con una siembra única.

**Consecuencia:** las 19 relaciones históricas de `Usuario` están **todas vacías** acá. El escenario que más restringe el backfill —preservar al actor de miles de registros históricos— **no es observable en este entorno**.

---

## 4. User population

`VERIFICADO POR EJECUCIÓN`

| Métrica | Valor |
|---|---|
Total usuarios | **3** |
Activos | 3 |
Inactivos | 0 |
`email` NULL | 0 |
`email` vacío | 0 |
`googleId` informado | **0** |
`googleId` NULL | 3 |
Total empresas | **2** |
Usuarios sin `Empresa` válida | **0** |
Empresas sin usuarios | **0** |

### 4.1 Población detallada

| User ID | Nombre | Email (ofuscado) | Empresa | Rol | Activo | Legajo |
|---|---|---|---|---|---|---|
`7cb26c38` | Dueño Empresa Aislamiento | `owner@demo-aislamiento.com` | Empresa Demo Aislamiento | `OWNER` | sí | `APROBADO` |
`8573aa8b` | Dueño de Prueba | `owner@otrarondamas.com` | **Otra Roonda Más** | `OWNER` | sí | `APROBADO` |
`81a20650` | Vendedor de Prueba | `seller@otrarondamas.com` | **Otra Roonda Más** | `ASISTENTE_LOCAL` | sí | `APROBADO` |

### 4.2 HALLAZGO D-01 — existen DOS empresas, no una

El AS-IS (`05-ASIS/00-ASIS-OVERVIEW.md`) describe el sistema como *"un solo negocio real — Otra Ronda Más"*. La base contiene **2**: `Otra Roonda Más` y `Empresa Demo Aislamiento`.

La segunda es evidentemente un fixture para probar el aislamiento multi-empresa, no un negocio real. **Pero implica que el backfill de `Business` deberá procesar 2 registros, no 1**, y que existe al menos un caso de dos `OWNER` en empresas distintas.

`VERIFICADO POR EJECUCIÓN`. Que sea un fixture de test es **inferencia** por su nombre, no dato declarado.

### 4.3 HALLAZGO D-02 — el typo `"Roonda"` está en los datos

`Empresa.nombre` = `"Otra Roonda Más"`. Confirma `TD-002` / `CON-008` a nivel de datos, no solo de código. El ruling OR-001 (P4) decidió corregirlo a `"Otra Ronda Más"`; **no se corrigió en esta auditoría**.

---

## 5. Email reconciliation

`VERIFICADO POR EJECUCIÓN`

```sql
SELECT lower(trim(email)), count(*), count(DISTINCT "empresaId")
FROM "Usuario" GROUP BY 1 HAVING count(*) > 1;
→ 0 rows
```

**Cero emails duplicados bajo normalización `LOWER(TRIM())`.**

### 5.1 Caso que requirió verificación explícita

Dos usuarios comparten el local-part `owner@`. Verificado por descomposición:

| User ID | local-part | dominio |
|---|---|---|
`8573aa8b` | `owner` | `otrarondamas.com` |
`7cb26c38` | `owner` | `demo-aislamiento.com` |

**Dominios distintos → emails distintos → sin conflicto.** No se asumió: se verificó.

### 5.2 Clasificación por las categorías del mandato

| Categoría | Casos |
|---|---|
**A. SIN CONFLICTO** | **3** (los 3 usuarios) |
B. Duplicado dentro del mismo Business | 0 |
C. Mismo email en distintos Business | 0 |
D. Duplicado activo/inactivo | 0 |
E. Duplicado con Google IDs diferentes | 0 |
F. Duplicado con Google IDs iguales | 0 |
G. Caso ambiguo | 0 |
H. Datos inválidos | 0 |

**Los 3 usuarios están clasificados. Ningún caso sin clasificar en este entorno.**

---

## 6. Google ID reconciliation

`VERIFICADO POR EJECUCIÓN`

```sql
SELECT "googleId", count(*) FROM "Usuario"
WHERE "googleId" IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
→ 0 rows
```

**Ningún usuario tiene `googleId`** (3 de 3 en NULL). No hay conflictos posibles, y **tampoco evidencia sobre el comportamiento real de Google OAuth**: el camino del hallazgo R-02 (§2.3) nunca se ejerció en estos datos.

| Clasificación | Casos |
|---|---|
Sin conflicto | 3 (todos, por ausencia de `googleId`) |
Mismo Google ID + mismo email | 0 |
Mismo Google ID + distinto email | 0 |
Mismo Google ID + distintos Business | 0 |

El riesgo de R-02 en producción es **`NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE`**.

---

## 7. Empresa integrity

`VERIFICADO POR EJECUCIÓN`

| Verificación | Resultado |
|---|---|
`Usuario` con `empresaId` inexistente | **0** |
`Usuario` con `empresaId` NULL | **0** — imposible: la columna es NOT NULL |
Empresas sin usuarios | **0** |
Inconsistencias referenciales | **0** |

### 7.1 Mapeo legacy → Business target

Bajo la decisión aprobada `Empresa.id == Business.id`:

| Legacy User | Empresa (id abreviado) | Business target esperado |
|---|---|---|
`8573aa8b` | `22dc5550` — Otra Roonda Más | `Business 22dc5550` |
`81a20650` | `22dc5550` — Otra Roonda Más | `Business 22dc5550` |
`7cb26c38` | `66753657` — Empresa Demo Aislamiento | `Business 66753657` |

**Integridad referencial perfecta en este entorno.** El backfill de `Membership` tendría 3 filas determinables (1 por usuario, sin ambigüedad de pertenencia).

---

## 8. Role distribution

`VERIFICADO POR EJECUCIÓN`

| Rol legacy | Cantidad | Activos | Empresas |
|---|---|---|---|
`OWNER` | 2 | 2 | 2 (una en cada empresa) |
`ASISTENTE_LOCAL` | 1 | 1 | 1 (Otra Roonda Más) |
`PROVEEDOR` | **0** | — | — |
`REPARTIDOR` | **0** | — | — |

**Sin valores inesperados.** Los 3 usan valores válidos del enum `RolUsuario`.

### 8.1 Mapeo de análisis (NO una modificación)

| Legacy | Target del mandato | Observado |
|---|---|---|
`OWNER` | Owner/Admin | 2 usuarios |
`ASISTENTE_LOCAL` | Vendedor | 1 usuario |
`PROVEEDOR` | Proveedor | 0 |
`REPARTIDOR` | Repartidor | 0 |
— | **Gestor de Stock** | **Sin equivalente legacy** — no se inventan usuarios |
— | **Cliente/Comprador** | Corresponde a `Cliente`/`Customer`, no a `Usuario` |

**Este mapeo es análisis, no migración.** No se modificó ningún rol.

Nota de coherencia documental: el catálogo de roles objetivo del mandato (6 roles) **no coincide** con el estado de `D-005`, cuyo `IMPLEMENTATION DETAIL` declara *"catálogo definitivo de roles y permisos"* como `OPEN`. Se reporta, no se resuelve.

---

## 9. Permission integrity

`VERIFICADO POR EJECUCIÓN`

| Métrica | Valor |
|---|---|
Permisos definidos | **11** |
Asignaciones (`UsuarioPermiso`) | **25** |
Usuarios sin permisos | **0** |
Asignaciones huérfanas (usuario inexistente) | **0** |
Asignaciones huérfanas (permiso inexistente) | **0** |
Permisos sin ningún usuario | **0** |

### 9.1 Distribución

| User ID | Rol | Permisos |
|---|---|---|
`8573aa8b` | `OWNER` | **11** (todos) |
`7cb26c38` | `OWNER` | **11** (todos) |
`81a20650` | `ASISTENTE_LOCAL` | **3** |

Total: 25 asignaciones, consistente con 11+11+3.

**Cero inconsistencias.** El patrón es coherente: `OWNER` recibe el conjunto completo, `ASISTENTE_LOCAL` un subconjunto.

**Observación para el backfill:** los permisos están ligados a `Usuario`, no a una pertenencia. Bajo el modelo objetivo (`Membership → Role → RolePermission → Permission`) estas 25 asignaciones directas deberían derivarse de roles. La transformación **depende del catálogo de `D-005`, que está `OPEN`**.

---

## 10. Invitation integrity

`VERIFICADO POR EJECUCIÓN`

| Métrica | Valor |
|---|---|
Total invitaciones | **0** |
Con `empresaId` inválido | 0 |
Con `invitadoPorId` inválido | 0 |

La tabla está vacía. **Sin evidencia sobre el comportamiento real del flujo de invitaciones**, que es el único camino de alta de usuarios según el AS-IS. Roles legacy no mapeables: ninguno observable.

---

## 11. Customer/User linkage candidates

`VERIFICADO POR EJECUCIÓN`

| Métrica | Valor |
|---|---|
Total `Cliente` | **0** |
Con email | 0 |
Con `passwordHash` | 0 |
Con `googleId` | 0 |
Email coincidente con algún `Usuario` | **0** |

| Clasificación | Casos |
|---|---|
Linkage determinista | 0 |
Linkage probable | 0 |
Linkage ambiguo | 0 |
Sin linkage | 0 (no hay clientes) |

**Ningún candidato de linkage.** La tabla `Cliente` está vacía, así que la pregunta central de `D-002-bis` —cómo se vincula `Customer` con `User`— **no tiene datos que la informen en este entorno**.

`NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE` para producción.

---

## 12. Reconciliation matrix

| User ID | Nombre | Email (ofuscado) | Email normalizado | Google ID | Empresa | Rol | Activo | Conflicto | Clasificación | Acción requerida |
|---|---|---|---|---|---|---|---|---|---|---|
`7cb26c38` | Dueño Empresa Aislamiento | `owner@demo-aislamiento.com` | ya normalizado | NULL | `66753657` Demo Aislamiento | `OWNER` | sí | **NINGUNO** | **A. SIN CONFLICTO** | Candidato directo a `User` global (R1) |
`8573aa8b` | Dueño de Prueba | `owner@otrarondamas.com` | ya normalizado | NULL | `22dc5550` Otra Roonda Más | `OWNER` | sí | **NINGUNO** | **A. SIN CONFLICTO** | Candidato directo a `User` global (R1) |
`81a20650` | Vendedor de Prueba | `seller@otrarondamas.com` | ya normalizado | NULL | `22dc5550` Otra Roonda Más | `ASISTENTE_LOCAL` | sí | **NINGUNO** | **A. SIN CONFLICTO** | Candidato directo a `User` global (R1) |

**Los 3 usuarios: sin conflicto de identidad.** Verificado, no asumido: se descompusieron los emails para descartar el falso positivo de los dos `owner@`.

### 12.1 Conflictos de entorno, no de identidad

Los siguientes no son conflictos entre usuarios, pero afectan el backfill:

| # | Qué se encontró | Por qué es relevante | Riesgo para `User` global | ¿Automático? | ¿Decisión del Owner? |
|---|---|---|---|---|---|
**C-01** | El entorno es seed, no producción | La población real es desconocida | **Alto** — reglas validadas contra 3 filas pueden no cubrir producción | No | **Sí** — ver §17 |
**C-02** | Login sin normalizar email (R-01) | Podrían coexistir variantes de capitalización | Medio | No | Sí |
**C-03** | Google OAuth asume mismo email = misma persona (R-02) | Contradice la regla de G5 | **Alto** en modelo multi-tenant | No | **Sí** |
**C-04** | 2 empresas, no 1 | El backfill procesa 2 `Business` | Bajo | Sí | No |
**C-05** | 25 permisos directos a `Usuario` | El modelo objetivo los deriva de `Role` | Medio | No | Sí — depende de `D-005` |
**C-06** | `Empresa.nombre` = `"Otra Roonda Más"` | Decidido corregir por OR-001 P4 | Bajo | Sí | Ya decidido |

---

## 13. Proposed reconciliation rules

**Propuestas de auditoría. No son modificaciones ni decisiones.**

| ID | Regla | Estado en este entorno |
|---|---|---|
**R1** | `Usuario` con email único bajo `LOWER(TRIM())` → candidato directo a `User` global | **Aplica a los 3** |
**R2** | Mismo email normalizado en múltiples `Usuario` → **NO fusionar automáticamente** | Sin casos |
**R3** | Mismo email + distinto `googleId` → conflicto de identidad | Sin casos |
**R4** | Mismo `googleId` en distintos `Usuario` → conflicto crítico | Sin casos (0 `googleId`) |
**R5** | `Usuario` sin `Empresa` válida → no backfillear `Membership` hasta resolver | Sin casos |
**R6** | `Usuario` con rol legacy desconocido → no asignar rol target automáticamente | Sin casos |

### 13.1 Reglas adicionales que este análisis sugiere

Derivadas de los hallazgos, **no de las fuentes**:

| ID | Regla propuesta | Motivo |
|---|---|---|
**R7** | Antes de cualquier backfill, ejecutar esta misma auditoría **contra producción** | C-01: 3 filas no validan reglas para un universo desconocido |
**R8** | Detectar variantes de capitalización (`Juan@x` vs `juan@x`) antes de migrar: hoy son `Usuario` distintos para Postgres pero misma persona bajo normalización | R-01 |
**R9** | Revisar el vínculo por email de Google OAuth antes de habilitar `Membership` N:N: su suposición *"mismo email, misma persona"* deja de ser segura cuando un email pueda repetirse entre `Business` | R-02, y depende de **OR-002-C** |
**R10** | No derivar `Role` desde las 25 asignaciones directas de permisos hasta que exista el catálogo de `D-005` | C-05 |

---

## 14. Risks

| # | Riesgo | Severidad | Evidencia |
|---|---|---|---|
**RG-01** | **Reglas validadas contra un universo de 3 filas.** La población de producción es desconocida: podría contener duplicados, inactivos, Google IDs y clientes que acá no existen | **CRÍTICA** | `VERIFICADO POR EJECUCIÓN` (el entorno es seed) |
**RG-02** | **Google OAuth vincula por email** asumiendo identidad única; bajo `Membership` N:N con emails repetibles entre `Business`, esa suposición podría vincular cuentas de personas distintas | **ALTA** | `VERIFICADO POR CÓDIGO` |
**RG-03** | **Login sin normalizar**: variantes de capitalización serían usuarios distintos hoy y colisionarían bajo normalización | MEDIA | `VERIFICADO POR CÓDIGO` |
**RG-04** | **19 relaciones históricas** dependen de `Usuario.id`; preservar al actor restringe fuertemente el mecanismo de migración | **ALTA** | `VERIFICADO POR CÓDIGO` |
**RG-05** | **Sin tests ni CI** (`TD-001`): el backfill no tendría verificación automatizada | **CRÍTICA** | `DOCUMENTADO` |
**RG-06** | **Permisos directos sin catálogo de roles** (`D-005` `OPEN`): no hay a qué `Role` derivarlos | MEDIA | `VERIFICADO POR EJECUCIÓN` + `DOCUMENTADO` |
**RG-07** | `Usuario.email @unique` global es incompatible con `User` reutilizable entre `Business`; el destino de esa constraint es **OR-002-C**, pendiente | **ALTA** | `VERIFICADO POR CÓDIGO` |

---

## 15. Blocking cases

**No hay casos bloqueantes de identidad** entre los 3 usuarios: cero conflictos, todos clasificados.

**Sí hay bloqueos de alcance y de decisión:**

| # | Bloqueo | Naturaleza |
|---|---|---|
**B-01** | La auditoría no se ejecutó contra producción | **Alcance.** Impide generalizar |
**B-02** | **OR-002-B** (mecanismo de transición) sigue `PENDING` | Decisión del Owner |
**B-03** | **OR-002-C** (unicidad de `User`) sigue `PENDING` | Decisión del Owner — determina si R-01/R-02 son problemas |
**B-04** | **OR-002-D** (destino de las filas) sigue `PENDING` | Decisión del Owner |
**B-05** | **`D-005`** sin catálogo de roles | Decisión del Owner |
**B-06** | `Cliente` e `Invitacion` vacías | **Alcance.** Sin evidencia de esos flujos |

---

## 16. G5 status

# G5 = OPEN

Evaluación contra los seis criterios de cierre del mandato:

| # | Criterio | Estado |
|---|---|---|
1 | No existen conflictos no clasificados | **CUMPLIDO** en este entorno — los 3 clasificados como A |
2 | Todos los emails duplicados clasificados | **CUMPLIDO** — cero duplicados, con el falso positivo `owner@` verificado |
3 | Todos los Google IDs duplicados clasificados | **CUMPLIDO** — cero `googleId` |
4 | Todas las relaciones `Usuario → Empresa` válidas | **CUMPLIDO** — cero huérfanos |
5 | Existe regla determinista por tipo de conflicto | **NO CUMPLIDO** — R2…R6 no tienen ningún caso real que las valide; son reglas sin ejercitar |
6 | Ningún caso requiere decisión de identidad sin documentar | **NO CUMPLIDO** — OR-002-B/C/D pendientes; `D-005` sin catálogo |

### Por qué OPEN y no CLOSED

Los cuatro primeros criterios se cumplen, pero **no por ausencia de conflictos: por ausencia de datos.** Cerrar G5 con esta evidencia sería declarar que los datos reales permiten construir `User` global sin pérdida de identidad, cuando **los datos reales no fueron auditados**.

El mandato dice: *"G5 debe determinar si los datos reales de PostgreSQL permiten construir el User global"*. Los datos de este entorno son de seed. **La pregunta de G5 sigue sin responder para producción.**

Adicionalmente, el criterio 6 falla por razones independientes del entorno: tres Owner Rulings de OR-002 y el catálogo de `D-005` están abiertos.

**No se declara CLOSED por conveniencia.**

---

## 17. Required Owner decisions

| # | Decisión | Por qué |
|---|---|---|
**OD-01** | **¿Existe una base de producción auditable, o un snapshot?** Si existe, G5 debe re-ejecutarse contra ella. Si no, declarar formalmente que G5 se cierra sobre datos de seed, asumiendo el riesgo RG-01 | Sin esto, G5 no puede cerrarse con fundamento |
**OD-02** | **OR-002-C** — regla de unicidad de `User`. Determina si R-01 y R-02 son defectos a corregir antes del backfill o comportamientos aceptables | Condiciona RG-02, RG-03, RG-07 |
**OD-03** | **OR-002-B** — mecanismo de transición | Ningún backfill es diseñable sin esto |
**OD-04** | **OR-002-D** — destino de las filas de `Usuario`/`Cliente` | Define el backfill concreto |
**OD-05** | **¿Qué ocurre con `Empresa Demo Aislamiento`?** Aparenta ser un fixture de test. ¿Se migra como `Business`, se descarta, o se trata aparte? | Afecta el conteo del backfill (D-01) |
**OD-06** | **`D-005`** — catálogo de roles y permisos. Sin él, las 25 asignaciones directas no tienen `Role` de destino | Bloquea la transformación de autorización |
**OD-07** | **¿Se corrige el vínculo por email de Google OAuth antes del backfill?** Su suposición contradice la regla de G5 | RG-02 |

---

## 18. Evidence classification

| Conclusión | Clasificación |
|---|---|
Definición del modelo `Usuario`, constraints, 19 relaciones históricas | **VERIFICADO POR CÓDIGO** |
Login no normaliza el email (R-01) | **VERIFICADO POR CÓDIGO** |
Google OAuth vincula por email (R-02) | **VERIFICADO POR CÓDIGO** |
3 usuarios, 2 empresas, 0 `googleId`, 0 inactivos | **VERIFICADO POR EJECUCIÓN** |
Cero emails duplicados bajo `LOWER(TRIM())` | **VERIFICADO POR EJECUCIÓN** |
Los dos `owner@` tienen dominios distintos | **VERIFICADO POR EJECUCIÓN** |
Integridad referencial `Usuario → Empresa` perfecta | **VERIFICADO POR EJECUCIÓN** |
11 permisos, 25 asignaciones, cero huérfanos | **VERIFICADO POR EJECUCIÓN** |
`Invitacion` y `Cliente` vacías | **VERIFICADO POR EJECUCIÓN** |
El entorno es seed (4.343 productos, 0 transacciones) | **VERIFICADO POR EJECUCIÓN** |
`Empresa Demo Aislamiento` es un fixture de test | **INFERENCIA** por su nombre — no dato declarado |
Estado de producción: población, duplicados, `googleId`, clientes | **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE** |
Si `password123` sigue activa en producción | **NO DETERMINABLE** (`TD-006`) |
Comportamiento real del flujo de invitaciones | **NO DETERMINABLE** — tabla vacía |
Comportamiento real de Google OAuth con datos | **NO DETERMINABLE** — cero `googleId` |
Estados de decisión (`CON-*`, `D-*`, OR-002-B/C/D) | **DOCUMENTADO** |
Ausencia de tests y CI (`TD-001`) | **DOCUMENTADO** |

**Sin evidencia `VERIFICADO POR TEST`:** el repositorio no tiene tests.

---

## 19. Confirmación de no modificación

- **Solo `SELECT`.** Ningún `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`, `TRUNCATE`.
- **Sin migraciones** ejecutadas.
- **Sin cambios** en `schema.prisma`, código, migraciones, tablas, columnas, índices, constraints.
- **Sin cambios** en datos, roles, permisos, usuarios, sesiones ni tokens.
- **Ningún `User` fusionado.** Ningún dato corregido — el typo `"Roonda"` sigue en la base.
- **Sin commits, sin deploy.**
- **Credenciales no impresas.** Emails ofuscados o descompuestos, nunca completos.

Verificación disponible por `git status` (código y schema sin cambios) y por el hecho de que toda consulta de esta auditoría fue de lectura.
