# AS-IS — Branding
**Evidencia:** DOCUMENTED (SRC-011 §11) + VERIFIED BY CODE (stack de frontend confirmado en `02-ASIS-ARCHITECTURE.md`)

## Branding real, hardcodeado, sin sistema configurable

- **pos-admin**: hardcodeado a "Otra Ronda Más" — `index.html <title>`, `Sidebar` con texto
  "OtraRonda", `LoginPage` con 4 assets de marca embebidos, `ComprobantePage` con "OTRA RONDA MÁS"
  literal, favicons propios, `tailwind.config.js` con `brand.yellow = #FFC107`.
- **tienda-online**: Logo, Header, Footer, página de Registro, `CheckoutPage` con referencia a
  Instagram "otrarondamas.ok"; CSS custom properties con `--brand-yellow = #f9d82e`.
- **API**: título de Swagger "Otra Roonda Más API", textos de los emails de invitación, `seed.ts`,
  hardcodes en `sync-permisos-owner.ts`.
- **Infraestructura**: scope npm `@otrarondamas/*`, base de datos `otrarondamas`, dominios
  `*.otrarondamas.wapsell.com`, path de VPS `0010-otrarondamas`.

## Tokens de marca inconsistentes — tres amarillos distintos, sin reconciliar

| Origen | Valor del amarillo primario |
|---|---|
| `pos-admin` (`tailwind.config.js`) | `#FFC107` |
| `tienda-online` (CSS vars, comentado en el propio código como "EXACTOS del Design System") | `#f9d82e` |
| "Informe Integral" (SRC-013, visión Wapsell) | `#FFD700` |

Ningún módulo reconcilia estos tres valores — cada superficie usa el suyo. Esto es consistente con
que **`Empresa.configuracion` (campo `Json` en el schema) existe pero no se lee en ningún lugar del
código** (confirmado en `03-ASIS-DATA.md` y `06-ASIS-MODULES.md`): no hay ningún mecanismo real de
tema/marca configurable por empresa, pese a que el modelo de datos ya tiene el campo preparado para
ello.

## `packages/ui-kit`

Existe como paquete del workspace, **vacío** — confirmado tanto por SRC-011 como por la estructura
de `packages/` verificada en esta sesión. Es scaffolding puro, sin ningún componente ni token
implementado.

## Relación con SRC-007/009 y SRC-024 (design system de Ventas)

`spec-modulos_ventas.md` referencia un "Design System — Otra Ronda Más" externo (artifact no
accedido en esta documentación) con su propia paleta declarada (fondo `#F5F5F2`, sidebar `#111111`,
acción primaria `#F9D82E`, etc.) — un **cuarto** conjunto de tokens, parcialmente coincidente con el
de `tienda-online` (`#f9d82e` ≈ `#F9D82E`) pero no con `pos-admin` (`#FFC107`) ni con la visión
Wapsell (`#FFD700`). No se investigó en esta sesión si ese design system ya fue aplicado al código
real de `pos-admin` — dado que `tailwind.config.js` sigue en `#FFC107`, la evidencia disponible
sugiere que **no**, pero esto queda como `NOT DETERMINABLE` sin abrir el artifact citado.

## Relevancia para DEC-001

Un "Business Theme" configurable por negocio (necesario si Otra Ronda Más pasa a ser un tenant entre
varios de Wapsell) requiere resolver primero cuál de estos cuatro conjuntos de tokens es el
canónico — hoy no hay ninguno, hay cuatro conviviendo sin jerarquía declarada.
