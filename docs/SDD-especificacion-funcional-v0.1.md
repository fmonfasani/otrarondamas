# Especificación funcional SDD — MVP piloto

Borrador funcional v0.1
Pendiente de validación del dueño

Fecha objetivo de producción: 30/11/2026 · URL prevista: otrarondamas.wapsell.com

Este documento consolida el descubrimiento realizado hasta ahora y lo transforma en una base estructurada para el diseño y desarrollo del MVP.

Importante: los requisitos confirmados se distinguen de las propuestas y decisiones pendientes. No se considera aprobado el alcance final hasta que el dueño valide la especificación.

## 1. Objetivo del producto

Desarrollar una aplicación web SaaS para gestionar la operación comercial de Otra Roonda Más, inicialmente con una empresa, una caja y un depósito, y con capacidad de evolucionar a múltiples usuarios, sucursales y empresas.

El sistema debe centralizar:

- Ventas presenciales, mayoristas y online.
- Pedidos provenientes de WhatsApp y redes sociales.
- Pagos, caja y arqueos por turno.
- Clientes y cuentas corrientes.
- Productos, inventario, lotes y vencimientos.
- Compras, proveedores y pagos.
- Preparación, entrega y seguimiento de pedidos.
- Reportes operativos y auditoría.

### Objetivo operativo

Reemplazar progresivamente los cuadernos y registros manuales por un sistema que permita controlar ventas, dinero, stock y obligaciones comerciales, manteniendo trazabilidad y permisos.

### Criterios de éxito del piloto

- Registrar ventas reales sin pérdida ni duplicación.
- Actualizar correctamente el stock.
- Conciliar caja y pagos.
- Controlar las cuentas corrientes de clientes y proveedores.
- Gestionar pedidos y entregas.
- Restringir operaciones según permisos.
- Mantener trazabilidad de acciones y autorizaciones.
- Validar la operación con el dueño antes de abandonar los cuadernos.

## 2. Alcance funcional del MVP

### 2.1 Incluido

| Módulo | Alcance |
|---|---|
| Plataforma SaaS | Empresas, usuarios, aislamiento de datos y administración |
| Usuarios y roles | Cuentas individuales y permisos configurables |
| Catálogo | Productos, categorías, códigos, precios y presentaciones |
| Ventas | POS presencial, mayorista y venta online |
| Pedidos | Pedidos web, WhatsApp y redes sociales |
| Pagos | Efectivo, transferencias, QR y Mercado Pago |
| Caja | Fondo fijo, arqueos, cierres y movimientos |
| Clientes | Datos, cuenta corriente, crédito y cobros |
| Inventario | Stock, movimientos, ajustes, lotes y vencimientos |
| Compras | Órdenes, recepción, facturas y costos |
| Proveedores | Saldos, pagos parciales y devoluciones |
| Entregas | Preparación, asignación, entrega y cobro |
| Notificaciones | WhatsApp/email, eventos pendientes de especificación |
| Reportes | Ventas, caja, stock, deudas y pedidos |
| Auditoría | Registro de operaciones y autorizaciones |

### 2.2 Fuera del alcance inicial

Salvo que el dueño lo incorpore expresamente:

- Contabilidad completa y asientos contables automáticos.
- Facturación fiscal electrónica y cumplimiento fiscal automatizado.
- Optimización automática de rutas.
- Aplicación móvil nativa.
- Operación transaccional offline.
- Automatización avanzada de WhatsApp y redes sociales.
- Integraciones contables externas.
- Arquitectura de microservicios.
- Alta y facturación SaaS completamente autoservicio.

## 3. Actores y permisos

### 3.1 Actores iniciales

| Actor | Responsabilidad |
|---|---|
| Dueño | Administración, configuración, autorizaciones y validación |
| Vendedor | Ventas, pedidos, preparación, entregas y cobros, según permisos |
| Administrador SaaS | Administración técnica de empresas y plataforma, con acceso controlado |

El dueño tendrá acceso completo a la operación de su empresa desde dispositivos autorizados.

Los vendedores tendrán cuentas individuales. No se presupone que todos tengan idénticos permisos.

### 3.2 Modelo de autorización

La autorización debe comprobar:

- Identidad del usuario.
- Empresa y ámbito de acceso.
- Permiso específico para la acción.
- Autorización del dueño cuando corresponda.
- Registro auditable de la decisión.

Las operaciones restringidas confirmadas incluyen:

- Descuentos especiales.
- Anulaciones.
- Devoluciones.
- Pagos parciales de cuenta corriente.
- Gastos y retiros de caja.
- Ajustes de inventario.
- Excepciones por stock insuficiente.
- Cambios de precios.

Regla: un vendedor solo ejecuta estas operaciones si posee el permiso correspondiente y cuenta con la autorización expresa del dueño.

El mecanismo técnico de autorización —PIN, aprobación desde la cuenta del dueño o ambos— debe definirse antes de implementar el flujo.

## 4. Requisitos funcionales

### RF-01. Empresas y aislamiento SaaS

- El sistema debe soportar múltiples empresas.
- Los datos comerciales de una empresa no deben ser accesibles desde otra sin autorización explícita.
- La configuración comercial, usuarios, precios, clientes y stock debe pertenecer a la empresa correspondiente.
- El acceso administrativo de la plataforma debe estar separado del acceso comercial del dueño.

Aceptación: un usuario de una empresa no puede consultar ni modificar registros de otra empresa mediante la interfaz ni mediante solicitudes directas.

### RF-02. Usuarios, roles y turnos

- Cada vendedor tendrá una cuenta individual.
- Los permisos serán configurables por el dueño.
- El dueño podrá asignar permisos para ventas, caja, inventario, compras, clientes y entregas.
- Se registrará quién opera cada turno.
- El dueño no necesita habilitar manualmente cada turno.
- Las acciones sensibles deben requerir autorización según las reglas configuradas.

Pendiente: definir si el turno se inicia con autenticación, apertura de caja o ambos.

### RF-03. Catálogo de productos

Categorías iniciales:

- Bebidas.
- Snacks.
- Almacén.
- Kiosco.

El producto podrá contemplar:

- Nombre.
- Código interno.
- Código de barras.
- Marca.
- Categoría.
- Unidad base.
- Presentaciones.
- Conversión entre presentaciones.
- Costo.
- Precio.
- Estado activo/inactivo.
- Lotes y vencimientos cuando corresponda.

El sistema debe conservar los datos históricos de las ventas aunque cambien los precios o se desactive un producto.

Pendiente: catálogo concreto, presentaciones y equivalencias reales.

### RF-04. Precios y descuentos

- El sistema debe permitir manejar precios minoristas y mayoristas diferenciados.
- La tienda online utilizará un precio base único, con posibilidad de aplicar descuentos.
- El POS debe mostrar el precio y descuento aplicable.
- Los descuentos automáticos configurados no deben requerir autorización individual por venta.
- Los descuentos especiales estarán sujetos a permisos y autorización.

Pendiente: criterio de precio mayorista, descuentos automáticos y reglas por cantidad o cliente.

### RF-05. Ventas presenciales

- Permitir ventas sin identificar al cliente.
- Permitir buscar productos por código, nombre o código de barras.
- Permitir registrar cantidades y presentaciones.
- Calcular el total de la venta.
- Permitir pagos mixtos.
- Registrar el usuario responsable.
- Actualizar caja, pagos y stock según el estado de la operación.
- Emitir comprobante interno e imprimir ticket.

Una venta confirmada no debe eliminarse. Las anulaciones y devoluciones deben generar operaciones vinculadas y trazables.

### RF-06. Tienda online

- La tienda estará disponible en otrarondamas.wapsell.com.
- Los clientes podrán comprar sin registrarse.
- Se mostrará el catálogo público.
- Se permitirá pagar dentro de la web.
- Se integrará Mercado Pago.
- Se actualizará la disponibilidad según el stock del sistema.
- Se registrará el pedido y su estado.
- El sistema deberá contemplar descuentos online.

Pendiente: modalidad concreta de Mercado Pago, precios online finales y política de reserva de stock.

### RF-07. Pedidos de WhatsApp y redes sociales

- El dueño y los vendedores autorizados podrán cargar pedidos manualmente.
- El pedido debe identificar su canal de origen.
- Debe poder seguirse desde su recepción hasta su entrega o cancelación.
- Los pedidos deben vincularse con cliente, productos, pagos y entrega cuando corresponda.

La integración automática con WhatsApp/redes no está confirmada para el MVP; el flujo inicial será manual.

### RF-08. Pagos

Medios previstos:

- Efectivo.
- Transferencia.
- QR.
- Mercado Pago.

El sistema debe contemplar:

- Pagos mixtos.
- Pagos completos y parciales.
- Vinculación de pagos con ventas o deudas.
- Registro de reembolsos.
- Registro de comisiones.
- Conciliación de cobros.

Pendiente: qué medios presenciales tendrán integración automática y cuáles serán registrados manualmente.

### RF-09. Caja y arqueos

- Una caja inicial.
- Fondo fijo de cambio: $25.000 ARS.
- Registro de apertura, movimientos, arqueos por turno y cierre diario.
- Arqueo confirmado por vendedor saliente y entrante.
- Registro de diferencias.
- Gastos y retiros solo por el dueño o usuarios autorizados.
- Diferencias superiores al umbral configurado requieren autorización del dueño.

El umbral de referencia es $5.000, pero debe confirmarse si la condición exacta será estrictamente "mayor que $5.000".

El sistema debe distinguir:

- Fondo fijo.
- Cobros de ventas.
- Cobros de deudas.
- Gastos y retiros.
- Efectivo esperado.
- Efectivo contado.
- Diferencia de caja.

### RF-10. Clientes y cuenta corriente

- Registrar nombre, email, teléfono y dirección.
- Permitir ventas a crédito.
- Configurar un límite de crédito por cliente.
- Bloquear nuevas ventas a crédito cuando se supere el límite.
- Permitir excepciones autorizadas por el dueño.
- Admitir pagos parciales.
- Permitir al dueño elegir a qué deuda aplicar cada cobro.
- Registrar plazo máximo de pago de 30 días.
- Emitir recibos internos y estados de cuenta.

Pendiente: mínimo de pago, fechas de vencimiento y regla de cálculo del saldo disponible.

### RF-11. Inventario

- Un depósito inicial.
- Carga inicial basada en inventario físico.
- Registro de entradas, salidas y ajustes.
- Actualización de stock por ventas y recepciones.
- Registro de lotes y vencimientos para productos que correspondan.
- Alertas de vencimiento con 7 días de anticipación, como propuesta inicial.
- Alertas de bajo stock.
- Bloqueo propuesto para productos vencidos.
- Bloqueo por stock insuficiente, con excepciones autorizadas.

No se deben borrar movimientos confirmados. Las correcciones deben realizarse mediante movimientos compensatorios con motivo y trazabilidad.

### RF-12. Compras y proveedores

- Registrar proveedores y sus datos.
- Crear órdenes de compra.
- Registrar compras.
- Recibir mercadería total o parcialmente.
- Registrar diferencias de recepción.
- Adjuntar facturas y documentación.
- Registrar pagos parciales, vencimientos y saldos.
- Mantener historial de costos por producto y compra.
- Registrar devoluciones a proveedores.

El ingreso físico de mercadería debe actualizar el stock cuando la recepción sea confirmada, sin depender de que el proveedor ya haya sido pagado.

### RF-13. Entregas

- Gestionar pedidos con entrega a domicilio.
- Asignar manualmente pedidos a vendedores/repartidores.
- Registrar quién prepara y quién entrega.
- Registrar el resultado de la entrega.
- Permitir cobro al entregar según los medios habilitados.
- Gestionar entregas fallidas, devoluciones y reprogramaciones.

Pendiente: zonas, tarifas, evidencia de entrega, responsables y tratamiento de entregas fallidas.

### RF-14. Notificaciones

Se incluirán notificaciones automáticas por WhatsApp/email.

Pendiente: definir eventos, canales y proveedor de envío. Los eventos candidatos son:

- Pedido recibido.
- Pago aprobado.
- Pedido preparado.
- Pedido despachado.
- Entrega completada.
- Recordatorio de deuda.
- Avisos de vencimiento.

### RF-15. Reportes

El panel del dueño debe contemplar:

- Ventas.
- Ganancias estimadas.
- Caja.
- Stock.
- Productos próximos a vencer.
- Deudas de clientes.
- Deudas a proveedores.
- Pedidos pendientes.

Se prevé exportación a Excel/CSV e impresión de tickets.

Las ganancias solo podrán calcularse de forma confiable cuando el método de costos esté definido y los costos estén correctamente registrados.

### RF-16. Auditoría

Registrar como mínimo:

- Usuario.
- Empresa.
- Fecha y hora.
- Acción.
- Registro afectado.
- Valores anteriores y posteriores cuando corresponda.
- Motivo.
- Autorización relacionada.

La auditoría debe cubrir ventas, modificaciones, cobros, anulaciones, devoluciones, ajustes, autorizaciones y operaciones de caja.

## 5. Reglas de negocio e invariantes

Estas reglas deben protegerse desde la lógica del servidor y la base de datos, no únicamente desde la interfaz.

| ID | Regla |
|---|---|
| INV-01 | Los datos de una empresa no son accesibles por otra empresa sin autorización explícita. |
| INV-02 | Una venta confirmada no se elimina físicamente. |
| INV-03 | Todo movimiento de stock confirmado conserva trazabilidad. |
| INV-04 | El total de pagos aplicados no puede exceder el importe correspondiente sin una regla explícita de saldo a favor. |
| INV-05 | Los pagos mixtos deben cuadrar con el importe de la operación. |
| INV-06 | El stock no puede quedar negativo, salvo excepción autorizada y registrada. |
| INV-07 | Los productos vencidos no pueden venderse si se confirma la regla de bloqueo. |
| INV-08 | Un cierre con diferencia superior al umbral requiere autorización. |
| INV-09 | Una operación restringida requiere permiso y autorización expresa. |
| INV-10 | La recepción de mercadería debe vincularse con su compra/documentación cuando corresponda. |
| INV-11 | Las operaciones de devolución deben referenciar la venta original cuando exista. |
| INV-12 | Los cambios de precio no modifican retrospectivamente el precio de ventas anteriores. |
| INV-13 | Las notificaciones y respuestas de la pasarela no deben crear ventas o pagos duplicados. |
| INV-14 | Las modificaciones relevantes deben conservar usuario, fecha y motivo. |

## 6. Estados principales

### 6.1 Pedido

RECIBIDO → CONFIRMADO → EN_PREPARACIÓN → LISTO → ASIGNADO → EN_CAMINO → ENTREGADO

Estados alternativos por definir:

- Parcialmente entregado.
- Entrega fallida.
- Cancelado.

### 6.2 Pago

PENDIENTE → EN_PROCESO → APROBADO

Estados alternativos:

- Rechazado.
- Cancelado.
- Reembolsado parcial.
- Reembolsado total.

La confirmación del pago online debe basarse en una verificación confiable de Mercado Pago, no solamente en el retorno del navegador del cliente.

### 6.3 Compra

BORRADOR → EMITIDA → RECEPCIÓN_PARCIAL → RECIBIDA

Con estados alternativos para cancelación y diferencias pendientes de resolución.

### 6.4 Caja

CERRADA → ABIERTA → EN_ARQUEO → CERRADA

El cambio de vendedor debe generar un registro de entrega/recepción de caja y su arqueo asociado.

## 7. Arquitectura de solución propuesta

Esta sección se actualizó tras inspeccionar el repositorio real de Wapsell (`D:\Software Development\Porfolio\wapsell`, remote `github.com/fmonfasani/wapsell.git`) el 19/09/2026. Lo que sigue distingue hechos verificados del repo de decisiones de diseño para Otra Roonda Más.

#### 7.1 Evidencia verificada de Wapsell (hechos, no propuesta)

| Aspecto | Estado real |
|---|---|
| Naturaleza del producto | Wapsell **no** es una plataforma multi-producto ni un hub de SaaS genérico. Es un producto específico: agente de ventas con IA para inmobiliarias (RAG sobre catálogos de propiedades vía Tokko/MercadoLibre). |
| Multi-tenant existente | Existe un concepto de `tenant_catalogs` / `prospect_id` en `services/api/main.py`, pero es multi-tenant **de ese dominio** (catálogos de propiedades por prospecto), no un framework de aislamiento de empresas reutilizable para un ERP comercial. |
| Stack | Frontend Next.js 14 + TypeScript + Tailwind; Backend FastAPI (Python); persistencia **SQLite** (no Postgres) en un volumen Docker dedicado. |
| Autenticación | Cookies de sesión propias, hashing **SHA256 sin salt** (marcado como TODO en el propio repo, no apto para copiar como referencia de seguridad). |
| Infraestructura | VPS Hetzner (`89.167.96.239`), **compartido** con otros servicios ajenos a Wapsell (Coolify, Pipaas/Waseller, según comentario en `docker-compose.yml`). No es un servidor dedicado. |
| nginx | Corre en el **host** (no en contenedor) y hace reverse proxy por `server_name` hacia contenedores Docker bindeados solo a `127.0.0.1:<puerto>`. Ya existe el patrón de subdominio (`api.wapsell.com → 127.0.0.1:8500`). |
| Despliegue | Push a `main` → GitHub Actions → SSH → `git pull` + `docker compose up -d` en `/opt/wapsell`. Imágenes con límites de recursos explícitos (API: 0.5 CPU/256M, App: 1 CPU/512M), señal de que el VPS no es grande. |
| Base de datos | SQLite, no hay motor de base de datos compartido (ni Postgres ni MySQL) al que Otra Roonda Más pudiera conectarse aunque quisiera. |

#### 7.2 Decisión de arquitectura para Otra Roonda Más

Con esta evidencia, se **confirma** la recomendación de mantener Otra Roonda Más como aplicación independiente, con las siguientes precisiones concretas (ya no genéricas):

| Componente | Responsabilidad | Decisión |
|---|---|---|
| Aplicación web | POS, tienda online, administración y operación | Repo propio, separado de `wapsell` (no monorepo, no subcarpeta) |
| Backend/API | Reglas de negocio, permisos, validaciones y orquestación | Stack propio (a definir en fase de diseño técnico); no depende del FastAPI de Wapsell |
| Base de datos | Persistencia transaccional y aislamiento por empresa | **Postgres propio**, dedicado a Otra Roonda Más — no se reutiliza el SQLite de Wapsell, que además no tiene motor de red expuesto |
| Autenticación y permisos | Identidad, roles, autorización del dueño | **100% propia**, construida con buenas prácticas desde el inicio (bcrypt/argon2). No replicar el patrón SHA256 de Wapsell, que el propio repo marca como deuda técnica |
| Despliegue | Contenedor Docker propio en el mismo VPS | Sigue el patrón ya probado de `docker-compose.yml` de Wapsell: contenedores bindeados a `127.0.0.1:<puerto>`, healthcheck propio, límites de CPU/memoria explícitos |
| Dominio / nginx | `otrarondamas.wapsell.com` | Se agrega un **vhost nuevo** en el nginx del host (mismo patrón que `api.wapsell.com`), sin tocar la configuración de `wapsell.com` |
| Integraciones con Wapsell | Ninguna prevista | No hay nada reutilizable a nivel de código: la lógica de RAG inmobiliario y el multi-tenant de catálogos de Wapsell no aplican a un ERP comercial |
| Infraestructura | Hosting, backups, monitoreo, recuperación | Comparte el VPS Hetzner físico, pero **capacidad debe verificarse antes de sumar carga**: el servidor ya es compartido con Coolify/Pipaas y los contenedores de Wapsell tienen límites de recursos ajustados (256M–512M), lo que sugiere que el VPS no tiene margen amplio |

Se mantiene el criterio de **no construir microservicios** para el piloto, y de **diseñar el aislamiento por empresa desde el día uno** en el modelo de datos, aunque el piloto opere con una sola empresa (Otra Roonda Más).

#### 7.3 Pendiente derivado de esta inspección (nuevo, no estaba en la v0.1 original)

- **D-19 (nuevo).** Verificar capacidad disponible real del VPS Hetzner (`89.167.96.239`) — CPU, RAM, disco — antes de decidir si Otra Roonda Más se despliega ahí o si conviene un VPS/servicio separado. El servidor ya aloja Wapsell, Coolify y Pipaas/Waseller con límites de recursos ajustados por contenedor.
- El stack final de Otra Roonda Más (frontend/backend/DB concretos) sigue **sin decidir**; esta sección solo fija la separación arquitectónica, no la tecnología. Ver sección 11, fase 3 (Diseño).

## 8. Backlog priorizado

Los siguientes elementos son épicas y entregables funcionales. La prioridad es una propuesta para organizar el trabajo, no una confirmación de esfuerzo o duración.

**Backlog del MVP — Propuesta inicial.** Marcá los elementos a medida que se validen o completen. Esta lista es de planificación, no evidencia de implementación. (0 / 20 marcados)

| ID | Título | Prioridad | Descripción |
|---|---|---|---|
| B01 | Inspección y definición técnica | P0 | Revisar repositorio, infraestructura, dependencias, stack y restricciones. |
| B02 | Base SaaS y empresas | P0 | Aislamiento multiempresa, configuración inicial y administración separada. |
| B03 | Autenticación y permisos | P0 | Usuarios individuales, roles configurables y autorizaciones. |
| B04 | Catálogo y carga inicial | P0 | Productos, categorías, códigos, presentaciones, precios y carga inicial. |
| B05 | Inventario inicial | P0 | Conteo físico, carga, aprobación y consulta de stock. |
| B06 | POS presencial | P0 | Venta, cálculo, cobro, comprobante y actualización de stock. |
| B07 | Caja y arqueos | P0 | Fondo fijo, apertura, turnos, arqueos, gastos, diferencias y cierre diario. |
| B08 | Pagos | P0 | Pagos mixtos, registros, conciliación y trazabilidad. |
| B09 | Compras y recepción | P0 | Órdenes, compras, recepción parcial, diferencias y entrada de stock. |
| B10 | Clientes y cuenta corriente | P0 | Límites, ventas a crédito, pagos parciales y aplicación de cobros. |
| B11 | Mercado Pago online | P1 | Checkout, confirmación verificada, comisiones y reembolsos según alcance. |
| B12 | Tienda online | P1 | Catálogo, carrito, compra sin registro y creación de pedidos. |
| B13 | Pedidos WhatsApp/redes | P1 | Carga manual, canal de origen y seguimiento. |
| B14 | Preparación y entregas | P1 | Asignación, estados, cobro y gestión de fallas. |
| B15 | Lotes y vencimientos | P1 | Registro por lote, bloqueo y alertas. |
| B16 | Reportes y panel | P1 | Ventas, caja, stock, cuentas, proveedores y pedidos. |
| B17 | Notificaciones | P1 | Eventos y envíos por WhatsApp/email. |
| B18 | Auditoría y reversas | P1 | Historial, anulaciones, devoluciones y autorizaciones. |
| B19 | Tickets y exportación | P1 | Impresión, comprobantes internos y exportaciones. |
| B20 | Pruebas y salida a producción | P0 | Pruebas integrales, seguridad, backups, recuperación, capacitación y aprobación. |

## 9. Criterios de aceptación del piloto

El piloto no debe considerarse listo para producción hasta verificar:

- El dueño y los vendedores pueden iniciar sesión con sus permisos.
- Se puede registrar una venta presencial y emitir/imprimir comprobante.
- Los pagos mixtos cuadran con el total de la venta.
- El stock se actualiza correctamente por ventas y recepciones.
- Las operaciones sensibles exigen autorización y dejan evidencia.
- La caja permite apertura, arqueo por turno y cierre diario.
- El sistema registra diferencias de caja y aplica el umbral configurado.
- Se puede gestionar una cuenta corriente y registrar cobros parciales.
- Se puede registrar una compra, recepción y pago a proveedor.
- La tienda online procesa pedidos y verifica los pagos.
- Los pedidos de entrega pueden seguirse hasta su resultado.
- Los productos vencidos se gestionan según la regla aprobada.
- Los reportes concilian con los registros transaccionales.
- Se verificó el aislamiento entre empresas.
- Se probó la restauración de backups.
- El dueño aprobó el funcionamiento y autorizó la salida a producción.

## 10. Decisiones pendientes que bloquean el cierre definitivo

Estas decisiones deben resolverse antes de congelar el alcance funcional:

| ID | Decisión pendiente |
|---|---|
| D-01 | Regla de precios mayoristas y asignación de clientes/listas |
| D-02 | Porcentaje y condiciones de descuentos automáticos |
| D-03 | Modalidad de integración de Mercado Pago |
| D-04 | Alcance de integración de cobros presenciales |
| D-05 | Confirmación del umbral de caja: condición estricta y manejo de diferencias menores |
| D-06 | Mecanismo de autorización del dueño |
| D-07 | Método de carga del catálogo y responsable operativo |
| D-08 | Presentaciones, unidades y conversiones reales |
| D-09 | Reglas de lotes, vencimientos y bloqueo de productos |
| D-10 | Responsable y reglas de aprobación de diferencias de recepción |
| D-11 | Zonas y costo de entrega |
| D-12 | Preparación, asignación y contingencias de entrega |
| D-13 | Canales, eventos y proveedor de notificaciones |
| D-14 | Modelo y conexión de impresora; lector de códigos |
| D-15 | Presupuesto total de infraestructura y servicios externos |
| D-16 | Política de pagos parciales, vencimientos y aplicación de cobros |
| D-17 | Política de cambios, devoluciones y reembolsos |
| D-18 | Método de costos para calcular ganancias estimadas |
| D-19 | Capacidad real disponible en el VPS Hetzner compartido (`89.167.96.239`) antes de sumar la carga del ERP — *agregado tras inspección del repo de Wapsell (19/09/2026), ver sección 7.3* |

## 11. Plan de implementación

La fecha objetivo es el 30/11/2026. El calendario detallado debe ajustarse luego de inspeccionar el repositorio, confirmar el equipo disponible y estimar cada épica.

| Fase | Resultado esperado |
|---|---|
| 1. Inspección | Estado real del repositorio, stack e infraestructura |
| 2. Cierre SDD | Requisitos, reglas y pendientes validados por el dueño |
| 3. Diseño | Arquitectura, modelo de datos, contratos y permisos |
| 4. Núcleo | Empresas, usuarios, catálogo, inventario y POS |
| 5. Operación | Caja, compras, clientes y cuenta corriente |
| 6. Canales | Tienda online, Mercado Pago, pedidos y entregas |
| 7. Control | Auditoría, reportes, notificaciones y endurecimiento |
| 8. QAS | Pruebas funcionales y operativas con datos controlados |
| 9. Preparación | Carga inicial, inventario físico y capacitación |
| 10. Producción | Despliegue controlado y aprobación del dueño |

Se mantendrán los cuadernos en paralelo hasta que el dueño autorice dejar de utilizarlos. Antes de esa decisión debe existir un procedimiento para comparar y resolver diferencias entre registros.

## 12. Evidencia y estado actual

| Elemento | Estado |
|---|---|
| Descubrimiento funcional | Consolidado a partir de las respuestas del usuario |
| Especificación funcional | Elaborada como borrador v0.1 |
| Backlog | Propuesta inicial |
| Arquitectura técnica | **Parcialmente determinada por inspección** — se inspeccionó el repo de Wapsell (19/09/2026); el stack propio de Otra Roonda Más aún no se decidió (ver sección 7) |
| Repositorio actual | Wapsell inspeccionado (19/09/2026); repositorio propio de Otra Roonda Más **no existe todavía** (el directorio de trabajo no es un repositorio git) |
| Modelo de datos | Pendiente de diseño |
| Implementación | No verificada |
| Pruebas | No ejecutadas |
| Infraestructura | Parcialmente definida — patrón de despliegue confirmado (Docker + nginx host + VPS compartido); capacidad real pendiente de verificar (D-19) |
| Aprobación del dueño | Pendiente |

Conclusión: el descubrimiento permite iniciar el diseño técnico, pero no equivale a una especificación aprobada ni demuestra que el sistema esté implementado. La inspección del repositorio de Wapsell confirmó la viabilidad de la arquitectura de módulo independiente (sección 7), pero quedan pendientes el diseño técnico propio de Otra Roonda Más y el resto de las decisiones bloqueantes (sección 10). El siguiente paso es validar este SDD, cerrar las decisiones bloqueantes y luego iniciar el diseño técnico y los prompts de implementación.
