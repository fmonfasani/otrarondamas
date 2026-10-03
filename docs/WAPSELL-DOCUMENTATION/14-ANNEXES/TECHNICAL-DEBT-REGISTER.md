# Wapsell — Technical Debt Register

**Fase:** 09-ANNEXES · **Fecha:** 2026-09-28 · **Estado:** OPEN
**Método:** verificación directa de repositorio, solo lectura. **Ningún ítem de esta lista fue corregido.**

## Alcance

Deuda técnica observada en el repositorio real. Cada ítem está registrado, no resuelto: el protocolo de esta fase prohíbe corregir código.

Esto **no** duplica las brechas de integridad de stock ya auditadas en [`10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md`](../10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md) (`AUD-D010-G01`…`G10`), que siguen siendo la referencia para ese dominio. Acá se registra deuda **estructural y de mantenibilidad** no cubierta allí.

Severidad: `CRÍTICA` (bloquea operación segura) · `ALTA` (riesgo material) · `MEDIA` (fricción sostenida) · `BAJA` (cosmético).

---

## TD-001 — Ausencia total de tests y de CI/CD

**Severidad:** CRÍTICA · **Evidencia:** `VERIFIED BY CODE`

`find apps/api -name "*.spec.ts" -o -name "*.e2e-spec.ts"` → **0 archivos**. Jest está configurado en `apps/api/package.json` pero no existe ninguna suite. Los frontends tampoco tienen `.test.*` ni `.spec.*`. No hay workflows de CI en el repositorio.

**Consecuencia:** ningún cambio tiene verificación automatizada. Toda afirmación de correctitud se apoya en prueba manual. En un sistema que ya maneja stock, caja y dinero real de un negocio en operación, y que además tiene brechas de integridad concurrente verificadas (`AUD-D010-G01`, `G02`), esto es lo que convierte cualquier refactor futuro en una apuesta.

**Relación:** CON-027 (ausencia de CI/CD), `AUD-D010-G08` (ausencia de tests como brecha de D-010).

**No corregido.** Escribir la primera suite de tests es trabajo de implementación, fuera del alcance de una fase documental.

---

## TD-002 — Typo `"Roonda"` como clave funcional en el código

**Severidad:** ALTA · **Evidencia:** `VERIFIED BY CODE`

El nombre del negocio aparece mal escrito (`"Otra Roonda Más"`) en 6 archivos de código y configuración: `apps/api/prisma/seed.ts`, `apps/api/src/main.ts`, `apps/api/src/invitaciones/invitaciones.service.ts`, `apps/api/prisma/migrate-categoria-a-jerarquia.ts`, `apps/api/package.json`, `package.json`. Los frontends y las specs usan la forma correcta.

**Por qué no es cosmético:** en `seed.ts` el string es la clave del `upsert` de `Empresa`, y `Empresa.nombre` es `@unique`. Corregir el typo sin una migración de datos crea una **segunda** empresa en lugar de renombrar la existente, y todo lo que cuelga de `empresaId` queda apuntando a la vieja. Aparece además en emails de invitación, cara al usuario.

**Relación:** CON-008.

**No corregido.** Requiere migración de datos coordinada, que esta fase prohíbe explícitamente.

---

## TD-003 — Modelos de datos sin servicios que los consuman

**Severidad:** MEDIA · **Evidencia:** `VERIFIED BY CODE` (vía AS-IS)

`CuentaCorriente`, `Deuda`, `AplicacionPago` y `Entrega` existen en `schema.prisma` sin servicios ni flujos que los usen. `EstadoVenta.ANULADA` existe como valor de enum sin lógica de anulación.

**Consecuencia:** el schema promete capacidades que la aplicación no tiene. Alguien leyendo solo el modelo de datos concluye que hay cuenta corriente y entregas. Tablas y enums muertos acumulan costo de mantenimiento en cada migración futura.

**Relación:** CON-017 (ciclo de vida de Venta), CON-021 (cuentas por cobrar), CON-025 (fulfillment).

**No corregido.** Decidir entre implementar o remover es una decisión de producto abierta.

---

## TD-004 — `docs/pos-admin-files/` de estado indeterminado

**Severidad:** MEDIA · **Evidencia:** `NOT DETERMINABLE`

Contiene archivos `.tsx` sueltos junto a `COPIAR_ESTO_AHORA.txt` e `INTEGRADO.md`. Parece una entrega externa de UI con instrucciones de integración manual. Fue **excluido del inventario de fuentes** por ser código y no documentación, con lo cual quedó sin clasificar en ninguna fase.

**Consecuencia:** código fuera de `apps/`, de vigencia desconocida. No se puede determinar sin lectura profunda si ya fue integrado (lo sugiere `INTEGRADO.md`), si está pendiente (lo sugiere `COPIAR_ESTO_AHORA.txt`), o si divergió de lo que hoy vive en `apps/pos-admin`. Las dos señales se contradicen.

**Relación:** CON-031.

**No corregido.** Determinar su estado exige comparar cada `.tsx` contra su equivalente en `apps/pos-admin` — trabajo de verificación no realizado en esta fase.

---

## TD-005 — Directorios vacíos en la raíz

**Severidad:** BAJA · **Evidencia:** `VERIFIED BY CODE`

`src/`, `src/components/`, `src/features/`, `src/features/pos/` existen sin ningún archivo y sin estar versionados.

**Relación:** CON-032.

**No corregido.** Eliminación trivial pero destructiva sobre el árbol de trabajo; queda a decisión del Owner.

---

## TD-006 — Contraseña de desarrollo fija en el seed; estado en producción sin verificar

**Severidad:** ALTA · **Evidencia:** `VERIFIED BY CODE` (el seed) + `NOT DETERMINABLE` (producción)

### Verificado en código (2026-09-28)

`apps/api/prisma/seed.ts:53` hashea una contraseña **literal en el código fuente** con bcrypt (coste 10) y la aplica a **3 cuentas** (líneas 141, 157, 184). No se lee de una variable de entorno, así que no hay forma de sembrar con otra contraseña sin editar el archivo.

El hash es correcto (bcrypt, no texto plano ni MD5); el problema es que el valor de entrada es público y fijo.

### Higiene de secretos — verificada y correcta

Se revisó qué hay versionado, **sin volcar valores**:

- Archivos con nombre de entorno trackeados en Git: **2**, ambos `.example` (`.env.prod.example`, `apps/api/.env.example`). **Ningún `.env` real está versionado.**
- `.gitignore` cubre `.env`, `.env.local`, `.env.production`, `.env.*.local`.
- Claves sensibles en las plantillas, medidas por longitud sin exponer contenido: en `.env.prod.example` `POSTGRES_PASSWORD`, `JWT_SECRET`, `GOOGLE_CLIENT_SECRET` y `RESEND_API_KEY` están **todas en 0 caracteres**. En `apps/api/.env.example`, `GOOGLE_CLIENT_SECRET` y `RESEND_API_KEY` son `""`, y `JWT_SECRET` es un placeholder evidente de 19 caracteres que empieza con `super…`.

**No hay ningún secreto real filtrado en el repositorio.** Esta parte del riesgo queda **descartada**, no pendiente.

### Lo que sigue sin determinar

Si el seed corrió alguna vez contra la base de datos de producción (`otrarondamas.wapsell.com`) y las contraseñas no se rotaron después, existen 3 cuentas —una de ellas Owner— cuya credencial está publicada en el repositorio.

**No es verificable por lectura de código**, y no se intentó autenticar contra el entorno real: probar credenciales contra un sistema en producción no corresponde a una auditoría documental.

**Severidad ALTA a pesar de ser parcialmente indeterminable:** el costo de verificar es una consulta a la base de producción; el costo de equivocarse es acceso administrativo total.

**No corregido.** Acción sugerida para el Owner, en este orden: (1) confirmar contra la base de producción si esos tres emails existen; (2) si existen, rotar las contraseñas; (3) parametrizar la contraseña del seed por variable de entorno para que el valor fijo deje de ser sembrable.

---

## TD-007 — Tokens de `Cliente` alcanzan lecturas del panel interno

**Severidad:** ALTA · **Evidencia:** `VERIFIED BY CODE` (2026-09-28) — elevado desde `DOCUMENTED`

El AS-IS lo reportaba como riesgo heredado de SRC-011 (R01), sin verificar. **Verificado en código: el riesgo es real, pero su alcance es más acotado y más preciso de lo que decía la formulación original.**

### Mecánica verificada

Los tokens de cliente se emiten en `auth.cliente.service.ts:149-159` con un discriminador explícito `type: 'cliente'` y, críticamente, **`permisos: []`** (línea 154). El campo `rol: 'OWNER'` es un placeholder, con un comentario en el código aclarando que `type` es el discriminador real.

`JwtAuthGuard` y `PermissionsGuard` están registrados como guards **globales** (`app.module.ts:51-52`). `jwt.strategy.ts:32` propaga `type` al usuario autenticado.

**Ningún guard verifica `type`.** `PermissionsGuard` (`permissions.guard.ts:20-38`) solo evalúa `user.permisos.includes(permisoRequerido)`, y su línea 26-28 es la que define el alcance del riesgo:

```
if (!permisoRequerido) {
  return true; // Endpoint sin @RequierePermiso: solo exige autenticación.
}
```

### Consecuencia real

Un endpoint del panel **con** `@RequierePermiso` está protegido de facto: `permisos: []` nunca satisface el chequeo. Un endpoint **sin** ese decorador acepta cualquier JWT válido, incluido uno de cliente.

El patrón observado en los controllers de panel es que **las escrituras llevan `@RequierePermiso` y las lecturas no**. Endpoints de lectura verificados como alcanzables por un token de cliente:

| Controller | Endpoints sin `@RequierePermiso` |
|---|---|
| `clientes.controller.ts` | `@Get()` (:29), `@Get(':id')` (:34) — **listado completo de clientes del negocio** |
| `inventario.controller.ts` | `@Get('stock')`, `@Get('productos/:id/lotes')`, `@Get('productos/:id/movimientos')`, `@Get('alertas')` |
| `compras.controller.ts` | `@Get('proveedores')`, `@Get('compras')`, `@Get('compras/:id')`, `@Get('compras/:id/pagos')`, `@Get('compras/:id/devoluciones')` — **costos y condiciones de proveedores** |
| `caja.controller.ts` | `@Get('estado')`, `@Get('movimientos')` |
| `catalogo.controller.ts` | `@Get()`, `@Get(':id')` (impacto bajo: el catálogo ya es público por diseño) |

El dato más sensible expuesto es comercial, no de credenciales: cartera de clientes, precios de compra y márgenes, y estado de caja. El aislamiento por `empresaId` **sí se mantiene** (los servicios reciben `user.empresaId`), así que no hay fuga entre empresas — la fuga es de rol dentro de la misma empresa.

**Sin verificar:** si algún frontend de tienda expone estos endpoints, y si el token de cliente es obtenible por un atacante externo en lugar de un cliente legítimo. La explotación real no fue probada — no se ejecutó ninguna request contra un servidor.

### Defensa que sí existe

`legajo.cliente.controller.ts` (:96, :119) y `auth.cliente.controller.ts` **sí** validan `user.type !== 'usuario'` en línea, con `ForbiddenException`. Son **2 de 18** controllers. El patrón correcto existe en el código; simplemente no está aplicado de forma sistemática ni centralizada.

**Relación:** CON-015.

**No corregido.** La corrección natural (un guard que valide `type` para los controllers de panel, o exigir `@RequierePermiso` en toda lectura) es un cambio de código fuera del alcance de esta fase. Registrado para decisión del Owner.

---

## Resumen

| ID | Tema | Severidad | Evidencia |
|---|---|---|---|
| TD-001 | Sin tests ni CI/CD | **CRÍTICA** | `VERIFIED BY CODE` |
| TD-002 | Typo `"Roonda"` como clave de `upsert` | ALTA | `VERIFIED BY CODE` |
| TD-006 | Contraseña fija del seed; estado en producción sin verificar | ALTA | `VERIFIED BY CODE` (seed) + `NOT DETERMINABLE` (producción) |
| TD-007 | Tokens de `Cliente` alcanzan lecturas del panel | ALTA | **`VERIFIED BY CODE`** (elevado 2026-09-28) |
| TD-003 | Modelos sin servicios | MEDIA | `VERIFIED BY CODE` |
| TD-004 | `pos-admin-files/` indeterminado | MEDIA | `NOT DETERMINABLE` |
| TD-005 | Directorios vacíos en la raíz | BAJA | `VERIFIED BY CODE` |

**Ningún ítem fue corregido.**

**Actualización 2026-09-28** — TD-006 y TD-007 fueron investigados (ver [`10-AUDIT/03-PRE-COMMIT-REPORT-2026-09-28.md`](../10-AUDIT/03-PRE-COMMIT-REPORT-2026-09-28.md)):

- **TD-007 pasó de `DOCUMENTED` a `VERIFIED BY CODE`.** El riesgo es real: las lecturas de panel sin `@RequierePermiso` (cartera de clientes, costos de proveedores, estado de caja) aceptan tokens de cliente. El alcance es fuga **de rol dentro de la misma empresa**, no entre empresas.
- **TD-006 quedó dividido.** La higiene de secretos en Git resultó **correcta y se descartó** como riesgo: ningún `.env` real versionado, todas las claves sensibles de las plantillas vacías o placeholders. Lo que sigue `NOT DETERMINABLE` es únicamente si las 3 cuentas del seed existen con esa contraseña en producción — no verificable sin consultar la base real.

El ítem de mayor apalancamiento pasa a ser **TD-001**: sin tests, corregir TD-007 o TD-002 son cambios sin red de seguridad sobre un sistema en operación.
