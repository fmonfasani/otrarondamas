# WAPSELL — Relevamiento de Decisiones del Owner Workshop

**Estado:** WORKSHOP CONSOLIDADO — 001–490  
**Fecha de cierre del bloque:** 2026-10-03  
**Fuente:** respuestas del Owner en el relevamiento conversacional.  
**Naturaleza:** insumo de decisión/relevamiento; NO constituye por sí mismo propagación al Decision Register, TO-BE, Contracts, Invariants, Architecture, Plan, Tasks o código.

## Criterio de lectura

Cada entrada conserva el ID del relevamiento y la decisión elegida. Cuando la respuesta fue narrativa, se conserva su sentido en forma resumida. Las decisiones con posibles tensiones con otras respuestas deben reconciliarse antes de convertirse en contratos o invariantes.

## 001–100

001 — A — Membership: ACTIVA ↔ INACTIVA; reactivación permitida.  
002 — B — Roles oficiales iniciales: Owner, Asistente de local, Cliente mayorista, Proveedor, Repartidor, Cliente minorista, Administrador SaaS.  
003 — A — Permisos como capacidades atómicas explícitas; los roles agrupan capacidades.  
004 — A — Navegación principal por Spaces: Negocios, Mayoristas, Contactos, Grupos; Repartidores se incorpora posteriormente como Space oficial.  
005 — A — Agenda privada de contactos; cualquier User puede agregar cualquier otro User.  
006 — B — Contactar abre conversación existente o crea una nueva automáticamente.  
007 — B — Conversaciones normales 1:1; Groups admiten múltiples participantes.  
008 — A — Cualquier User puede crear Group.  
009 — A — Contactos de agenda privada; no son automáticamente mutuos.  
010 — A — Agregar Business crea automáticamente relación Customer.  
011 — A — Business puede iniciar conversación.  
012 — A — User puede agregar Business.  
013 — A — User puede pertenecer a múltiples Groups sin límite funcional.  
014 — A — Creador de Group es administrador.  
015 — C — Un Group puede contener múltiples conversaciones; solo admin crea conversaciones.  
016 — B — Conversación puede mezclar Users, Businesses y Mayoristas; Business puede incorporar vendedores, repartidor y Owner/Admin.  
017 — A — Si existe conversación, siempre se abre la existente.  
018 — A — Business↔Business libre, condicionado al alcance/suscripción.  
019 — A — User puede bloquear unilateralmente a otro User.  
020 — A — User puede bloquear Business.  
021 — B — Conversación de Business visible para miembros con permiso de Messaging.  
022 — A — Cualquier miembro que vea y tenga capacidad puede responder.  
023 — A — Conversación puede asignarse.  
024 — C — Repartidor entra en conversación existente al asignarse una entrega.  
025 — A — Conversación puede disparar acciones ERP.  
026 — A — Pedido puede crearse desde chat; Owner puede incorporar/buscar repartidor y ver su progreso en el chat.  
027 — A — Información ERP puede aparecer en chat.  
028 — A — Acciones ERP relevantes aparecen como eventos/items en chat.  
029 — A — Participante puede ejecutar acción si dispone de la capacidad específica.  
030 — A — Cliente puede ejecutar acciones sobre su pedido cuando el estado lo permita.  
031 — A — Repartidores es Space oficial.  
032 — B — Wapsell propone repartidores disponibles y Business selecciona.  
033 — A — Repartidor debe aceptar.  
034 — A — Cliente ve progreso de entrega.  
035 — A — Repartidor entra en conversación existente.  
036 — B — Conversación pertenece a participantes, no exclusivamente a Business.  
037 — A — Vendedor puede entrar si tiene permiso.  
038 — C — Vendedor puede salir y conversación continúa para Business.  
039 — A — Conversación puede reasignarse.  
040 — D — Al salir vendedor del Business, conversaciones pasan a Owner.  
041 — B — Descubrimiento de User por teléfono/email.  
042 — A — Username global único.  
043 — B — Perfil público básico con campos configurables.  
044 — D — Business descubrible por búsqueda, enlace directo y QR.  
045 — A — Businesses públicos/descubribles.  
046 — A — User no puede ocultarse de búsqueda; encontrable por teléfono/email.  
047 — A — Agregar User por teléfono/email lo agrega directamente como Contact.  
048 — A — Business puede agregar User como Customer.  
049 — A — User puede abandonar Business como Customer.  
050 — A — Business puede bloquear User.  
051 — A — Un username global por User.  
052 — A — Username puede cambiar libremente.  
053 — B — Búsqueda de perfil oculta datos privados.  
054 — A — User puede tener identidades/relaciones distintas por Business/Space.  
055 — A — User puede pertenecer a múltiples Businesses sin límite funcional.  
056 — C — Ser Owner de múltiples Businesses depende de suscripción Wapsell.  
057 — A — Business puede tener múltiples Owners.  
058 — C — Transferencia de ownership requiere SaaS Admin.  
059 — B — Múltiples vendedores en conversación; uno queda como responsable.  
060 — B — Historial completo visible a miembros Business con permiso.  
061 — D — Mensajes: texto, imágenes, archivos, audio, video, ubicación, contactos, productos/pedidos.  
062 — A — Mensajes interactivos con acciones.  
063 — A — Mensajes automáticos del sistema.  
064 — A — Mensajes de sistema con tipo propio.  
065 — B — Mensaje editable solo antes de respuesta del otro lado; después queda sin edición y se registra.  
066 — C — Mensaje puede eliminarse pero queda indicador.  
067 — A — Reply/quote.  
068 — A — Estado de lectura.  
069 — A — Indicador de escritura.  
070 — A — Silenciar conversación individualmente.  
071 — A — Productos pueden buscarse/agregarse al carrito desde Messaging; catálogo disponible dentro de Messaging.  
072 — A — Catálogo integrado en Messaging.  
073 — A — Cliente puede modificar cantidades.  
074 — A — Cliente puede eliminar productos.  
075 — C — Seller puede modificar pedido con confirmación del cliente.  
076 — OPEN en ese momento — confirmación de Order; posteriormente 087 establece cliente como confirmador.  
077 — A — Stock se descuenta al crear Order; posteriormente se introduce reserva en confirmación, requiere reconciliación.  
078 — B — Order no existe sin pago; debe reconciliarse con Sale/AR.  
079 — D — Order→Sale depende del Business; posteriormente 099 define automatización al entregar.  
080 — A — Conversación muestra precio actualizado del producto.  
081 — B — Cart pertenece al User y persiste entre conversaciones.  
082 — A — Cart puede utilizarse fuera de Messaging.  
083 — A — Cliente puede comprar sin conversar.  
084 — A — Cliente puede iniciar conversación desde producto.  
085 — A — Seller puede enviar productos en chat.  
086 — A — Seller puede crear carrito para cliente.  
087 — A — Cliente confirma Order.  
088 — A — Business configura métodos de pago.  
089 — B+C — Pago puede sacar al usuario a Checkout/payment link.  
090 — C — Estado de pago aparece en conversación solo cuando corresponde/está confirmado.  
091 — C — Cliente puede cancelar Order antes de entrega.  
092 — B — Seller cancela con confirmación del cliente.  
093 — A — Cart y Order mantienen mismo estado hasta confirmación.  
094 — A — Order no contiene productos sin stock.  
095 — A — Precio queda congelado al entrar en proceso de venta; Seller no puede modificarlo.  
096 — B — Fallo de pago cancela automáticamente Order.  
097 — B — Asignación/aceptación y luego viaje/en tránsito son estados separados.  
098 — B — Cliente confirma entrega.  
099 — A — Order entregado se convierte automáticamente en Sale.  
100 — A — Conversación continúa después de compra.

## 101–200

101 — C — Cualquier miembro con permiso de catálogo puede crear Product.  
102 — C — Cualquier miembro con permiso de catálogo puede editar Product.  
103 — A — Product puede ocultarse sin eliminarse.  
104 — A — Product global compartido entre Businesses.  
105 — C — Precio global + configuración/precio específico por Business.  
106 — A — Stock pertenece al Business.  
107 — A — Product soporta variantes.  
108 — A — Favoritos.  
109 — B — Cart separado por Business; no mezcla Businesses.  
110 — A — Cart persistente.  
111 — A — Variante tiene stock propio.  
112 — A — Variante tiene precio propio.  
113 — A — Stock cero sigue visible como Sin stock.  
114 — B — Business no marca manualmente disponibilidad; depende del stock.  
115 — B — Stock cero implica Sin stock.  
116 — A — Business puede tener productos exclusivos.  
117/118 — A — Identidad/description/variant/images canónicas comunes; datos comerciales pueden variar por Business.  
119 — B — Product pertenece a una categoría.  
120 — A — Wapsell define categorías globales.  
121 — C — Business selecciona producto canónico existente o propone/crea uno si no existe.  
122 — B — Homologación por identidad comercial + identificador estándar cuando existe.  
123 — B — Confianza: PROPUESTO→VALIDADO→CONFIABLE→CONSOLIDADO; thresholds quedan abiertos.  
124 — A — Wapsell auto-confirma homologación al cumplir criterios.  
125 — C — Solo SaaS Admin puede deshomologar.  
126 — A — EAN/GTIN identifica mismo producto.  
127 — A — Sin EAN/GTIN puede homologarse por otras características.  
128 — C — Business y Wapsell pueden proponer homologaciones.  
129 — A — Productos existentes se vinculan automáticamente si Wapsell identifica mismo canónico.  
130 — D — Homologación se utiliza en toda la cadena catálogo→precios→cart→orders→purchases→suppliers→stock→reports.  
131 — A — Supplier SKU puede auto-vincularse al canónico homologado.  
132 — A — Historial de precio de compra se preserva.  
133 — A — Comparación de proveedores ordenada por precio.  
134 — C — Purchase Order desde Purchases o conversación con Supplier.  
135 — B — Business↔Supplier Messaging es comunicación; no convierte automáticamente en compra.  
136 — D — Recepción discrepante registra recibido y deja diferencia para decisión.  
137 — A — Registrar recibido real y preservar diferencia pendiente.  
138 — A — Unidades de compra/venta pueden diferir.  
139 — C — Sin conversión automática; se conserva unidad original.  
140 — A — Productos similares sin EAN/GTIN pueden auto-homologarse.  
141 — C — Faltante en recepción se registra como incidencia.  
142 — C — Exceso se registra como diferencia/exceso para decisión posterior.  
143 — A — Purchase puede tener múltiples recepciones parciales.  
144 — B — Stock impacta después de control/aprobación de recepción.  
145 — A — Trazabilidad completa por recepción.  
146 — A — Lotes.  
147 — A — Vencimientos.  
148 — A — Stock por ubicación.  
149 — A — Transferencias internas entre ubicaciones.  
150 — C — Movimiento inter-Business mediante operación comercial formal.  
151 — B — Recepción aprobada inmutable; corrección mediante ajuste.  
152 — A — Corrección de stock mediante ajuste con motivo/responsable.  
153 — A — Usuario con permiso Stock puede ajustar.  
154 — A — Todo ajuste exige motivo.  
155 — A — Todo movimiento de stock tiene trazabilidad completa.  
156 — A — Producto vencido queda automáticamente fuera del stock disponible.  
157 — A — FEFO.  
158 — A — Múltiples unidades de medida relacionadas.  
159 — A — Stock negativo prohibido; operación rechazada.  
160 — A — Última unidad vendida deja stock 0 y Sin stock.  
161 — A — Existe stock reservado; físico, disponible y reservado.  
162 — A — Cancelación de Order libera reserva automáticamente.  
163 — B — Reserva al confirmar Order.  
164 — A — Concurrencia permite solo una confirmación de última unidad.  
165 — A — Stock físico incluye reservado; disponible se deriva.  
166 — A — Transferencia interna reserva stock antes de ejecución.  
167 — A — Inter-Business genera Sale en A y Purchase en B.  
168 — A — Operación inter-Business puede tener precio específico.  
169 — A — Transferencia puede tener costo asociado.  
170 — A — Historial de costos preservado.  
171 — A — Cálculo automático de costo.  
172 — A — FIFO.  
173 — B — Margen en Reports, no necesariamente UI transaccional.  
174 — A — Business configura margen objetivo y Wapsell calcula/sugiere precio.  
175 — A — Múltiples listas de precios, incluida mayorista.  
176 — C — Precio por cantidad depende de Product/Business.  
177 — A — Precio/condición específica por Customer.  
178 — A — Vigencia temporal de precios.  
179 — A — Promociones aplican automáticamente según condiciones.  
180 — A — Promociones pueden combinarse según reglas.  
181 — C — Solo ciertos Customers tienen AR/CC.  
182 — C — Owner/Admin o permiso AR habilita.  
183 — A — Customer puede tener límite de crédito.  
184 — A — Exceso de límite se rechaza automáticamente.  
185 — A — Customer puede ver saldo.  
186 — A — Pagos parciales de deuda.  
187 — A — Un pago puede aplicarse a múltiples deudas.  
188 — A — Aplicación automática por antigüedad.  
189 — A — Historial completo de pagos.  
190 — A — Reversión/ajuste de pago trazable.  
191 — A — Deuda tiene vencimiento.  
192 — A — Vencida automáticamente al superar vencimiento.  
193 — A — Diferenciar vencida/no vencida.  
194 — A — Alertas/reminders.  
195 — A — Recordatorios automáticos al Customer.  
196 — A — Suspender crédito específicamente.  
197 — A — Crédito bloqueado no impide compra contado.  
198 — B — Credit limit check considera deuda existente, no automáticamente deuda + nueva compra; requiere futura revisión si impacta contratos.  
199 — A — Condiciones de crédito pertenecen a Customer↔Business.  
200 — A — Pago puede aparecer como evento de sistema en conversación.

## 201–300

201 — A — Cada Business tiene su propia Cash.  
202 — A — Business puede tener múltiples Cajas.  
203 — A — Cash debe abrirse antes de operar.  
204 — A — Usuario con permiso Cash puede abrir.  
205 — B — Un responsable por Cash durante turno.  
206 — A — Movimiento registra origen, importe, método y responsable.  
207 — A — Retiro manual con motivo, importe y responsable.  
208 — C — Ingreso manual solo Owner/Admin.  
209 — A — Cierre compara esperado vs contado y registra diferencia.  
210 — A — Diferencia se registra automáticamente como conciliación.  
211 — A — Business configura métodos de pago.  
212 — A — Pagos mixtos.  
213 — A — Pago efectivo impacta Cash inmediatamente.  
214 — A — Transferencia bancaria asociada a operación/cliente/referencia.  
215 — A — Pago externo puede quedar PENDING.  
216 — A — ID externo preservado.  
217 — A — Pago rechazado no modifica deuda.  
218 — A — Reversión posterior de pago aprobado restaura deuda.  
219 — A — Conciliación Cash/Sales/Payments.  
220 — A — Pago puede aplicarse a deuda anterior.  
221 — A — Aplicación automática a deuda más antigua.  
222 — A — Deuda puede estar parcialmente vencida.  
223 — A — Condiciones de pago/crédito específicas por Customer.  
224 — A — Plazos en días.  
225 — A — Business puede cambiar condiciones con permiso.  
226 — A — Historial de cambios de límite.  
227 — A — Deudas pueden tener intereses/recargos.  
228 — A — Recargos automáticos según configuración.  
229 — A — Crédito disponible calculado automáticamente considerando deuda.  
230 — A — Crédito disponible visible en conversación con permiso.  
231 — A — Múltiples Suppliers pueden ofrecer mismo Product.  
232 — A — SKU específico por Supplier.  
233 — A — Historial de precio de compra por Supplier.  
234 — B — Usuario selecciona Supplier manualmente; no sugerencia automática.  
235 — A — Business y Supplier se comunican por Messaging.  
236 — A — Supplier comparte Products desde conversación.  
237 — A — Supplier envía propuestas de precio desde conversación.  
238 — A — Solicitar cotizaciones a múltiples Suppliers.  
239 — A — Comparar cotizaciones.  
240 — A — Cotización aceptada puede convertirse en Purchase Order.  
241 — A — Purchase Order tiene lifecycle.  
242 — A — Supplier puede confirmar/rechazar PO.  
243 — A — PO modificable hasta confirmación del Supplier.  
244 — C — PO confirmado puede cancelarse si Supplier acepta.  
245 — A — Precio acordado queda congelado en PO.  
246 — A — Recepción se compara automáticamente contra PO.  
247 — A — Documento del Supplier puede adjuntarse.  
248 — A — Business ve monto adeudado por Supplier.  
249 — A — Deuda a Supplier admite pagos parciales.  
250 — A — Pagos a Supplier trazables.  
251 — A — Customer puede existir sin User.  
252 — A — Customer puede vincularse luego a User.  
253 — A — User puede ser Customer de múltiples Businesses.  
254 — A — Customer↔Business tiene datos comerciales propios.  
255 — B — Customer puede desactivarse, no eliminarse físicamente.  
256 — B — Customer con historial nunca se elimina físicamente; se desactiva.  
257 — A — Múltiples direcciones: legal, real, facturación.  
258 — A — Direcciones tienen tipo/uso.  
259 — A — Customer puede elegir dirección alternativa de entrega.  
260 — A — Operación congela dirección histórica utilizada.  
261 — B — Un teléfono.  
262 — B — Un contacto asociado.  
263 — A — Customer empresa puede tener múltiples Users compradores asociados.  
264 — A — Business crea etiquetas de Customer.  
265 — A — Etiquetas para segmentación.  
266 — A — Business puede bloquear Customer.  
267 — A — Bloqueo afecta solo relación con ese Business.  
268 — A — User puede conversar antes de ser Customer.  
269 — A — Primer contacto crea automáticamente relación Customer.  
270 — A — Primera compra confirma relación Customer.  
271 — A — User puede tener roles/perfiles diferentes por Business.  
272 — A — User puede tener múltiples perfiles dentro del mismo Business.  
273 — A — Modelo conceptual: Profile → conjunto de roles atomizados → permisos/capacidades. Ej.: perfil Vendedor puede escribir/cobrar en Messaging y consultar Stock, pero no modificarlo.  
274 — A — Capacidades individuales pueden agregarse.  
275 — A — Capacidades individuales pueden quitarse.  
276 — A — Owner/Admin gestiona perfiles, roles y permisos.  
277 — A — Owner puede transferir ownership directamente.  
278 — A — Múltiples Owners.  
279 — A — Owner puede salir voluntariamente cuando corresponda.  
280 — B — No se puede eliminar al último Owner; debe existir al menos uno.  
281 — A — Business puede invitar User sin cuenta.  
282 — A — Invitaciones expiran.  
283 — A — Invitaciones pueden cancelarse antes de aceptar.  
284 — A — Salida de Business desactiva Membership; User global permanece.  
285 — A — Reingreso/reactivación reutiliza Membership existente.  
286 — A — Business puede bloquear temporalmente User.  
287 — A — Bloqueo contextual no afecta otros Businesses.  
288 — A — User puede cambiar Business activo.  
289 — A — Business activo determina datos/recursos accesibles.  
290 — A — Cambio de Business no requiere reautenticación si Membership válida.  
291 — A — Business crea perfiles personalizados.  
292 — A — Perfil reutilizable entre usuarios.  
293 — A — User puede tener múltiples perfiles en mismo Business.  
294 — A — Modificación de perfil afecta a usuarios que lo poseen.  
295 — A — Capability individual puede sobrescribir perfil.  
296 — A — Perfiles tienen nombre/descripción configurables.  
297 — A — Perfil puede quedar inactivo sin eliminarse.  
298 — A — Rol atomizado puede reutilizarse en perfiles.  
299 — A — Roles pueden tener dependencias.  
300 — A — Acciones Messaging controladas por capabilities.

## 301–400

301 — A — Acciones ERP iniciadas desde Messaging también verifican permisos.  
302 — A — Business tiene Team view.  
303 — A — Miembros pueden ver otros miembros según permisos.  
304 — A — Membership puede desactivarse temporalmente.  
305 — A — Operaciones históricas permanecen tras desactivación.  
306 — A — Conversaciones de vendedor que sale pasan automáticamente a Owner.  
307 — A — Business tiene configuración propia.  
308 — A — Branding pertenece/configurable por Business.  
309 — A — Business configura información pública.  
310 — A — Business configura visibilidad.  
311 — Narrativa — User presenta formulario de creación de Business; Wapsell debe aprobar antes de crear.  
312 — A — Creador pasa automáticamente a Owner.  
313 — B — Business no puede existir sin al menos un Owner.  
314 — A — Business tiene estado propio.  
315 — A — Business inactivo vuelve inactivas las Memberships.  
316 — B — Business suspendido no puede usar Messaging.  
317 — A — Business tiene identificador global único.  
318 — A — Nombre comercial no necesita ser único.  
319 — A — Business tiene slug/identificador público amigable.  
320 — A — Business puede tener múltiples branches/locations.  
321 — A — Branches pertenecen al mismo Business.  
322 — A — Branch puede tener múltiples Cajas.  
323 — A — Branch puede tener stock independiente.  
324 — A — Permisos pueden variar por Branch.  
325 — A — Acceso User puede limitarse a locations.  
326 — A — Customer pertenece a Business; operación identifica location.  
327 — A — Product pertenece a Business; stock/precio pueden variar por location.  
328 — A — Sale identifica location.  
329 — A — Purchase puede recibirse en location específica.  
330 — A — SaaS Admin puede administrar Business sin Membership.  
331 — A — Branch puede tener múltiples warehouses.  
332 — A — Warehouse puede pertenecer directamente a Business.  
333 — A — Transferencia de stock entre Branches permitida.  
334 — A — Transfer conserva origen/destino.  
335 — A — Transfer tiene estados.  
336 — A — Usuario con Stock permission puede solicitar transfer.  
337 — A — Usuario con Stock permission puede aprobar transfer.  
338 — A — Origen prepara mercadería antes de envío.  
339 — A — Destino confirma recepción.  
340 — A — Se registra cantidad enviada vs recibida.  
341 — A — Diferencia genera incidencia.  
342 — A — Product puede estar disponible en una Branch y no otra.  
343 — A — Precio puede variar por Branch.  
344 — A — Promoción puede limitarse a Branch.  
345 — B — Customer no puede comprar en una Branch y retirar en otra.  
346 — B — Business asigna pickup location; Customer no la elige.  
347 — A — Horarios por Branch.  
348 — A — Zonas de delivery por Branch.  
349 — A — Driver puede asociarse a múltiples Branches.  
350 — A — Availability search puede mostrar stock entre locations.  
351 — A — Todo Order identifica location de origen/preparación.  
352 — B — Business decide manualmente location de preparación.  
353 — C — Location de preparación no cambia después de crear Order.  
354 — B — Order se prepara desde una sola location.  
355 — B — Order no se divide en múltiples shipments.  
356 — A — Customer ve estado del Order.  
357 — A — Order tiene tracking events.  
358 — A — Business puede ofrecer pickup o delivery.  
359 — A — Customer puede elegir pickup en local; 346 mantiene que Business asigna la location concreta.  
360 — A — Customer puede elegir home delivery.  
361 — A — Delivery puede tener costo.  
362 — A — Costo depende de zona.  
363 — A — Business define zonas de delivery.  
364 — A — Driver puede aceptar/rechazar delivery asignado.  
365 — A — Wapsell sugiere Drivers disponibles.  
366 — A — Business puede seleccionar Driver manualmente.  
367 — A — Driver debe aceptar antes de iniciar viaje.  
368 — A — Driver actualiza estados desde su Space.  
369 — A — Customer ve Driver asignado.  
370 — A — Cambios de delivery aparecen como eventos de conversación.  
371 — A — Estado inicial Order: CONFIRMADO.  
372 — A — Preparación iniciada por usuario con permiso preparación/Stock.  
373 — A — Estado PREPARANDO explícito.  
374 — A — Estado LISTO PARA RETIRAR/ENTREGAR explícito.  
375 — A — Usuario con permiso de preparación confirma ready.  
376 — A — Pickup pasa a delivered cuando Customer retira.  
377 — A — Customer confirma delivery.  
378 — Narrativa — Si Driver declara entregado pero Customer no confirma, el sistema debe contactar al Customer para obtener confirmación; canal/timeout quedan abiertos.  
379 — Narrativa — Evidencia de entrega mediante código visible solo para Customer, que lo entrega al Driver.  
380 — C — Código/PIN como evidencia de entrega.  
381 — A — Delivered Order se convierte automáticamente en Sale.  
382 — A — Sale conserva referencia al Order originador.  
383 — A — Confirmed Sale inmutable; correcciones por operaciones apropiadas.  
384 — A — Confirmed Sale puede cancelarse mediante operación explícita.  
385 — A — Cancelación revierte efectos aplicables.  
386 — A — Cancelación queda registrada como evento.  
387 — A — Cancelación requiere permiso específico.  
388 — A — Customer puede solicitar cancelación desde conversación.  
389 — A — Respuesta tomada como cancelación automática; requiere reconciliar con 091/092 antes de contrato.  
390 — A — Historial completo de estados del Order con fecha/hora/responsable cuando corresponde.  
391 — A — Customer puede solicitar devolución después de recibir producto.  
392 — A — Devolución es operación independiente; no edita Sale.  
393 — C — Devolución afecta Stock cuando producto retorna físicamente.  
394 — C — Producto devuelto puede quedar pendiente de inspección antes de disponibilidad.  
395 — A — Si supera control, puede volver a estar disponible.  
396 — A — Devolución puede generar reembolso.  
397 — A — Reembolso parcial permitido.  
398 — A — Reembolso vinculado a pago original.  
399 — A — Devolución puede ajustar AR/Cuenta Corriente.  
400 — A — Devolución aparece como evento en conversación.

## 401–490

401 — A — Customer puede consultar estado de devolución.  
402 — A — Devolución tiene estados propios.  
403 — A — Existe responsable/actor con capacidad de aprobar devolución.  
404 — B — Devolución aprobada puede ser posteriormente rechazada tras inspección.  
405 — A — Business configura reglas de devolución.  
406 — A — Reglas pueden variar por Product.  
407 — A — Reglas pueden variar por Customer.  
408 — A — Devolución puede generar incidencia.  
409 — A — Incidencias vinculadas a Product, Order y Customer.  
410 — A — Customer puede visualizar incidencias relevantes.  
411 — A — Una devolución puede incluir múltiples Products del mismo Order.  
412 — A — Devolución parcial por cantidad.  
413 — A — Puede devolverse un Product individual de una Sale múltiple.  
414 — A — Cada Product devuelto registra motivo.  
415 — B — Motivos pertenecen a catálogo global Wapsell.  
416 — B — Business no agrega motivos propios.  
417 — A — Inspección registra quién la realizó.  
418 — A — Inspección registra fecha/hora.  
419 — A — Inspección determina destinos diferentes del producto.  
420 — A — Producto en cuarentena queda fuera del stock disponible.  
421 — A — Devolución puede generar reposición.  
422 — A — Wapsell soporta intercambio de productos.  
423 — A — Intercambio queda vinculado a devolución original.  
424 — A — Devolución puede generar simultáneamente reembolso y reposición.  
425 — A — Reembolso considera automáticamente descuentos/promociones originales.  
426 — A — Costo de envío puede incluirse en reembolso.  
427 — A — Tratamiento del envío depende de reglas de devolución.  
428 — A — Impuestos/cargos forman parte del cálculo de reembolso.  
429 — A — Se intenta utilizar método de pago original cuando técnicamente posible.  
430 — A — Si no es posible, Business puede registrar reembolso alternativo con trazabilidad.  
431 — A — Customer recibe notificación al crear devolución.  
432 — A — Customer recibe notificación al aprobar devolución.  
433 — A — Customer recibe notificación al recibirse físicamente producto.  
434 — B — No se notifica específicamente inicio de inspección.  
435 — B — No se notifica específicamente finalización de inspección.  
436 — A — Se notifica resultado de devolución.  
437 — A — Se notifica procesamiento de reembolso.  
438 — A — Se notifica generación de reposición.  
439 — A — Eventos de devolución son visibles en conversación.  
440 — A — Mensajes automáticos tienen tipo de sistema propio.  
441 — A — Business configura notificaciones que recibe Customer.  
442 — A — Business configura notificaciones para usuarios internos.  
443 — A — Notificaciones respetan capabilities/permisos.  
444 — A — Seller puede recibir alerta de solicitud de devolución.  
445 — A — Usuario con Stock permission puede recibir alerta de producto pendiente de inspección.  
446 — A — Usuario Caja/Finanzas puede recibir alerta de reembolso.  
447 — A — Sistema evita notificaciones duplicadas del mismo evento.  
448 — A — Cada notificación es trazable al evento originador.  
449 — A — Notificación conserva fecha/hora y estado de entrega/lectura cuando corresponde.  
450 — A — Customer consulta estado de devolución desde conversación.  
451 — A — Reembolso de efectivo genera movimiento automático en Cash.  
452 — A — Reembolso por transferencia genera operación de salida/reembolso trazable.  
453 — A — Reembolso puede quedar PENDIENTE hasta confirmación efectiva.  
454 — A — Reembolso confirmado actualiza estado financiero correspondiente.  
455 — A — Reembolso rechazado conserva registro histórico.  
456 — A — Reembolso puede cancelarse antes de ejecutarse.  
457 — A — Cancelación de reembolso registra motivo y responsable.  
458 — A — Reembolso vinculado a devolución originadora.  
459 — A — Reembolso vinculado a Sale original.  
460 — A — Reembolso vinculado a pago original cuando existe.  
461 — A — Sistema impide doble reembolso del mismo importe.  
462 — A — Sistema controla máximo reembolsable según operación original.  
463 — A — Devolución parcial calcula automáticamente máximo reembolsable.  
464 — A — Descuentos/promociones originales se distribuyen entre productos cuando corresponde.  
465 — A — Costo de envío se trata como componente separado.  
466 — A — Reembolso puede afectar Cuenta Corriente.  
467 — A — Saldo a favor generado por devolución puede aplicarse automáticamente contra deuda existente.  
468 — A — Reembolso y Pago son conceptos/operaciones distintos.  
469 — A — Todo reembolso es auditable: usuario, fecha/hora, importe, método y origen.  
470 — A — Reembolso confirmado es inmutable; corrección mediante nueva operación.  
471 — A — Historial completo de cambios de cada Sale.  
472 — A — Historial identifica quién realizó cada acción.  
473 — A — Historial registra fecha/hora.  
474 — A — Cambio de estado registra estado anterior y nuevo.  
475 — A — Anulación queda como evento independiente.  
476 — A — Cancelación de Order conserva motivo.  
477 — A — Modificaciones de precio auditadas.  
478 — A — Modificaciones de stock auditadas.  
479 — A — Modificaciones de crédito de Customer auditadas.  
480 — A — Operaciones de Cash auditadas.  
481 — A — Cambios de permisos/perfiles auditados.  
482 — A — Cambios de Owner auditados.  
483 — A — Creación/desactivación de Business auditada.  
484 — A — Activación/desactivación de Membership auditada.  
485 — A — Accesos administrativos SaaS sobre Business auditados.  
486 — A — Usuario con permisos suficientes puede consultar auditoría del Business.  
487 — A — Auditoría respeta aislamiento entre Businesses.  
488 — A — SaaS Admin puede consultar auditoría de cualquier Business que administre.  
489 — A — Registros de auditoría inmutables para usuarios normales.  
490 — A — Eliminación lógica conserva historial de auditoría.

## Observaciones de reconciliación detectadas durante el workshop

Estas no son decisiones nuevas; son puntos que deben revisarse antes de convertir el relevamiento en contratos/invariantes:

- 076 fue inicialmente OPEN y luego 087 definió Customer como confirmador de Order.
- 077 y 161–165 requieren reconciliar el momento exacto entre descuento físico, reserva y disponibilidad.
- 078 requiere reconciliación con Sale/AR y con la posibilidad de operaciones parcialmente impagas.
- 079 queda tensionada por 099 y 381: el criterio final de conversión Order→Sale debe quedar en especificación.
- 091/092/389 requieren una matriz precisa de cancelación por estado y actor.
- 123/124/140 requieren definir thresholds y condiciones de homologación automática.
- 198 requiere validación posterior del criterio de límite de crédito.
- 273 introduce explícitamente el modelo Profile → Roles atomizados → Capabilities, que debe reconciliarse con la terminología canónica Role/Permission.
- 304 es compatible conceptualmente con 001 si “desactivada” significa estado INACTIVA.
- 345/346/359 requieren precisar diferencia entre elegir pickup como modalidad y elegir la Branch concreta.
- 378/379/380 requieren definir timeout/escalamiento del proceso de confirmación de entrega.
- 389 requiere revisión explícita porque su interpretación automática puede afectar 091/092.
