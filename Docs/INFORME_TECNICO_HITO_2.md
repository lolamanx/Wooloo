# Wooloo

## Informe técnico del Hito 2

Universidad Mayor · Escuela de Ingeniería Civil  
INGT1003 · Arquitectura de Desarrollo (Móvil y Web)  
Segundo semestre de 2026 · Santiago, Chile

**Equipo:** Wooloo  
**Integrantes e identificadores GitHub:** [Completar por el equipo]  
**Docente:** Carlos Muñoz S.  
**Fecha:** 21 de noviembre de 2026

<!-- pagina -->
## Índice

| Sección | Página |
| --- | --- |
| 1. Introducción y cambios desde el Hito 1 | 2 |
| 2. Contrato de la interfaz HTTP | 3 |
| 3. Cuerpos de ejemplo y validaciones | 4 |
| 4. Capas y decisión de arquitectura | 5 |
| 5. Modelo de datos, configuración y persistencia | 6 |
| 6. Verificación, conclusión y bibliografía | 7 |

## 1. Introducción y cambios desde el Hito 1

Wooloo permite planificar un viaje por Chile con un destino y paradas intermedias. El Hito 2 agrega una API REST que administra viajes y ubicaciones de catálogo. El cliente Android en modo debug puede guardar y recuperar viajes del servidor durante la exposición. El monitor permite seguir la interacción HTTP mientras se usa la aplicación.

| Aspecto | Hito 1 | Hito 2 y efecto |
| --- | --- | --- |
| Estado del itinerario | Viajes guardados en el dispositivo. | Una base SQLite sostiene las operaciones del servidor. Un GET recupera el viaje desde la base después de actualizarlo. |
| Catálogo | Lugares definidos en el prototipo. | El backend expone un catálogo gestionable por API. La pantalla Android conserva sus destinos incorporados y la administración del recurso se demuestra en Postman. |
| Separación de responsabilidades | Flujos de la interfaz y almacenamiento local. | Se introdujeron capas de HTTP, negocio y datos para validar las mismas reglas al recibir peticiones de distintos clientes. |
| Evidencia | Recorrido navegable. | Se añadió un monitor en vivo y una colección de peticiones para demostrar estados HTTP y datos persistidos. |

El cálculo vial y el mapa conservan sus proveedores previos. El alcance de esta API es administrar los datos del itinerario y el catálogo.

<!-- pagina -->
## 2. Contrato de la interfaz HTTP

<!-- contrato-tabla -->

<!-- pagina -->
## 3. Cuerpos de ejemplo y validaciones

<!-- contrato-ejemplos -->

<!-- pagina -->
## 4. Capas y decisión de arquitectura

La aplicación, la vista web y Postman consumen recursos HTTP. El servidor monta rutas en `backend/server.js`. Los controladores convierten las solicitudes en llamadas a servicios y forman la respuesta HTTP. Los servicios validan el dominio. El repositorio es el punto de acceso a SQLite.

**Recorrido de POST /api/trips.** Express lee el JSON. tripController invoca createTrip. tripService valida el nombre, la fecha y las referencias al catálogo, y genera el ID si corresponde. dbRepository escribe el viaje y sus paradas en una transacción. El controlador devuelve 201 con el ID y la cabecera Location. Un GET posterior vuelve a leer el estado almacenado.

| Tecnología | Criterio y costo asumido |
| --- | --- |
| JavaScript y Node.js | El prototipo ya usa JavaScript. Frente a incorporar otro lenguaje, compartirlo reduce el aprendizaje inicial. La entrada JSON se valida explícitamente en ejecución. |
| Express | Rutas y middleware permiten implementar la interfaz con convenciones propias. Frente a un framework con más estructura, el equipo debe mantener las fronteras entre capas. |
| SQLite | El archivo local y los scripts facilitaban levantar el servicio en laboratorio. Frente a PostgreSQL, SQLite permite una instalación más simple y limita las escrituras simultáneas a un escritor por base. |

**Decisión.** Monolito en capas para un equipo de [completar número real] integrantes. Esperamos una carga de laboratorio baja, con un teléfono y un cliente de pruebas, y ráfagas de pocas escrituras. Es un escenario de diseño, sin medición de capacidad productiva. El equipo instala y opera un proceso de Node y un archivo SQLite. Un servicio distribuido añadiría despliegues, red y coordinación de datos. Revisaríamos el motor si las escrituras concurrentes empiezan a competir por el archivo y revisaríamos la separación de servicios si un componente requiere escala, despliegue o propiedad independiente.

<!-- pagina -->
## 5. Modelo de datos, configuración y persistencia

| Tabla | Clave y tipos | Relación |
| --- | --- | --- |
| catalog_locations | key TEXT PK. name, icon y description TEXT. lat y lng REAL. | Un lugar puede ser destino o parada en varios viajes. |
| trips | id TEXT PK. name, dest_key y departure_iso TEXT. created_at y updated_at DATETIME. | dest_key referencia catalog_locations.key. |
| stops | id INTEGER PK. trip_id y stop_key TEXT. stay_min y sequence_order INTEGER. | trip_id referencia trips.id. stop_key referencia catalog_locations.key. |

**Cardinalidad.** catalog_locations 1 → 0..N trips como destino. trips 1 → 0..N stops, con un máximo de diez aplicado por el servicio. catalog_locations 1 → 0..N stops como ubicación.

SQLite aplica claves foráneas. Borrar un viaje elimina sus paradas. Borrar un lugar referenciado devuelve 409. El repositorio ejecuta en una transacción la escritura de un viaje y sus paradas. Los scripts schema.sql y seed.sql permiten inicializar la base. La carga automática queda marcada para conservar las eliminaciones al reiniciar.

El servicio carga PORT, NODE_ENV, DB_PATH y CORS_ORIGIN desde entorno o backend/.env. La plantilla de raíz contiene valores de ejemplo. SQLite local no necesita usuario ni contraseña. El repositorio excluye la configuración local, las bases generadas, los datos de firma y las dependencias instaladas.

La demo escucha en 127.0.0.1:43101 y usa una base distinta. Android debug se conecta por ADB reverse en el teléfono físico y mediante la pasarela del emulador en un AVD. El monitor muestra las solicitudes de viajes etiquetadas por Android. Usar datos ficticios durante la presentación mantiene el contenido proyectado acorde al ensayo.

<!-- pagina -->
## 6. Verificación, conclusión y bibliografía

**Pruebas.** La integración HTTP verifica ambos CRUD, consultas de cambios, entradas inválidas, conflictos de integridad, borrado y persistencia al reiniciar SQLite. La demostración Android confirmó el recorrido CRUD en un emulador y la consulta inicial por Wi-Fi desde un teléfono físico. Se entrega una colección Postman y un guion para el ensayo. La instalación en otro computador queda pendiente de registro.

**Conclusión.** La API aporta dos recursos persistentes con contrato explícito y capas separadas. La demostración muestra un viaje guardado mediante la app y el mantenimiento de una ubicación mediante Postman.

## Bibliografía

- Fielding, R., Nottingham, M., y Reschke, J. (2022). HTTP Semantics (RFC 9110). RFC Editor. https://www.rfc-editor.org/rfc/rfc9110.html
- Node.js. (s. f.). Introduction to Node.js. https://nodejs.org/en/learn/getting-started/introduction-to-nodejs
- Express. (s. f.). Routing. https://expressjs.com/en/guide/routing.html
- SQLite. (s. f.). Appropriate uses for SQLite. https://sqlite.org/whentouse.html
- SQLite. (s. f.). SQLite foreign key support. https://sqlite.org/foreignkeys.html
- Android Developers. (s. f.). Access a local development server from WebView. https://developer.android.com/develop/ui/views/layout/webapps/access-local-server

## Anexos en el repositorio

Contrato HTTP independiente en docs, modelo y scripts en db, colección en backend/postman_collection.json, pruebas en backend/tests y guía de exposición en docs.
