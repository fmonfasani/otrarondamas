# SPEC — Módulo de Catálogo de Productos

## Otra Roonda Más

**Tipo:** Especificación funcional propuesta
**Estado:** Borrador para revisión y aprobación
**Módulo:** Catálogo / Productos
**Proyecto:** Otra Roonda Más
**Metodología:** Specification-Driven Development (SDD)

---

# 1. Propósito

Definir el sistema de catálogo de Otra Roonda Más para administrar productos comercializables, sus presentaciones, códigos de identificación, categorías, proveedores y listas de precios.

El catálogo debe permitir:

* Mantener un catálogo maestro interno de productos.
* Importar catálogos de distintos proveedores.
* Conservar los códigos y descripciones originales de cada fuente.
* Relacionar productos equivalentes de diferentes proveedores.
* Diferenciar productos, variantes y presentaciones.
* Administrar listas de precios por proveedor y canal comercial.
* Identificar productos mediante escaneo de códigos de barras.
* Permitir que un producto identificado pueda utilizarse en los procesos de ingreso de mercadería y gestión de stock.

La especificación no autoriza por sí sola cambios en otros módulos del sistema. Toda integración debe contrastarse con la SPEC canónica vigente.

# 2. Alcance funcional

## 2.1 Incluido en el alcance propuesto

1. Catálogo maestro.
2. Clasificación jerárquica de productos.
3. Atributos y presentaciones.
4. SKU interno.
5. Códigos de origen y códigos de barras.
6. Relación producto-proveedor.
7. Importación y revisión de catálogos.
8. Conciliación de artículos entre fuentes.
9. Listas de precios e historial.
10. Búsqueda de productos y lectura de códigos.
11. Identificación de artículos para el proceso de ingreso a stock.

## 2.2 Fuera del alcance de esta especificación

Salvo que la SPEC canónica vigente indique lo contrario, este documento no define:

* La implementación completa del módulo de inventario.
* La contabilización de compras o pagos a proveedores.
* El cálculo fiscal definitivo de impuestos.
* La política comercial definitiva de precios y márgenes.
* La sincronización con Mercado Libre.
* La publicación automática en canales externos.
* La aprobación de proveedores.
* La definición de promociones o descuentos por volumen.
* La implementación de facturación.

# 3. Principios del catálogo

## 3.1 Separación de conceptos

El sistema debe distinguir entre:

* **Categoría:** clasificación del artículo.
* **Producto:** identidad comercial del producto.
* **Variante:** diferenciación del producto por atributos relevantes.
* **Presentación:** formato comercial en el que se vende o compra.
* **SKU interno:** identificador propio de Otra Roonda Más para una unidad comercial gestionable.
* **Código de origen:** identificador asignado por un proveedor o fuente externa.
* **Código de barras:** identificador utilizado para la lectura mediante escáner.
* **Oferta/lista de precios:** condiciones comerciales de un proveedor o canal.
* **Stock:** cantidad existente en el negocio, administrada por el módulo de inventario.

Estos conceptos no deben fusionarse en una única entidad.

## 3.2 Identidad interna

Cada artículo comercial gestionable debe tener un identificador interno estable.

El código de origen de un proveedor no reemplaza al identificador interno.

El código de barras tampoco debe considerarse necesariamente un identificador universal del producto: debe poder vincularse a un artículo interno y, cuando corresponda, a una presentación específica.

## 3.3 Trazabilidad

Los datos importados deben conservar su procedencia.

El sistema debe permitir identificar:

* De qué proveedor provino el registro.
* Qué código tenía en el origen.
* Qué descripción tenía en el origen.
* De qué archivo o importación provino.
* Qué precio se recibió.
* Cuándo se recibió la información.
* Si el registro fue revisado y aceptado.

# 4. Modelo conceptual

## 4.1 Categoría

Representa una clasificación del catálogo.

Debe permitir una estructura jerárquica flexible, sin exigir que todos los productos tengan la misma cantidad de niveles.

Jerarquía conceptual propuesta:

Sección → Grupo → Subgrupo → Tipo → Subtipo

Los niveles pueden utilizarse según las necesidades de cada rubro. No todos son obligatorios.

Ejemplo ilustrativo:

* Sección: Bebidas
* Grupo: Bebidas sin alcohol
* Subgrupo: Gaseosas
* Tipo: Gaseosa cola
* Subtipo: Regular
* Producto: Marca y variedad concreta
* Presentación: Botella de 2,25 litros

Los nombres y niveles definitivos de la taxonomía quedan pendientes de aprobación.

## 4.2 Producto

Representa la identidad comercial del artículo.

Atributos conceptuales:

* Identificador interno.
* Nombre normalizado.
* Marca, si corresponde.
* Descripción.
* Categoría asignada.
* Estado activo/inactivo.
* Atributos específicos de su categoría.

El producto no debe almacenar como atributos maestros los precios particulares de cada proveedor.

## 4.3 Variante

Representa una diferenciación comercial o física del producto.

Ejemplos posibles:

* Sabor.
* Tamaño.
* Gramaje.
* Color.
* Tipo de envase.
* Fórmula o variedad.

Los atributos aplicables deben depender de la categoría. No se exige que todos los productos tengan variantes.

## 4.4 Presentación / artículo vendible

Representa el formato concreto que puede comprarse, almacenarse o venderse.

Ejemplos:

* Botella individual de 2,25 litros.
* Pack de 6 botellas.
* Cajón de 8 botellas.
* Paquete de 500 gramos.

Debe poder describir:

* Producto o variante asociada.
* Cantidad contenida.
* Unidad de medida.
* Unidad de comercialización.
* Relación de conversión, cuando corresponda.
* SKU interno.
* Estado activo/inactivo.

La definición de unidades base y conversiones debe alinearse con la SPEC de inventario.

## 4.5 SKU interno

Cada artículo comercial gestionable debe tener un SKU interno único y estable.

Reglas propuestas:

* El SKU interno no debe depender del código de un proveedor.
* El SKU no debe cambiar cuando cambia el código de origen.
* Dos artículos solo pueden compartir SKU si se confirma que representan el mismo artículo y presentación.
* Una presentación distinta debe poder tener un SKU distinto.
* La política de generación del SKU queda pendiente de aprobación.

## 4.6 Código de origen

Identifica un artículo dentro de una fuente externa.

Debe conservarse como texto, sin eliminar ceros a la izquierda ni modificar su representación original.

La relación lógica propuesta es:

Proveedor + sistema/fuente + código de origen → SKU interno

Un mismo proveedor podría tener distintos catálogos o listas. El modelo debe permitir registrar el contexto de origen necesario para evitar colisiones.

Un código de origen no debe utilizarse como clave universal entre proveedores.

## 4.7 Código de barras

Permite identificar un artículo mediante un escáner.

Debe poder vincularse a un SKU interno y, cuando corresponda, a una presentación específica.

Un SKU puede tener más de un código de barras asociado si existen razones comerciales u operativas válidas.

Un mismo código de barras no debe quedar asociado silenciosamente a artículos incompatibles.

Si el código escaneado no existe, el sistema debe informar que no fue identificado y permitir iniciar un proceso de revisión o vinculación autorizado.

## 4.8 Proveedor y relación proveedor-producto

La relación proveedor-producto debe registrar, como mínimo:

* Proveedor.
* Código de origen.
* Descripción de origen.
* SKU interno asociado, si existe.
* Presentación informada.
* Estado de conciliación.
* Fecha de alta o actualización.
* Referencia a la importación de origen.

Un proveedor puede comercializar muchos SKU. Un SKU puede estar relacionado con más de un proveedor.

## 4.9 Lista de precios

Una lista representa precios recibidos o definidos para un contexto comercial.

Debe poder diferenciar:

* Proveedor o fuente.
* Nombre o tipo de lista.
* Canal comercial, si corresponde.
* Moneda.
* Fecha de recepción.
* Vigencia desde/hasta, si está informada.
* Estado de la lista.
* Artículos y precios contenidos.

Los precios de listas distintas no deben sobrescribirse entre sí.

La naturaleza de cada precio —costo, precio de venta, precio sugerido u otro— debe estar explícitamente identificada. Si la fuente no permite determinarla, debe quedar pendiente de revisión.

# 5. Clasificación comercial

## 5.1 Taxonomía flexible

El catálogo debe permitir categorías con jerarquía variable.

No debe obligar a crear niveles artificiales para clasificar productos que no los necesitan.

La clasificación debe poder evolucionar sin cambiar la identidad interna del SKU.

## 5.2 Categorías y atributos

La categoría clasifica el producto. Los atributos describen sus características.

Ejemplos ilustrativos:

* Galletitas: tipo, sabor, gramaje, relleno.
* Bebidas: tipo, sabor, volumen, envase, unidades por pack.
* Limpieza: tipo de producto, contenido, formato.
* Pilas: química, tamaño, cantidad por pack.

Estos ejemplos no constituyen una taxonomía aprobada ni una lista exhaustiva de atributos.

# 6. Importación de catálogos

## 6.1 Fuentes contempladas

Se utilizarán como fuentes iniciales de análisis:

1. Catálogo mayorista DIPA MAX.
2. Catálogo minorista.
3. Catálogo de productos Coca-Cola.

Los archivos representan estructuras distintas. La importación debe admitir mapeos específicos por fuente.

## 6.2 Proceso de importación

Flujo propuesto:

1. Seleccionar archivo.
2. Identificar fuente/proveedor.
3. Leer y analizar las filas.
4. Mapear columnas de origen.
5. Normalizar datos sin destruir los valores originales.
6. Detectar registros incompletos o ambiguos.
7. Buscar coincidencias con el catálogo maestro.
8. Presentar resultados para revisión.
9. Aceptar, asociar, corregir o rechazar registros.
10. Confirmar la importación.
11. Registrar trazabilidad de la operación.

## 6.3 Importación revisable

La importación no debe publicar automáticamente productos o precios cuando existan ambigüedades.

El sistema debe diferenciar:

* Registro nuevo.
* Coincidencia probable.
* Coincidencia confirmada.
* Registro duplicado.
* Registro incompleto.
* Registro no conciliado.
* Registro rechazado.

La asignación automática de un registro externo a un SKU interno solo podrá realizarse cuando las reglas de conciliación aprobadas determinen que la coincidencia es inequívoca.

## 6.4 Preservación del origen

Debe conservarse el valor original de los campos relevantes, incluyendo:

* Código.
* Descripción.
* Presentación.
* Precio.
* Unidad o bulto.
* Disponibilidad.
* Categoría/rubro.
* Fecha o vigencia informada.

Los valores normalizados deben mantenerse separados de los valores originales cuando la transformación pueda alterar la información.

## 6.5 Datos ambiguos

Si un archivo no permite determinar de manera confiable la relación entre descripción, presentación y precio, el sistema debe marcar el registro para revisión.

No debe inferir silenciosamente relaciones comerciales.

# 7. Conciliación de productos

## 7.1 Objetivo

Relacionar registros de distintas fuentes con artículos internos existentes, evitando duplicados y preservando los códigos externos.

## 7.2 Datos útiles para comparar

La conciliación puede considerar:

* Proveedor y código de origen.
* Código de barras.
* Marca.
* Descripción normalizada.
* Variante.
* Gramaje o volumen.
* Tipo de envase.
* Unidades por presentación.
* Unidad de medida.

## 7.3 Reglas

* La igualdad de descripción no garantiza que dos registros sean el mismo artículo.
* La igualdad de código de origen entre proveedores no garantiza identidad.
* Las presentaciones diferentes deben distinguirse.
* Los códigos de origen deben conservarse aunque el producto se vincule a un SKU existente.
* Las coincidencias ambiguas deben requerir revisión.
* La asociación confirmada debe quedar registrada y ser auditable.

Los umbrales y reglas exactas de coincidencia automática quedan pendientes de definición.

# 8. Búsqueda y escaneo

## 8.1 Búsqueda

El usuario autorizado debe poder buscar artículos por los campos disponibles, incluyendo:

* SKU interno.
* Código de barras.
* Código de origen.
* Nombre.
* Marca.
* Categoría.
* Presentación.

Los resultados deben permitir identificar claramente la presentación del artículo.

## 8.2 Escaneo de código de barras

Al escanear un código:

1. El sistema recibe el valor leído.
2. Busca una asociación registrada.
3. Si encuentra una asociación válida, identifica el SKU y su presentación.
4. Muestra información suficiente para confirmar que se trata del artículo correcto.
5. Permite utilizarlo en el flujo operativo que corresponda.

El escaneo por sí solo no debe modificar el stock.

## 8.3 Código no identificado

Si no existe una asociación:

* Informar que el código no está identificado.
* No crear automáticamente un producto definitivo.
* No aumentar stock.
* Permitir iniciar el proceso autorizado de vinculación o alta.
* Registrar la incidencia si la arquitectura del sistema contempla auditoría de eventos.

# 9. Integración con ingreso de mercadería

## 9.1 Principio

El catálogo identifica qué artículo se está recibiendo. El módulo de inventario es responsable de registrar el movimiento y actualizar las existencias.

## 9.2 Flujo conceptual

1. El operador inicia una recepción o ingreso de mercadería.
2. Escanea el código.
3. El sistema resuelve el código al SKU interno.
4. Muestra el producto y la presentación.
5. El operador informa la cantidad recibida.
6. El sistema aplica las conversiones de unidad configuradas y aprobadas.
7. El operador revisa y confirma.
8. El módulo de inventario registra el movimiento.
9. El stock se actualiza según las reglas del módulo de inventario.

## 9.3 Controles

* Un código no identificado no debe generar una entrada de stock.
* La cantidad debe ser explícita o provenir de una regla aprobada.
* La conversión de cajas, packs o bultos a unidades debe estar configurada.
* No se debe inferir una conversión únicamente a partir del texto de la descripción.
* El ingreso confirmado debe quedar asociado al SKU y a la presentación correcta.
* El catálogo no debe modificar directamente existencias fuera del contrato definido con inventario.

Los permisos, anulaciones, ajustes, lotes, vencimientos y depósitos deben definirse en la SPEC de inventario si corresponden al alcance del MVP.

# 10. Listas mayoristas y minoristas

## 10.1 Separación

Los catálogos mayoristas y minoristas deben tratarse como fuentes/listas comerciales, no como catálogos maestros independientes.

El mismo SKU interno puede relacionarse con distintos proveedores y listas.

## 10.2 Catálogo mayorista

Debe poder registrar:

* Proveedor.
* Código de origen.
* Producto y presentación.
* Precio informado.
* Moneda.
* Vigencia, si se informa.
* Condiciones comerciales disponibles.
* Estado de revisión.

Los precios, descuentos, mínimos de compra y condiciones comerciales deben conservar el significado de la fuente. No deben convertirse en reglas propias del negocio sin aprobación.

## 10.3 Catálogo minorista

Debe poder registrar:

* Código de origen.
* Descripción.
* Precio informado.
* Rubro/categoría de origen.
* Bulto o presentación informada.
* Disponibilidad informada.
* Impuestos informados.
* Novedad u otros campos comerciales.

Los campos ambiguos deben conservarse como datos de origen hasta que se confirme su semántica.

## 10.4 Catálogo Coca-Cola

Debe poder registrar:

* Categoría de origen.
* Código de origen.
* Producto.
* Presentación.
* Precio unitario informado.
* Precio sugerido informado.

No se debe asumir automáticamente qué representa cada precio si la fuente no lo define claramente.

## 10.5 Historial de precios

La actualización de una lista no debe eliminar el historial anterior.

Debe poder determinarse qué precio fue informado por cada fuente y en qué fecha o vigencia.

La regla de selección del precio utilizado en ventas queda fuera de esta especificación y requiere alineación con las reglas comerciales del sistema.

# 11. Estados propuestos

Los estados siguientes son una propuesta funcional y deben validarse contra los estados ya existentes en el proyecto:

### Producto

* Activo.
* Inactivo.

### Registro importado

* Pendiente de revisión.
* Conciliado.
* Rechazado.
* Con errores.

### Código externo

* Activo.
* Inactivo.

### Lista de precios

* Importada.
* Pendiente de revisión.
* Aprobada.
* Vencida.
* Anulada.

No implementar estados adicionales ni flujos de aprobación hasta confirmar su compatibilidad con la arquitectura y los permisos del proyecto.

# 12. Requisitos no funcionales propuestos

* Mantener integridad referencial entre producto, presentación, SKU y códigos asociados.
* Evitar duplicaciones involuntarias de artículos.
* Preservar la trazabilidad de los datos importados.
* Evitar pérdida de ceros a la izquierda en códigos.
* Registrar las operaciones relevantes según el mecanismo de auditoría definido por el proyecto.
* Diseñar la búsqueda para uso operativo con escáner.
* Mantener separados los datos maestros y los datos comerciales variables.
* No exponer secretos ni datos sensibles en registros de importación o errores.

Los objetivos cuantitativos de rendimiento, volumen y disponibilidad quedan pendientes de la arquitectura y los requisitos no funcionales canónicos.

# 13. Criterios de aceptación propuestos

## CA-01 — SKU interno

Un artículo comercial gestionable puede identificarse mediante un SKU interno estable, independiente de los códigos de proveedores.

## CA-02 — Código de origen

El sistema conserva el código original y lo relaciona con su proveedor/fuente y SKU interno.

## CA-03 — Códigos repetidos

El sistema permite que distintos proveedores utilicen el mismo código de origen sin provocar una asociación incorrecta.

## CA-04 — Presentaciones

El sistema diferencia presentaciones comerciales distintas cuando representan unidades de compra, almacenamiento o venta diferentes.

## CA-05 — Importación

Una importación puede revisarse antes de confirmar altas o asociaciones al catálogo maestro.

## CA-06 — Ambigüedad

Los registros ambiguos no se concilian automáticamente sin una regla aprobada que garantice una coincidencia inequívoca.

## CA-07 — Precios

Las listas de diferentes fuentes se conservan separadas y una importación nueva no elimina el historial anterior.

## CA-08 — Escaneo reconocido

Al escanear un código registrado, el sistema identifica el artículo y su presentación.

## CA-09 — Escaneo desconocido

Al escanear un código no registrado, el sistema informa que no fue identificado y no modifica el stock.

## CA-10 — Ingreso de mercadería

El ingreso de stock requiere cantidad y confirmación explícitas, y debe integrarse con el módulo de inventario según su contrato.

## CA-11 — Disponibilidad

La disponibilidad informada por un proveedor no se interpreta automáticamente como stock propio.

## CA-12 — Datos originales

La normalización no destruye los valores originales relevantes para trazabilidad.

# 14. Decisiones pendientes

Las siguientes definiciones no deben inventarse durante la implementación:

1. Taxonomía definitiva y nomenclatura de niveles.
2. Si tipo y subtipo serán categorías, atributos o ambos.
3. Política de generación de SKU interno.
4. Unidades base de inventario y conversiones.
5. Semántica del campo "Disponible" de la lista minorista.
6. Semántica del precio unitario y precio sugerido de Coca-Cola.
7. Política de vigencia, aprobación y vencimiento de listas.
8. Reglas de precios mayoristas por cantidad.
9. Reglas de conciliación automática.
10. Permisos para crear y asociar códigos.
11. Reglas de recepción, lotes, vencimientos y depósitos.
12. Contrato de integración con inventario y ventas.
13. Requisitos de auditoría y retención de importaciones.

Si una definición es necesaria para implementar un comportamiento, registrar:

**NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE.**

No reemplazar la falta de definición por una decisión implícita.

# 15. Instrucciones para el agente de desarrollo

Antes de modificar código:

1. Inspeccionar el repositorio real y su estado de Git.
2. Leer la SPEC canónica vigente y las decisiones aprobadas.
3. Leer los documentos de arquitectura y contratos existentes.
4. Inspeccionar los módulos de catálogo, productos, proveedores, precios, ventas e inventario que existan.
5. Identificar qué funcionalidades están implementadas y cuáles son scaffolding o placeholders.
6. Comparar esta propuesta con la documentación canónica.
7. Informar contradicciones, requisitos faltantes y decisiones pendientes.
8. No tratar esta propuesta como aprobada automáticamente.
9. No sobrescribir la SPEC canónica ni documentos existentes sin autorización.
10. No implementar funcionalidades fuera del alcance acordado.

Antes de implementar, presentar un plan incremental que incluya:

* Requisito relacionado.
* Componentes afectados.
* Archivos que se modificarían.
* Dependencias.
* Contratos e invariantes.
* Criterios de aceptación.
* Pruebas propuestas.
* Riesgos y decisiones pendientes.

La implementación debe realizarse únicamente después de que el alcance y las decisiones necesarias hayan sido aprobados.

No realizar commits, deploys, migraciones destructivas ni cambios de infraestructura sin autorización explícita.

# 16. Entrega esperada del agente

Primera entrega: auditoría y plan, sin modificar archivos.

Debe incluir:

1. Compatibilidad con la SPEC canónica.
2. Contradicciones detectadas.
3. Requisitos que ya existen.
4. Requisitos nuevos propuestos.
5. Estado actual del código.
6. Modelo de datos actual y brechas.
7. Contratos con inventario y ventas.
8. Decisiones pendientes.
9. Incremento mínimo recomendado.
10. Pruebas y evidencia necesarias.

La implementación solo podrá comenzar luego de revisar y aprobar esa propuesta.

---

**Fin de la especificación funcional propuesta.**
