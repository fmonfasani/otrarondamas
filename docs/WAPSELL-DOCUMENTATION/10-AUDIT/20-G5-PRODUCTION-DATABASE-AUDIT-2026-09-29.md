# G5 — PRODUCTION DATABASE AUDIT

**Fase:** 10-AUDIT · **Fecha:** 2026-09-29 · **Tipo:** auditoría de solo lectura
**Entorno:** **PRODUCCIÓN** · **Veredicto G5:** ver §12

> **Ningún dato fue modificado.** Solo se ejecutaron consultas `SELECT`.

---

## 1. Evidence

| Campo | Valor |
|---|---|
**Host** | `89.167.96.239` — Hetzner, `ubuntu-16gb-hel1-1` (Helsinki), Ubuntu 24.04.4 LTS |
**Contenedor** | `0010-otrarondamas-db-1` — `127.0.0.1:5501->5432/tcp` |
**Base** | `otrarondamas` · PostgreSQL **16.14** (Alpine) |
**Tamaño** | 15 MB · 43 tablas |
**Script** | `G5-PROD-AUDIT-QUERIES.sql` (commit `360bbba`) |
**Ejecutado** | 2026-09-29 ~21:37 UTC |
**Repo/branch** | `fmonfasani/otrarondamas` · `audit/identity-tenancy-2026-09-28` |

**Esta es la primera auditoría de G5 sobre datos de producción.** Cierra el requisito que `17-G5-USER-RECONCILIATION-FOLLOW-UP` declaraba como *"PRODUCTION EVIDENCE REQUIRED"*.

Nota de infraestructura: el contenedor se llama `0010-otrarondamas-db-1`, no `otrarondamas-db-1`. El prefijo `0010-` sugiere gestión por **Coolify** (hay un `coolify-db` en el mismo host). Convive con `catalaxia-db`. `VERIFICADO POR EJECUCIÓN`.

---

## 2. Comparación producción vs. seed local

| Métrica | Producción | Seed local | Δ |
|---|---|---|---|
Usuarios | **5** | 3 | **+2** |
Empresas | 2 | 2 | = |
`googleId` informados | **2** | 0 | **+2** |
Sin password | **2** | 0 | **+2** |
**Ventas** | **4** | 0 | **+4** |
Productos | 4.343 | 4.343 | = |
Permisos / asignaciones | 11 / 25 | 11 / 25 | = |
Usuarios sin permisos | **2** | 0 | **+2** |
Clientes | 0 | 0 | = |
Invitaciones | 0 | 0 | = |

**Producción tiene datos reales que el seed no tenía:** 2 usuarios adicionales creados por Google OAuth y 4 ventas reales. Confirma que auditar solo el seed era insuficiente.

---

## 3. User population

`VERIFICADO POR EJECUCIÓN`

| Métrica | Valor |
|---|---|
Total usuarios | **5** |
Activos / inactivos | 5 / 0 |
`email` NULL o vacío | 0 |
**Email no normalizado** | **0** |
`googleId` informado | **2** |
`googleId` NULL | 3 |
Sin `passwordHash` | **2** |
Usuarios sin `Empresa` válida | 0 |
Empresas sin usuarios | 0 |

### 3.1 Distribución por empresa

| Empresa (id) | Nombre | Usuarios |
|---|---|---|
`a2e73a35` | **Otra Roonda Más** | 4 |
`b878e025` | Empresa Demo Aislamiento | 1 |

### 3.2 HALLAZGO P-01 — el fixture de aislamiento existe en PRODUCCIÓN

`Empresa Demo Aislamiento` **está en la base de producción**, creada el 2026-09-21, con 1 usuario `OWNER` activo.

El follow-up `17-…` estableció por código que es un fixture de desarrollo y que *"must not be interpreted as evidence of a second production business"*. **Esa afirmación describe la intención del seed, pero el fixture fue efectivamente sembrado en producción.**

**Consecuencia para el backfill:** el backfill de `Business` procesará **2 filas**, no 1. Una de ellas no corresponde a un negocio real.

`VERIFICADO POR EJECUCIÓN`. Requiere decisión del Owner (**OD-P1**).

---

## 4. Email reconciliation

`VERIFICADO POR EJECUCIÓN`

| Verificación | Resultado |
|---|---|
Emails duplicados bajo `LOWER(TRIM())` | **0** |
Variantes de capitalización | **0** |
Emails NULL o vacíos | **0** |

**Cero conflictos de email en producción.** El riesgo que R-01 (login sin normalizar) habilita **no se materializó**: los 5 emails ya están normalizados.

R-01 sigue siendo un hallazgo de código válido — el riesgo es latente, no realizado.

---

## 5. Google ID reconciliation

`VERIFICADO POR EJECUCIÓN`

| Verificación | Resultado |
|---|---|
`googleId` duplicados | **0** |
Usuarios con `googleId` | **2** |
Usuarios sin password (solo Google) | **2** |

**Cero conflictos de Google ID.** Pero a diferencia del seed, acá **el camino de Google OAuth sí se ejerció**: 2 usuarios entraron por Google, y ambos carecen de `passwordHash`, lo que indica **alta automática**, no vinculación a una cuenta preexistente.

### 5.1 HALLAZGO P-02 — el alta automática por Google produjo usuarios sin permisos

Los 2 usuarios sin `passwordHash` coinciden en número con los **2 usuarios sin permisos** (§7). El código de `auth.google.service.ts` lo documenta explícitamente:

> *"el usuario auto-creado no recibe ningún permiso; alguien con `usuarios.gestionar` se los asigna a mano después"*

Esos 2 usuarios tienen rol `OWNER` por el default del schema (`rol RolUsuario @default(OWNER)`), con `estadoLegajo` `APROBADO` y **0 permisos**.

**Riesgo concreto, documentado en el propio código** (`auth.google.service.ts`, TODO DE SEGURIDAD):

> *"caja.controller.ts expone `estado`, `apertura`, `listarMovimientos`, `arqueo` y `cierre` sin @RequierePermiso, solo exige estar logueado. Un usuario recién creado por Google (permisos = []) puede abrir/cerrar caja real hoy mismo."*

**Esto ya no es hipotético: hay 2 usuarios en esa condición exacta en producción.** Concuerda con el hallazgo TD-007 de la auditoría de código (lecturas de panel alcanzables sin `@RequierePermiso`).

`VERIFICADO POR EJECUCIÓN` + `VERIFICADO POR CÓDIGO`. **No corregido.** Requiere decisión del Owner (**OD-P2**).

---

## 6. Empresa integrity

`VERIFICADO POR EJECUCIÓN`

| Verificación | Resultado |
|---|---|
`Usuario` con `empresaId` huérfano | **0** |
Nombres de empresa duplicados | **0** |
**Empresas con el typo `"Roonda"`** | **1** |

### 6.1 Mapeo legacy → Business target

| Empresa (id) | Nombre | Typo | Creada |
|---|---|---|---|
`a2e73a35` | **Otra Roonda Más** | **sí** | 2026-09-21 |
`b878e025` | Empresa Demo Aislamiento | no | 2026-09-21 |

**El typo `"Roonda"` está confirmado en producción.** El ruling OR-001 (P4) decidió corregirlo a `"Otra Ronda Más"`; `Empresa.nombre` es `@unique` y clave del `upsert` del seed, así que la corrección requiere la migración planificada. **No corregido acá.**

Integridad referencial: **perfecta**, 0 huérfanos.

---

## 7. Role and permission integrity

`VERIFICADO POR EJECUCIÓN`

### 7.1 Roles

| Rol legacy | Cantidad | Activos | Empresas | Legajo pendiente |
|---|---|---|---|---|
`OWNER` | **4** | 4 | 2 | 0 |
`ASISTENTE_LOCAL` | 1 | 1 | 1 | 0 |
`PROVEEDOR` | 0 | — | — | — |
`REPARTIDOR` | 0 | — | — | — |

**4 de 5 usuarios son `OWNER`** — consecuencia del default del schema aplicado a las altas automáticas de Google (§5.1), no de una asignación deliberada.

### 7.2 Permisos

| Métrica | Valor |
|---|---|
Permisos definidos | 11 |
Asignaciones | 25 |
**Usuarios sin permisos** | **2** |
Asignaciones huérfanas (usuario o permiso) | **0** |
Permisos sin usuarios | 0 |

### 7.3 Los permisos SÍ son derivables del rol — dato clave para `D-005`

| Rol | Usuarios con permisos | min | max |
|---|---|---|---|
`OWNER` | 2 | **11** | **11** |
`ASISTENTE_LOCAL` | 1 | **3** | **3** |

**`min = max` en ambos roles.** No hay asignaciones individuales divergentes: todos los `OWNER` con permisos tienen exactamente los mismos 11, y el `ASISTENTE_LOCAL` tiene 3.

**Consecuencia para `D-005`:** el modelo objetivo (`Membership → Role → RolePermission → Permission`) es **derivable de los datos actuales sin ambigüedad**, al menos para estos dos roles. Es un insumo favorable, aunque el catálogo definitivo sigue siendo decisión del Owner.

Los 2 usuarios sin permisos quedan fuera de esa derivación (§5.1).

---

## 8. Invitation and Customer integrity

`VERIFICADO POR EJECUCIÓN`

| Tabla | Filas | Observación |
|---|---|---|
`Invitacion` | **0** | El flujo de invitación —único camino de alta según el AS-IS— **nunca se usó en producción**. Las 5 altas ocurrieron por seed o por Google OAuth |
`Cliente` | **0** | **Ningún cliente registrado**, pese a que la tienda online exige login desde el commit `1dcee59` |

### 8.1 Linkage `Customer` ↔ `User`

| Clasificación | Casos |
|---|---|
Linkage determinista (mismo `googleId`) | **0** |
Candidatos por email | **0** |
Linkage probable / ambiguo | 0 |

**Ningún candidato de linkage.** La pregunta central de `D-002-bis` —cómo se vincula `Customer` con `User`— **no tiene casos reales que la informen**, ni en seed ni en producción.

### 8.2 HALLAZGO P-03 — la tienda online no tiene usuarios

0 clientes y 0 pedidos, con login obligatorio activo. Indica que la tienda pública **no está en uso real**, o que nunca se completó un registro. Relevante para dimensionar el riesgo de la migración de identidad del lado cliente: hoy es nulo.

---

## 9. Historical volume — restricción real del backfill

`VERIFICADO POR EJECUCIÓN`

| User ID | Rol | Ventas | Mov. caja | Audit | Compras |
|---|---|---|---|---|---|
`863ed73a` | `ASISTENTE_LOCAL` | **3** | 0 | 0 | 0 |
`e170673e` | `OWNER` | **1** | 0 | 0 | 0 |
`fabe6db5` | `OWNER` | 0 | 0 | 0 | 0 |
`ef3fd833` | `OWNER` | 0 | 0 | 0 | 0 |
`26beed84` | `OWNER` | 0 | 0 | 0 | 0 |

**4 ventas reales, repartidas entre 2 usuarios.** `MovimientoCaja`, `AuditLog` y `Compra` están en 0.

**Consecuencia favorable para el backfill:** el requisito *"históricos deben conservar `User` como actor"* afecta hoy a **4 registros y 2 usuarios**. Preservar el actor es trivial a esta escala — muy distinto del escenario que se temía.

---

## 10. HALLAZGO P-04 (CRÍTICO) — una migración quedó en estado inconsistente

`VERIFICADO POR EJECUCIÓN`

```
total_aplicadas: 18 | incompletas: 1 | revertidas: 1
```

El repositorio tiene **17** migraciones. Producción reporta **18 registros**, porque una aparece **dos veces**:

| migration_name | aplicada | revertida |
|---|---|---|
`20260922090002_catalogo_jerarquia_fk_not_null_y_drop_categoria` | **2026-09-22** | — |
`20260922090002_catalogo_jerarquia_fk_not_null_y_drop_categoria` | *(NULL)* | **2026-09-22** |

Es decir: **un intento falló y quedó marcado como `rolled_back`, y otro se completó.** Las 17 del repo están aplicadas, más este registro fallido residual.

### 10.1 Qué hacía esa migración

De `migration.sql`: elimina 7 foreign keys, hace `DROP COLUMN "categoriaId"` en `Producto` y `ReglaFidelizacion`, y pone `familiaId`, `subfamiliaId`, `tipoId`, `subtipoId` en **`SET NOT NULL`**.

Es una migración **destructiva y no idempotente**. Un fallo parcial podría dejar el schema a medio camino.

### 10.2 Estado real del schema: consistente

Verificación indirecta: los 4.343 productos existen y las 4 ventas se registraron **después** del 2026-09-22 (las migraciones `inc1`/`inc2`/`inc3` del 24/09 están aplicadas y las ventas funcionan). Si `familiaId NOT NULL` hubiera quedado a medias, el seed de 4.343 productos habría fallado.

**Conclusión: el schema parece consistente**, y la migración efectivamente se aplicó en el segundo intento. El registro `rolled_back` es un **residuo histórico**.

### 10.3 Por qué importa de todos modos

- **Prisma puede reportar drift** al comparar migraciones con la base, y bloquear futuras migraciones — incluida la de `Empresa → Business`.
- El requisito de OR-001 de **continuidad sin downtime** se vuelve más frágil si el historial de migraciones no está limpio.
- Responde un `NOT DETERMINABLE` del AS-IS: *"si las migraciones 14-17 están aplicadas"* → **sí, las 17 están aplicadas**, con este residuo.

**No se corrigió.** Limpiar `_prisma_migrations` es una modificación de datos, fuera del alcance de esta auditoría. Requiere decisión del Owner (**OD-P3**).

---

## 11. HALLAZGO P-05 — TD-006: las cuentas del seed EXISTEN en producción

`VERIFICADO POR EJECUCIÓN`

| local-part | dominio | activo | creado | actualizado | modificado |
|---|---|---|---|---|---|
`owner` | `otrarondamas.com` | **sí** | 2026-09-21 | 2026-09-21 | **NO** |
`owner` | `demo-aislamiento.com` | **sí** | 2026-09-21 | 2026-09-21 | **NO** |
`seller` | `otrarondamas.com` | **sí** | 2026-09-21 | 2026-09-21 | **NO** |

**Las 3 cuentas del seed están activas en producción, y `updatedAt == createdAt` en las tres: nunca fueron modificadas desde su creación.**

`seed.ts:53` hashea una contraseña literal presente en el repositorio público, aplicada a esas 3 cuentas. Que no hayan sido modificadas es **indicio fuerte de que la contraseña no fue rotada**, aunque no es prueba: un cambio de password actualizaría `updatedAt`, y no lo hizo.

**`TD-006` pasa de `NOT DETERMINABLE` a `VERIFIED BY EXECUTION` en su parte verificable:** las cuentas existen, están activas y sin modificar. Dos de ellas son `OWNER`.

**No se intentó autenticar** — probar credenciales contra producción no corresponde a una auditoría. La confirmación final requiere una acción del Owner (**OD-P4**).

---

## 12. G5 status

# G5 = OPEN

Aunque **esta auditoría satisface el requisito de evidencia de producción** que `17-…` exigía, G5 no puede cerrarse. Evaluación contra los 6 criterios:

| # | Criterio | Estado |
|---|---|---|
1 | No existen conflictos no clasificados | **CUMPLIDO** — los 5 usuarios clasificados como `A. SIN CONFLICTO` |
2 | Emails duplicados clasificados | **CUMPLIDO** — 0 duplicados, 0 variantes de capitalización |
3 | Google IDs duplicados clasificados | **CUMPLIDO** — 0 duplicados, con 2 `googleId` reales auditados |
4 | Relaciones `Usuario → Empresa` válidas | **CUMPLIDO** — 0 huérfanos |
5 | Regla determinista por tipo de conflicto | **CUMPLIDO en lo aplicable** — R1 aplica a los 5; R2…R6 sin casos |
6 | Ningún caso requiere decisión de identidad sin documentar | **NO CUMPLIDO** — ver abajo |

### Por qué sigue OPEN

**Los cinco primeros criterios se cumplen con evidencia de producción real.** El conflicto de identidad que G5 buscaba **no existe**: cero duplicados de email, cero duplicados de Google ID, integridad referencial perfecta.

**Falla el criterio 6**, por cuatro decisiones de identidad no documentadas que esta auditoría reveló:

1. **P-01** — el fixture `Empresa Demo Aislamiento` está en producción y el backfill lo procesaría como `Business` real.
2. **P-02** — 2 usuarios `OWNER` sin permisos, creados por alta automática de Google, alcanzan endpoints de caja sin autorización.
3. **P-04** — registro de migración `rolled_back` residual que puede bloquear la migración de identidad.
4. **P-05** — 3 cuentas del seed activas y sin rotar, 2 de ellas `OWNER`.

Además siguen `PENDING` los rulings **OR-002-B/C/D** y el catálogo de **`D-005`**.

### Lo que cambió respecto al veredicto anterior

| | Antes (`17-`, `19-`) | Ahora |
|---|---|---|
Motivo del OPEN | **Falta evidencia de producción** | **Evidencia obtenida.** Faltan decisiones sobre 4 hallazgos concretos |
Naturaleza | Incertidumbre | **Riesgos identificados y localizados** |

**El gate avanzó sustancialmente**: pasó de "no sabemos" a "sabemos, y hay cuatro cosas que decidir".

---

## 13. Reconciliation matrix — producción

| User ID | Rol | Empresa | Google | Password | Permisos | Ventas | Conflicto | Clasificación | Acción |
|---|---|---|---|---|---|---|---|---|---|
`863ed73a` | `ASISTENTE_LOCAL` | Otra Roonda Más | — | sí | 3 | **3** | NINGUNO | **A. SIN CONFLICTO** | Candidato directo (R1) |
`e170673e` | `OWNER` | Otra Roonda Más | — | sí | 11 | **1** | NINGUNO | **A. SIN CONFLICTO** | Candidato directo (R1) |
`fabe6db5` | `OWNER` | *(por confirmar)* | — | sí | 11 | 0 | NINGUNO | **A. SIN CONFLICTO** | Candidato directo (R1) |
`ef3fd833` | `OWNER` | *(por confirmar)* | **sí** | **NO** | **0** | 0 | **P-02** | **A. SIN CONFLICTO** de identidad · riesgo de autorización | Revisar permisos antes del backfill |
`26beed84` | `OWNER` | *(por confirmar)* | **sí** | **NO** | **0** | 0 | **P-02** | **A. SIN CONFLICTO** de identidad · riesgo de autorización | Revisar permisos antes del backfill |

La asignación exacta de empresa por usuario no se consultó con ese nivel de detalle; los totales son 4 en `Otra Roonda Más` y 1 en `Empresa Demo Aislamiento`. La atribución individual de los tres últimos es **`NO DETERMINABLE`** con las consultas ejecutadas.

**Ningún usuario presenta conflicto de identidad.** Los dos casos marcados P-02 son riesgos de autorización, no de reconciliación.

---

## 14. Required Owner decisions

| # | Decisión | Severidad | Origen |
|---|---|---|---|
**OD-P1** | **¿Qué se hace con `Empresa Demo Aislamiento` en producción?** Migrarla como `Business`, excluirla del backfill, o eliminarla antes de migrar. Tiene 1 usuario `OWNER` activo | ALTA | P-01 |
**OD-P2** | **¿Se corrigen los permisos de los 2 usuarios de Google antes del backfill?** Hoy son `OWNER` con 0 permisos y alcanzan endpoints de caja sin `@RequierePermiso`. ¿Se les asignan permisos, se desactivan, o se corrige `caja.controller.ts` primero? | **CRÍTICA** | P-02, TD-007 |
**OD-P3** | **¿Se limpia el registro `rolled_back` de `_prisma_migrations`?** Puede bloquear futuras migraciones, incluida la de identidad | ALTA | P-04 |
**OD-P4** | **¿Se rotan las contraseñas de las 3 cuentas del seed?** Activas, sin modificar desde el 2026-09-21, con contraseña presente en el repo público. Dos son `OWNER` | **CRÍTICA** | P-05, TD-006 |
**OD-P5** | **¿Se revisa el alta automática de Google antes de habilitar `Membership` N:N?** Hoy crea `OWNER` sin permisos y asume que mismo email = misma persona (R-02) | ALTA | R-02, P-02 |

Siguen pendientes de fases anteriores: **OR-002-B** (mecanismo), **OR-002-C** (unicidad de `User`), **OR-002-D** (destino de las filas), **`D-005`** (catálogo de roles).

---

## 15. Evidence classification

| Conclusión | Clasificación |
|---|---|
5 usuarios, 2 empresas, 2 `googleId`, 4 ventas | **VERIFICADO POR EJECUCIÓN** |
0 emails duplicados, 0 variantes de capitalización | **VERIFICADO POR EJECUCIÓN** |
0 `googleId` duplicados | **VERIFICADO POR EJECUCIÓN** |
Integridad referencial `Usuario → Empresa` perfecta | **VERIFICADO POR EJECUCIÓN** |
Permisos derivables del rol (`min = max`) | **VERIFICADO POR EJECUCIÓN** |
`Empresa Demo Aislamiento` en producción (P-01) | **VERIFICADO POR EJECUCIÓN** |
Migración `rolled_back` residual (P-04) | **VERIFICADO POR EJECUCIÓN** |
Las 17 migraciones del repo están aplicadas | **VERIFICADO POR EJECUCIÓN** |
3 cuentas del seed activas y sin modificar (P-05) | **VERIFICADO POR EJECUCIÓN** |
2 usuarios sin permisos coinciden con los 2 de Google (P-02) | **VERIFICADO POR EJECUCIÓN** + **VERIFICADO POR CÓDIGO** |
Endpoints de caja sin `@RequierePermiso` | **VERIFICADO POR CÓDIGO** (`auth.google.service.ts`, TD-007) |
El schema está consistente pese a P-04 | **INFERENCIA** — deducido de que el seed y las ventas funcionan; no se inspeccionó `information_schema` |
Que la contraseña del seed no fue rotada | **INFERENCIA** desde `updatedAt == createdAt`; no se intentó autenticar |
Atribución individual empresa↔usuario de 3 usuarios | **NO DETERMINABLE** con las consultas ejecutadas |
`0010-otrarondamas-db-1` gestionado por Coolify | **INFERENCIA** por el prefijo y la presencia de `coolify-db` |

---

## 16. Confirmación de no modificación

- **Solo `SELECT`.** Ningún `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`, `TRUNCATE`.
- **Sin migraciones** ejecutadas. El registro `rolled_back` **no se tocó**.
- **Sin cambios** en schema, código, datos, roles, permisos, usuarios, sesiones ni tokens.
- **Ningún `User` fusionado.** Ninguna contraseña rotada. El typo `"Roonda"` sigue en producción.
- **No se intentó autenticar** con ninguna credencial.
- **Credenciales no impresas.** Emails ofuscados o descompuestos en local-part/dominio; `googleId` nunca expuesto.
- **Sin deploy.**

El script ejecutado (`G5-PROD-AUDIT-QUERIES.sql`, commit `360bbba`) es auditable: contiene únicamente sentencias `SELECT` y `\echo`.
