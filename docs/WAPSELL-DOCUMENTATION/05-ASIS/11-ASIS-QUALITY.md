# AS-IS — Quality
**Evidencia:** VERIFIED BY CODE (búsqueda exhaustiva, esta sesión) + VERIFIED BY EXECUTION (SRC-004)

## Tests: cero archivos, infraestructura lista pero sin usar

Búsqueda exhaustiva (`*.spec.ts`, `*.test.ts`, carpetas `test/`, `e2e/`) en todo el repo, excluyendo
`node_modules` → **CERO resultados**. Confirmado independientemente por el agente de exploración de
esta sesión y por SRC-011.

Dato no trivial: `apps/api/package.json` **sí** tiene scripts `test`/`test:cov`/`test:e2e`
configurados con Jest y `ts-jest`, dependencias instaladas (`jest`, `ts-jest`, `supertest`,
`@nestjs/testing`) y un bloque `"jest"` de configuración completo. **La infraestructura de testing
está lista pero no hay ni un solo archivo de test real escrito.** El script `test:e2e` apunta a
`./test/jest-e2e.json`, que **no existe** (confirmado también por SRC-011). El script `test` de la
raíz del monorepo solo hace `echo` (SRC-011).

## CI/CD: no existe

No hay carpeta `.github/` ni ningún archivo de pipeline (`.yml`/`.yaml`) fuera de los
`docker-compose*.yml`. Sin GitHub Actions, GitLab CI, ni ningún otro sistema de integración
continua.

## Qué reemplaza a los tests: verificación manual documentada contra entornos reales

El patrón de trabajo real, documentado extensamente en SRC-004 (secciones 1-37), es: **build (`nest
build`, exit 0) → arranque real del servidor → pruebas manuales vía requests HTTP directos contra
servidor y base de datos reales → verificación cruzada en Postgres con `SELECT` directos → servidor
detenido explícitamente** — repetido para cada incremento de funcionalidad. Esto es evidencia real
de ejecución con resultados observados (no simulacros ni afirmaciones sin verificar), pero:

- **No es una suite automatizada ni regresión continua.** Cada verificación fue manual y puntual
  para el incremento del momento — no hay garantía de que un cambio posterior no haya roto algo ya
  verificado antes, porque no queda una prueba reejecutable.
- No hay ningún gate automático antes de merge o deploy.

## Linting: sí configurado y usado activamente

ESLint + Prettier en las 3 apps (`eslint`, `prettier`, `@typescript-eslint`,
`eslint-plugin-react`/`react-hooks`), con `npm run lint` corrido y confirmado sin errores en la
inmensa mayoría de los incrementos documentados en SRC-004 — esta es la única práctica de calidad
automatizada (aunque manual en su ejecución, no en CI) que sí se aplicó de forma consistente.

## Contradicción de proceso, ya señalada en SRC-011 (C07, C08)

- `spec-modulos_ventas.md` §1 declara "nada de esta SPEC se implementa sin aprobación de la sección
  14"; su propia sección 14 marca **todas** las decisiones D-VTA como "Pendiente" — pero los commits
  de los incrementos Inc-1..4 de Ventas ya implementan comportamiento correspondiente a varias de
  esas decisiones (D-VTA-07/A, 10/A, 04/B, 11/A según SRC-011).
- Esa misma SPEC (Inc-1) pide explícitamente "UPDATE condicional de stock, CHECK en lotes, FK
  compuesta de cliente" como parte de la integridad mínima — SRC-011 documenta que, a su fecha, la
  migración `inc1` y el código de `descontarStock()` no implementaban eso. **Este punto sí fue
  re-verificado el 2026-09-28** en `10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md`: el `UPDATE`
  condicional **sí existe hoy** (`AUD-D010-C01`), pero no hay `CHECK` ni trigger (`AUD-D010-G04`)
  y `descontarStock()` sigue sin guarda de concurrencia (`AUD-D010-G01`). Ver la sección siguiente.

## Integridad transaccional del stock (D-010) — estado real verificado

**Evidencia:** `VERIFIED BY CODE` — `10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md`
(2026-09-28, HEAD `066bb91`, lectura estática del repositorio). Esta sección sustituye la
afirmación "no re-verificado en esta sesión" que este documento arrastraba desde la
reconstrucción anterior.

D-010 es un **requisito aprobado** (`04-DECISIONS/00-DECISION-REGISTER.md` §4.3.1) que exige
integridad transaccional del stock mediante *"controles de base de datos y/o transacción"*,
con operaciones de movimiento **atómicas**, **concurrentemente seguras**, **resistentes a
cantidades inválidas** y **consistentes entre movimientos y existencias resultantes**.

**Estado verificado: `IMPLEMENTATION NON-COMPLIANT / GAP`.** La implementación actual no
satisface D-010 por completo. Esto es un hallazgo sobre el código actual, no un requisito
nuevo.

### Controles que sí existen — `VERIFIED BY CODE`

| ID | Control verificado | Ubicación |
|---|---|---|
| `AUD-D010-C01` | `UPDATE` condicional atómico: `WHERE "id" = $2 AND "empresaId" = $3 AND "cantidad" + $1 >= 0`, evaluado en la base de datos. Es la **única** guarda de no-negatividad de `Lote.cantidad` en todo el repositorio | `inventario.service.ts:266-270` |
| `AUD-D010-C02` | Ajuste manual: el `UPDATE` del lote y el `movimientoStock.create` dentro de la misma `db.$transaction`; si el `UPDATE` condicional afecta 0 filas se aborta con `BadRequestException` | `inventario.service.ts:225-249` |
| `AUD-D010-C03` | Validación de cantidad en el borde: `@IsPositive()` / `@Min(1)` / `@NotEquals(0)` en venta, pedido, recepción y devolución a proveedor. Ninguna cantidad negativa o cero entra por HTTP | DTOs de `ventas`, `pedidos`, `compras` |
| `AUD-D010-C04` | Atomicidad de la venta: `db.$transaction` envuelve `venta.create`, `auditLog.create` y el bucle de `descontarStock`, que recibe `tx` y no un cliente nuevo | `ventas.service.ts:153-228`, `pedidos.service.ts:98-99` |
| `AUD-D010-C05` | Stock insuficiente: `BadRequestException`, sin mecanismo de excepción ni autorización por Business | `inventario.service.ts:315-319` |
| `AUD-D010-C06` | `loteVencidoAlMomento` se calcula una sola vez al emitir el movimiento y no se rederiva después | `schema.prisma:991-997`, `inventario.service.ts:347` |

### Brechas verificadas — `VERIFIED BY CODE`

| ID | Brecha | Condición verificada | Severidad |
|---|---|---|---|
| `AUD-D010-G01` | **Oversell concurrente** en `descontarStock`: la disponibilidad se decide en memoria de la aplicación sobre una lectura previa y el `decrement` es incondicional, sin guarda `gte` ni condición de versión | `inventario.service.ts:300-355` | CRÍTICA |
| `AUD-D010-G02` | **Devolución a proveedor sin guarda**: `decrement` sin `gte`, sin consulta previa ni validación de existencia. Una sola request puede dejar `Lote.cantidad` negativo, sin necesidad de concurrencia | `compras.service.ts:388-393` | CRÍTICA |
| `AUD-D010-G03` | **Ledger sin movimiento de balance**: `loteId` es `@IsOptional()`; si viene vacío se registra la Salida en el ledger y `Lote.cantidad` nunca se modifica. Movimiento y existencia quedan inconsistentes entre sí | `compras.service.ts:372-394` | CRÍTICA |
| `AUD-D010-G04` | **Sin defensa bajo la capa de aplicación**: 0 `CHECK` y 0 `TRIGGER` en las 17 migraciones; sin `@db.Decimal` en `Lote.cantidad` ni en `MovimientoStock.cantidad`; sin `@@index` en `MovimientoStock` | 17 migraciones + `schema.prisma:457, 984` | CRÍTICA |
| `AUD-D010-G05` | Todas las transacciones del API corren en el nivel por defecto de PostgreSQL, `READ COMMITTED` (0 coincidencias de `isolationLevel` / `SERIALIZABLE`). Es la condición que hace explotable G01, G06 y G07 | `apps/api/src` | ALTA |
| `AUD-D010-G06` | **Race de sobre-recepción**: el chequeo `cantidadRecibida > pendiente` usa un objeto `compra` leído fuera de la transacción, que se abre después del chequeo | `compras.service.ts:185-245` | ALTA |
| `AUD-D010-G07` | `SELECT MAX(numero) + 1` sin `isolationLevel`; `Venta.numero` no tiene constraint `@@unique` (el único unique de `Venta` es `idempotencyKey`), así que dos ventas concurrentes pueden recibir el mismo número | `ventas.service.ts:154-161`, `schema.prisma:663` | ALTA |
| `AUD-D010-G08` | **Ausencia total de tests**: 0 archivos `*.spec.ts`, `*.test.ts` o `*e2e-spec*`; Jest configurado e instalado pero sin usar; `test` vacío en `pos-admin` y `tienda-online`. Ningún control C01–C06 está protegido contra regresión y ninguna brecha es demostrable por ejecución | repositorio completo | ALTA |
| `AUD-D010-G09` | `tipoMovimiento` es `String` libre, no enum: el conjunto real de valores no está acotado por el esquema. `Ajuste` nunca se escribe — los ajustes manuales emiten `Entrada` o `Salida` | `schema.prisma:983`, `inventario.service.ts:243` | MEDIA |
| `AUD-D010-G10` | `Producto` no tiene columna de stock: la cantidad real vive en `Lote.cantidad` y cada lector suma lotes por su cuenta. Decisión documentada en el propio código, registrada como diseño consciente y no como defecto | `inventario.service.ts:97-101, 157-161` | MEDIA |

**Sobre `AUD-D010-G04`:** la ausencia de `CHECK`/`TRIGGER` es **evidencia técnica relevante**,
no una decisión de diseño independiente. D-010 no exige un `CHECK` concreto — exige
*"controles de base de datos y/o transacción"*, y ese "y/o" está hoy satisfecho solo en su
mitad transaccional: existen controles transaccionales en algunos caminos, pero no cubren
todos los caminos que modifican stock. Un `CHECK` aparece en la auditoría como una posible
solución entre varias, **no** como requisito aprobado.

El patrón correcto ya existe en el repositorio (`aplicarAjusteAtomico`, `AUD-D010-C01`) y
fue aplicado a los ajustes manuales, pero **no** al camino de venta, que es el de mayor
volumen. El comentario del propio código que afirma que *"la concurrencia [está] protegida
por la misma atomicidad"* es incorrecto: la atomicidad evita escrituras parciales, no lost
updates.

**No existe ninguna corrección aprobada para estas brechas.** La auditoría registra
observaciones de arreglo con estado `PROPOSED / OPEN` que no forman parte de este AS-IS y
no están aprobadas por ninguna decisión. Ver `10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md` §13.

## Relevancia para DEC-001

Cualquier migración de schema hacia `Business`/`Membership` (derivada de DEC-001) se haría **sin
red de tests que confirme que no rompe las invariantes ya validadas manualmente** (INV-01 a INV-14
de SRC-001, RN-VTA-01 a 18 de SRC-007). Esto es explícitamente la recomendación de SRC-011 en su
sección 22: "crear una red mínima de tests antes de refactorizar" — no se decide acá si eso se hace,
pero queda documentado como riesgo real de proceso, no solo teórico.
