# Prompt para OpenCode — Scaffolding de Otra Roonda Más (v2)

Uso: pegar el bloque de abajo (desde "## Rol y alcance" hasta el final) directamente en OpenCode, con el working directory apuntando a este repo (`D:\Software Development\Porfolio\OtraRondaMas`).

Este prompt pide **solo estructura y scaffolding** — sin diseño visual ni lógica de negocio fina. Esa parte se hace después, a mano, sobre lo que OpenCode deje armado.

**Versión anterior:** este documento reemplaza la v1 (auditada por separado; los hallazgos de esa auditoría —entidad de imputación de pagos, `Turno`, `Devolucion`, aislamiento multiempresa a nivel de esquema, atomicidad de stock, doble confirmación de arqueo, guía de reportes— ya están incorporados abajo). Fuente de las correcciones: `docs/criterios-diseno-dueno-D01-D19.md` (20/09/2026) y el SDD actualizado en su sección 10 (misma fecha).

---

## Rol y alcance

Actuás como ingeniero de plataforma armando el **scaffolding inicial** de un monorepo. Tu responsabilidad es estructura, configuración, infraestructura de desarrollo, esqueleto de módulos y contratos — **no** diseño visual, **no** estilos finales de UI, **no** lógica de negocio compleja, **no** implementación de reglas de dominio detalladas, **no** despliegue. Todo eso se hace después, manualmente, por otra persona/agente. Tu entregable debe compilar, levantar y mostrar pantallas/endpoints placeholder funcionales, con la arquitectura correcta ya en su lugar.

### Fuentes de verdad, en este orden de precedencia

1. `docs/SDD-especificacion-funcional-v0.1.md` — especificación funcional. Su sección 10 (Decisiones pendientes D-01 a D-19) fue actualizada el 20/09/2026 con una columna "Criterio de diseño aprobado" para cada decisión: **esa columna es dirección de diseño ya aprobada por el dueño y sí debe implementarse como estructura**; los datos comerciales concretos que la misma tabla marca como "pendiente" en cada fila **no se inventan**, se dejan configurables.
2. `docs/criterios-diseno-dueno-D01-D19.md` — detalle ampliado de esas 19 respuestas, con ejemplos y matices que la tabla resumida del SDD no repite. Consultalo cuando la fila de la sección 10 del SDD te resulte ambigua.
3. Este prompt — instrucciones técnicas de estructura. Si algo acá contradice el SDD o el documento de criterios, **ganan esos dos documentos**, no este prompt.

Si el SDD o el documento de criterios dicen "pendiente" para un dato concreto (un monto, un porcentaje, una zona, un plazo, un mecanismo), **no inventes ese dato**. Si dicen "configurable", modelalo como tal (columna, tabla o parámetro), no como valor fijo en código.

## Inspección obligatoria antes de escribir nada

Antes de crear o modificar un solo archivo:

1. Ejecutá `git status` y `git log --oneline --all` sobre este repo y **reportá el resultado en tu primera respuesta**, antes de generar código. No asumas que el repo está vacío.
2. Listá el árbol de archivos existente (`find . -not -path "./.git*" -type f` o equivalente) y confirmá cuáles archivos ya existen: como mínimo esperás encontrar `README.md`, `.gitignore`, `docs/SDD-especificacion-funcional-v0.1.md`, `docs/criterios-diseno-dueno-D01-D19.md`, `docs/prompt-scaffolding-opencode.md`, `assets/brand/logov0.0.1.jfif`. Si encontrás código, `package.json`, `schema.prisma` o cualquier archivo de aplicación que no esté en esta lista, **detenete y reportalo antes de continuar** — puede ser trabajo previo que no debas sobreescribir sin más.
3. No borres, fusiones ni reorganices ningún archivo existente salvo indicación explícita de este prompt (ver "Qué NO tenés que hacer").
4. Todo lo que crees debe ser nuevo (`apps/`, `packages/`, `docker-compose.yml` en la raíz, etc.) o una extensión aditiva de `README.md` — nunca una reescritura completa de un archivo existente sin necesidad.

## Contexto del proyecto

- Producto: ERP/SaaS comercial para "Otra Roonda Más" (almacén/kiosco), piloto de una sola empresa con capacidad de evolucionar a multiempresa.
- Se despliega como aplicación **independiente** bajo `otrarondamas.wapsell.com`, sin dependencias de código con el repo `wapsell` (ver sección 7 del SDD). No busques, clones ni referencies ningún repo externo. No tenés acceso ni necesitás tenerlo al VPS de producción ni a ningún servicio externo real.
- Fecha objetivo de producción: 30/11/2026. Esto es un piloto — priorizá que el scaffolding sea simple y correcto, no que anticipe escala que no hace falta.
- **No despliegues nada. No toques servicios existentes** (ni de este proyecto, que no tiene ninguno desplegado todavía, ni de Wapsell, ni de ningún otro). Todo lo que generás corre en el entorno de desarrollo local de quien ejecute este scaffolding.

## Resolución explícita de la discrepancia de stack

El SDD, en su sección 7.3, dice textualmente que "el stack final de Otra Roonda Más... sigue sin decidir". Esa frase **quedó desactualizada por una decisión tomada en conversación directa con el dueño/desarrollador**, fuera del texto del SDD, y todavía no fue reflejada de vuelta en la sección 7.3 (es una tarea documental pendiente, no una contradicción que debas resolver vos inventando una preferencia).

**El stack que vas a usar en este scaffolding es el que sigue, y es una decisión ya tomada, no una propuesta tuya ni una lectura literal de la sección 7.3:**

- **Backend:** NestJS + TypeScript + PostgreSQL + Prisma ORM.
- **Frontend POS/Admin (uso interno):** React + Vite + TypeScript.
- **Frontend Tienda Online (público):** React + Vite + TypeScript, por consistencia de herramientas en el piloto. Documentá en el README por qué no se usó SSR (RF-06 no pide SEO complejo para el piloto: es catálogo + carrito + Mercado Pago).
- **Monorepo:** 2 apps de frontend + 1 API, con paquetes compartidos (estructura exacta más abajo).
- **Base de datos:** PostgreSQL siempre — nunca SQLite, en ningún ambiente. La sección 7.1 del SDD ya documentó por qué (SQLite de Wapsell no es reutilizable ni recomendable).

No cuestiones ni renegocies esta elección. Si concluís que el SDD "no permite" usar este stack porque su sección 7.3 dice "sin decidir", estás leyendo mal la precedencia: la sección 7.3 describe el estado de un documento que quedó desactualizado, no una restricción activa. Al finalizar el scaffolding, dejá una nota en `docs/scaffolding-notas.md` (ver más abajo) recomendando que alguien actualice la sección 7.3 del SDD para que dejen de coexistir las dos versiones — vos no edites el SDD.

## Estructura del monorepo

```
apps/
  api/             (NestJS)
  pos-admin/       (React + Vite — POS, caja, inventario, clientes, compras, reportes, auditoría)
  tienda-online/   (React + Vite — catálogo público, carrito, checkout Mercado Pago)
packages/
  shared-types/    (tipos TypeScript compartidos: entidades, DTOs, enums de estado — ver "Sincronización de tipos" abajo)
  ui-kit/          (vacío por ahora, solo el esqueleto del paquete — la estética la hago yo después)
docs/              (ya existe, no la reestructures, solo podés agregar archivos)
assets/            (ya existe, contiene el logo — no la toques)
```

Workspaces npm o pnpm — decidilo vos y documentá la elección en `docs/scaffolding-notas.md`.

**Sincronización de tipos:** `packages/shared-types` no debe mantenerse escrito a mano en paralelo al `schema.prisma`. Reexportá los tipos generados por `@prisma/client` (o un generador equivalente) desde ese paquete, para que no existan dos fuentes de verdad de tipos entre backend y frontends.

**Contenedores:** Docker + docker-compose para desarrollo local (al menos API + Postgres; los frontends pueden correr con `npm run dev` fuera de Docker — decidilo vos, priorizando developer experience simple). Nada de esto se despliega a ningún servidor.

## Modelo de datos (Prisma schema)

Diseñá `apps/api/prisma/schema.prisma` cubriendo, como mínimo, las entidades de esta lista. Es un piso, no un techo: si el SDD o el documento de criterios implican algo que falta acá, agregalo y documentá por qué en `docs/scaffolding-notas.md`.

### Entidades base

- **Empresa** (RF-01, INV-01): id, nombre, configuración, timestamps.
- **Usuario** (RF-02): id, empresaId, nombre, email, passwordHash, activo, timestamps.
- **Permiso** / **UsuarioPermiso**: catálogo de permisos granulares configurables (no un enum fijo de roles) — ver sección 3.2 del SDD para la lista de operaciones restringidas que sirven de referencia para el catálogo (`caja.gastos`, `inventario.ajustes`, `precios.cambiar`, etc.).
- **Turno**: usuarioId, cajaId (nullable — un turno puede no estar atado a una caja específica), inicio, fin, estado. RF-02 exige registrar "quién opera cada turno"; el momento exacto de inicio (login, apertura de caja, o ambos) queda pendiente (ver sección 10 del SDD, nota bajo RF-02), pero la entidad debe existir ya.

### Catálogo y precios

- **Categoria**: Bebidas, Snacks, Almacén, Kiosco como seed inicial (RF-03), extensible.
- **Producto** (RF-03): nombre, código interno, código de barras, marca, categoriaId, unidad base, costo, precio minorista, precio mayorista (nullable), activo, empresaId. **Único por empresa, no global**: `@@unique([empresaId, codigoBarras])` y `@@unique([empresaId, codigoInterno])` — dos empresas distintas pueden vender el mismo producto físico con el mismo código de barras real.
- **ReglaPrecio** (D-01, criterio de diseño aprobado): entidad configurable que define bajo qué condición (tipo de cliente, cantidad mínima) se aplica el precio mayorista en vez del minorista. Si ninguna regla matchea, se usa el precio minorista — esto último sí es una regla de fallback ya aprobada, implementala como comportamiento por defecto del cálculo (no como TODO).
- **Presentacion**: productoId, nombre (unidad/pack/caja/etc.), factor de conversión **nullable** — si no hay conversión configurada para una presentación, el sistema no debe calcularla por suposición (criterio de diseño aprobado D-08); el código que use esta relación debe rechazar el cálculo explícitamente cuando el factor sea null, no asumir 1:1 ni ningún otro valor.
- **Lote** (RF-03, RF-11): productoId, número de lote, fechaVencimiento, cantidad.

### Ventas y pedidos

- **Venta** / **VentaItem** (RF-05): estado, canal (presencial/mayorista/online), usuarioResponsableId, empresaId. Una venta confirmada no se borra (INV-02) — no implementes ningún endpoint `DELETE` físico sobre ventas. Cada `VentaItem` que provenga de un producto con lotes debe poder referenciar el `Lote` específico del que salió, porque el bloqueo por vencimiento se evalúa **por lote, no por producto agregado** (criterio de diseño aprobado D-09): un producto puede tener un lote vencido y otro vigente simultáneamente, y solo el vencido debe bloquear venta.
- **Pedido** (RF-07, sección 6.1 del SDD): estados `RECIBIDO, CONFIRMADO, EN_PREPARACION, LISTO, ASIGNADO, EN_CAMINO, ENTREGADO, PARCIALMENTE_ENTREGADO, ENTREGA_FALLIDA, CANCELADO` como enum de Prisma. Canal de origen (WhatsApp, redes, web, presencial).
- **Devolucion** (RF-05, RF-12, INV-11, criterio de diseño aprobado D-17): referencia obligatoria a la `Venta` original (o a la `Compra`, si es devolución a proveedor); productos y cantidades involucrados; genera `MovimientoStock` correspondiente; requiere `Autorizacion` para excepciones. No confundir con `Reembolso`.
- **Reembolso**: operación separada y trazable de la devolución (criterio de diseño aprobado D-17 lo pide explícitamente como concepto distinto) — referencia a la `Devolucion` o directamente a un `Pago`, monto, medio, estado.

### Pagos y cuenta corriente

- **Pago**: estados `PENDIENTE, EN_PROCESO, APROBADO, RECHAZADO, CANCELADO, REEMBOLSADO_PARCIAL, REEMBOLSADO_TOTAL` (sección 6.2 del SDD). Debe incluir: medio (efectivo/transferencia/QR/Mercado Pago), **identificador externo nullable** (para el ID de la pasarela), **campo de idempotencia** (para no procesar dos veces la misma notificación de Mercado Pago — INV-13), y un flag de origen (`manual` vs. `adaptador`) según el criterio de diseño aprobado D-04. Esto es lo que D-03 pide explícitamente: un módulo de pagos desacoplado del proveedor, preparado para webhooks, sin necesitar todavía la modalidad concreta de Mercado Pago.
- **Deuda**: cliente o proveedor, monto original, saldo pendiente, fecha de origen, empresaId.
- **AplicacionPago**: entidad de imputación N:M entre `Pago` y `Deuda`/`Venta` — pagoId, deudaId (nullable), ventaId (nullable), montoImputado. **Esta entidad es la confirmación estructural más importante del criterio de diseño aprobado D-16**: el dueño exigió explícitamente que "la aplicación de cada cobro a una o más deudas debe registrarse explícitamente" y que los saldos se calculen "a partir de movimientos e imputaciones registradas", no de un campo agregado sin historial. Sin esta entidad, INV-04 e INV-05 (que los pagos aplicados no excedan el importe correspondiente, y que los pagos mixtos cuadren) no son verificables. Si no existe una regla de aplicación automática definida (D-16 la deja pendiente), el sistema debe requerir que se indique explícitamente a qué deuda(s) se imputa cada cobro — no implementes ningún criterio de aplicación automático por defecto (ej. "más antigua primero") sin que esté confirmado.

### Caja

- **Caja**, **AperturaCaja**, **MovimientoCaja**, **ArqueoCaja** (RF-09, sección 6.4): estados `CERRADA, ABIERTA, EN_ARQUEO`. Fondo fijo, cobros de ventas, cobros de deudas, gastos/retiros, efectivo esperado, efectivo contado, diferencia — todos como conceptos distinguibles, no un único monto agregado.
- **`ArqueoCaja` requiere doble confirmación**: `usuarioSalienteId` y `usuarioEntranteId` como dos campos separados, cada uno con su propio timestamp de confirmación — RF-09 lo exige explícitamente ("arqueo confirmado por vendedor saliente y entrante").
- El umbral de diferencia (`$5.000` de referencia, sección 10 D-05) se modela como **parámetro configurable** de la Caja o de la Empresa, no como constante en código. La condición exacta de comparación (`>` vs `>=`) y el tratamiento de diferencias menores al umbral quedan sin implementar (`// TODO(D-05)`), porque el propio dueño fue explícito en no asumir ningún tratamiento todavía.

### Compras y proveedores

- **Proveedor**, **OrdenCompra**, **Compra**, **RecepcionCompra** (RF-12, sección 6.3): estados `BORRADOR, EMITIDA, RECEPCION_PARCIAL, RECIBIDA` + alternativos de cancelación/diferencias. `RecepcionCompra` debe tener campos de cantidad esperada y cantidad recibida (la diferencia se registra automáticamente por resta, según D-10), más un campo de estado de revisión/autorización.
- **DocumentoAdjunto**: entidad genérica reutilizable (entidadTipo, entidadId, nombre, rutaOUrl, subidoPor, timestamps) para adjuntar facturas a `Compra`/`RecepcionCompra` (RF-12 lo exige) y, potencialmente, evidencia de entrega en el futuro (D-12 lo deja pendiente, pero conviene que la entidad ya exista genérica).

### Inventario

- **MovimientoStock** (RF-11, INV-03, INV-06): entradas, salidas, ajustes — nunca se borra; las correcciones son movimientos compensatorios con motivo. **La actualización del stock agregado de un producto debe ocurrir dentro de la misma transacción de Prisma (`$transaction`) que crea el `MovimientoStock`, y la validación de stock no-negativo debe evaluarse dentro de esa misma transacción** — no como una verificación previa separada, porque bajo concurrencia (dos ventas simultáneas del mismo producto) una verificación previa no atómica no garantiza INV-06.

### Entregas

- **Entrega** (RF-13): pedido asociado, quién prepara, quién entrega, resultado, medio de cobro, estado (incluyendo fallida/reprogramada).
- **ZonaEntrega** / **Tarifa** (D-11, criterio de diseño aprobado): zonas y tarifas configurables. El costo de entrega se calcula automáticamente **solo si la dirección matchea una zona con tarifa válida configurada**; si no matchea ninguna zona, el flujo debe requerir intervención explícita antes de confirmar el costo — no asignes un costo default ni asumas una zona por cercanía.

### Notificaciones y auditoría

- **Notificacion** (RF-14, D-13): evento (del catálogo de eventos candidatos de la sección RF-14 del SDD, ya utilizable como catálogo configurable), canal, destinatario, estado de envío, registro de error. **No conectes ningún envío real** — ni siquiera un stub que llegue a intentar una llamada HTTP saliente — el dueño fue explícito en que los envíos reales no se habilitan todavía.
- **AuditLog** (RF-16, INV-14): usuario, empresa, fecha/hora, acción, entidad afectada, valores anteriores/posteriores (JSON), motivo, autorización relacionada. Dejá un `AuditService` inyectable reusable. **Ningún módulo scaffoldeado debe llamarlo automáticamente todavía** — dejalo armado pero no conectado, y decilo explícitamente en `docs/scaffolding-notas.md` (no lo des por hecho ni lo dejes ambiguo: si no está conectado, que quede escrito que no lo está).
- **Autorizacion** (sección 3.2, INV-09): quién autorizó, cuándo, para qué operación, con qué resultado, referencia a la entidad afectada. **Restricciones no negociables, exigidas explícitamente por el dueño (D-06):**
  - Si el mecanismo de autorización incluye un PIN, **nunca se almacena en texto plano** — hasheado con bcrypt/argon2 igual que cualquier contraseña.
  - **Ningún agente, job programado o proceso automático puede generar una `Autorizacion` a nombre propio.** El campo que registra quién autorizó debe ser siempre un `usuarioId` de un usuario humano autenticado en el momento de la autorización — no un valor de sistema, no un usuario técnico, no un default. Si en algún punto del scaffolding te encontrás tentado a crear una autorización "automática" para destrabar un flujo, no lo hagas: dejá la operación bloqueada con un `NotImplementedException` o similar, y un TODO(D-06) explicando que falta el mecanismo real.
  - El mecanismo concreto (PIN, aprobación remota desde la cuenta del dueño, o ambos) sigue sin definir — el guard/servicio de autorización debe diseñarse de forma que ese mecanismo sea intercambiable, sin acoplar el resto del sistema a la elección final.

### Reglas transversales de modelado

- Toda entidad de negocio lleva `createdAt`, `updatedAt`, y `empresaId` con FK e índice donde corresponda.
- **INV-01 no se resuelve solo con la columna `empresaId`.** Además de la columna, implementá uno de estos dos mecanismos (documentá cuál elegiste y por qué en `docs/scaffolding-notas.md`; si no llegás a implementarlo completo, dejalo como TODO explícito, no como asumido):
  - Un **Prisma Client Extension** (`$extends`) que intercepte las queries de los modelos con `empresaId` y agregue el filtro automáticamente a partir del contexto de la request autenticada, o
  - **Row-Level Security de PostgreSQL**, con una política por tabla basada en una variable de sesión (`SET app.current_empresa_id`).
  - Un middleware/interceptor que "confía" en que cada service recuerde agregar el filtro manualmente **no cumple esta exigencia** — el SDD pide explícitamente que el aislamiento se proteja "desde la lógica del servidor y la base de datos, no únicamente desde la interfaz" (sección 5).
- Para endpoints de entidades con máquina de estados (`Pedido`, `Pago`, `Compra`, `Caja`): el endpoint de cambio de estado puede existir sin validar transiciones todavía, pero debe quedar un comentario explícito `// TODO: validar transiciones de estado según sección 6 del SDD` — no lo presentes como si la máquina de estados estuviera implementada.

### Migración y seed

Generá una migración inicial de Prisma y un seed (`apps/api/prisma/seed.ts`) que cree:

- Una empresa ("Otra Roonda Más") y, **una segunda empresa de prueba** (ej. "Empresa Demo Aislamiento") — exclusivamente para poder verificar en desarrollo que un usuario de una empresa no accede a datos de la otra (ver criterios de aceptación más abajo). Esta segunda empresa es solo de prueba técnica, no representa un requisito de negocio.
- Un usuario dueño (con todos los permisos) y un usuario vendedor de ejemplo **sin** el permiso `caja.gastos` (para poder probar el rechazo de autorización).
- Las 4 categorías iniciales (Bebidas, Snacks, Almacén, Kiosco).
- Una caja con fondo fijo de $25.000 ARS (RF-09).
- 2-3 productos de ejemplo por categoría, ficticios, con prefijo "DEMO —". El script de seed debe rechazar ejecutarse si `NODE_ENV=production` sin un flag explícito adicional.

## Backend (NestJS) — estructura de módulos

Un módulo NestJS por dominio. Estructura por módulo: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, con endpoints CRUD básicos (o los que tengan sentido — `Venta` no tiene `DELETE`) devolviendo datos reales desde Prisma, no mocks hardcodeados.

Módulos mínimos: `auth`, `empresas`, `usuarios`, `permisos`, `catalogo`, `precios`, `ventas`, `pedidos`, `pagos`, `caja`, `clientes`, `inventario`, `compras`, `proveedores`, `entregas`, `notificaciones`, `reportes`, `auditoria`.

- **Auth:** JWT propio (no reutilices nada de Wapsell). Hasheo con bcrypt o argon2. Guard de autenticación + guard de permisos (`@RequierePermiso('caja.gastos')`) leyendo de `UsuarioPermiso`.
- **Multiempresa:** implementá el mecanismo elegido en "Reglas transversales de modelado" (Prisma Client Extension o RLS), no solo un middleware que "confía" en el filtro manual.
- **Swagger/OpenAPI:** `/api/docs` con `@nestjs/swagger`.
- **Validación:** `class-validator` en los DTOs de entrada.
- **Módulo `reportes`:** exponé al menos un endpoint placeholder por ítem de RF-15 (ventas, caja, stock, productos próximos a vencer, deudas de clientes, deudas a proveedores, pedidos pendientes) devolviendo datos reales de agregación simple. El endpoint de "ganancias estimadas" es la única excepción: debe devolver explícitamente un estado de "no disponible — método de costeo pendiente de definición (D-18)", nunca un número calculado con un método no confirmado (FIFO, promedio, último costo) — el dueño fue explícito en que no se elige ninguno por defecto sin validación.
- No implementes lógica de negocio compleja (cálculo de descuentos, reglas de umbral de caja, conciliación de Mercado Pago, etc.) — dejá el método con `// TODO(D-XX): <qué falta decidir>` y una implementación mínima de paso.

## Frontend POS/Admin (`apps/pos-admin`)

React + Vite + TypeScript, React Router. Carpetas por feature (`src/features/ventas`, `src/features/caja`, etc.).

- Layout con navegación a las secciones principales — **sin diseño visual**, HTML semántico sin estilizar, comentarios `{/* TODO: diseño visual pendiente */}`. **No instales ninguna librería de componentes visuales, tema, ni sistema de diseño.**
- Cliente HTTP tipado usando `packages/shared-types`. `fetch` o `axios` simple; sin estado global salvo que sea estrictamente necesario.
- Pantalla de login funcional contra el backend real.
- Una pantalla placeholder por módulo, listando datos reales de la API.

## Frontend Tienda Online (`apps/tienda-online`)

React + Vite + TypeScript. Catálogo público (productos activos, sin auth) y carrito/checkout con placeholder de Mercado Pago (botón que llama a un endpoint placeholder del backend y muestra estado `PENDIENTE` — no implementes el flujo real de pago).

## Infraestructura de desarrollo

- `docker-compose.yml` en la raíz, solo para desarrollo local (Postgres, opcionalmente la API). Sin publicar puertos más allá de localhost, sin ningún paso de despliegue.
- Instrucciones paso a paso en el README raíz: `npm install`, levantar Postgres, migrar, seedear, correr las 3 apps.
- **No configures nginx, GitHub Actions de deploy, ni nada de producción.** No accedas a ningún VPS. No modifiques ni asumas la existencia de ningún servicio externo real.

## Qué NO tenés que hacer (explícitamente fuera de tu alcance)

- Nada de diseño visual: sin paleta de colores, sin tipografía, sin librería de componentes UI, sin animaciones, sin logo aplicado.
- Nada de lógica de negocio fina más allá de lo explícitamente descrito arriba como "criterio de diseño aprobado" (que sí se implementa): cálculo de descuentos con porcentajes reales, conciliación real de Mercado Pago, cálculo de ganancias con un método de costeo, mecanismo final de autorización (PIN concreto o flujo remoto concreto) — todo eso queda en TODOs trazables a los RF/D-XX correspondientes.
- Nada de integración real con WhatsApp, Mercado Pago, ni proveedores de notificaciones.
- Nada de despliegue, nginx, ni CI/CD.
- No toques `docs/SDD-especificacion-funcional-v0.1.md`, `docs/criterios-diseno-dueno-D01-D19.md`, ni `assets/brand/`.
- No agregues dependencias innecesarias — `package.json` liviano por app.
- No conectes el `AuditService` a ningún módulo automáticamente sin decirlo explícitamente en las notas.
- No generes ninguna autorización "de sistema" o "automática" para destrabar un flujo bloqueado por falta de mecanismo de autorización (ver restricción D-06 arriba).

## Entregable esperado y criterios de aceptación

Al terminar, debe ser posible, y vos mismo debés dejar documentados los comandos exactos para reproducir cada paso:

1. `npm install` en la raíz.
2. Levantar Postgres (`docker compose up -d db` o equivalente).
3. `npm run db:migrate` y `npm run db:seed` — la base queda poblada con los datos de seed descritos arriba, incluyendo la segunda empresa de prueba.
4. Levantar `apps/api` y loguear con el usuario dueño de seed contra un endpoint real.
5. **Con el usuario vendedor de seed (sin permiso `caja.gastos`), intentar un endpoint que requiera ese permiso y confirmar que la respuesta es un rechazo (403 o equivalente), no un éxito silencioso.**
6. **Con el usuario dueño de la primera empresa, intentar leer un producto de la segunda empresa de prueba directamente por su id vía la API (no por la UI) y confirmar que la respuesta es un rechazo o un "no encontrado", nunca el dato de la otra empresa.**
7. **Intentar un `DELETE` sobre una venta confirmada y confirmar que la ruta no existe o la operación es rechazada.**
8. Levantar `apps/pos-admin`, loguearse, y ver el listado de productos traído desde la API real (sin estilos, pero funcional).
9. Levantar `apps/tienda-online` y ver el catálogo público sin login.
10. Correr `npm run lint` sin errores en los tres proyectos.

Los pasos 5, 6 y 7 son las pruebas mínimas de arquitectura (autorización negativa, aislamiento entre empresas, inmutabilidad de ventas) que el scaffolding debe demostrar, no solo declarar. Documentá los comandos/requests exactos usados para cada uno en el README, de forma que sean reproducibles por otra persona sin adivinar.

## Informe final que debés producir

Al terminar, entregá (en tu respuesta final, y también volcado a `docs/scaffolding-notas.md`):

1. **Archivos y directorios creados**, listados explícitamente (no un resumen genérico).
2. **Comandos ejecutados** durante el desarrollo del scaffolding (instalación, generación de Prisma, build, lint) y su resultado real (éxito/error), no una suposición de que funcionaron.
3. **Resultado real de los 10 pasos** de la sección anterior — cuáles pudiste verificar ejecutándolos vos mismo y cuáles quedan para que la persona que continúe los verifique (si no tenés forma de levantar Postgres en tu entorno de ejecución, decilo explícitamente en vez de asumir que el paso funciona).
4. **Decisiones técnicas tomadas** dentro de los grados de libertad que te dejó este prompt (npm vs. pnpm, mecanismo elegido para aislamiento multiempresa, etc.).
5. **Lista completa de TODOs** con su ID de decisión pendiente (D-XX), ubicación en el código (archivo y símbolo), y una frase de qué falta decidir — para que sea auditable contra la sección 10 del SDD.
6. **Nota explícita sobre la sección 7.3 del SDD**, recomendando que se actualice para reflejar que el stack ya fue decidido (ver "Resolución explícita de la discrepancia de stack" arriba) — vos no editás el SDD, solo dejás la recomendación por escrito.
7. **Cualquier punto donde no pudiste evitar tomar una decisión de negocio no autorizada** por falta de alternativa técnica razonable — reportalo explícitamente en vez de ocultarlo dentro del código.

No declares en tu informe que algo "funciona" si no lo ejecutaste vos mismo y viste el resultado. Distinguí explícitamente "compila", "corre" y "se comportó como se esperaba" — no son lo mismo.
