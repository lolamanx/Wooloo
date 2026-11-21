# Wooloo

## Informe técnico del Hito 2

Universidad Mayor · Escuela de Ingeniería Civil  
INGT1003 · Arquitectura de Desarrollo (Móvil y Web)  
Segundo semestre de 2026 · Santiago, Chile

**Francisco Lizama** · GitHub @Kamisama-all  
**Victor Vejar** · GitHub @lolamanx  
**Docente** · Carlos Muñoz S.  
**Fecha** · 21 de noviembre de 2026

<!-- pagina -->
## Índice

1. Introducción y cambios desde el Hito 1 · pág. 2
2. Contrato HTTP y ejemplos · págs. 3–4
3. Modelo de datos y configuración · pág. 5
4. Capas y decisión de arquitectura · pág. 6
5. Verificación, demostración y referencias · pág. 7

## 1. Introducción y cambios desde el Hito 1

Wooloo permite organizar viajes por Chile con un destino y paradas intermedias. El Hito 2 incorpora una API REST con dos recursos, Viajes y Catálogo. El cliente Android en modo de depuración envía al servidor las operaciones de Viajes. El catálogo se administra mediante la API y se demuestra con Postman.

| Aspecto | Hito 1 | Hito 2 y efecto |
| --- | --- | --- |
| Persistencia de viajes | Guardado local en el dispositivo. | SQLite en el servidor permite recuperar el mismo viaje después de cerrar la app o reiniciar el servicio. |
| Catálogo | Lugares predefinidos en la interfaz. | El catálogo se gestiona mediante un segundo CRUD. La pantalla de Android conserva su catálogo incorporado. |
| Arquitectura | Prototipo navegable en el cliente. | Express separa la entrada HTTP, las validaciones del dominio y las consultas SQL. |
| Evidencia | Recorrido en la interfaz. | El monitor muestra las peticiones Android y Postman ejercita el contrato HTTP. |

El mapa y el cálculo de rutas siguen usando los proveedores de la aplicación. La API de Wooloo administra los itinerarios y las ubicaciones del catálogo.

<!-- pagina -->
## 2. Contrato HTTP y ejemplos

<!-- contrato-tabla -->

<!-- pagina -->
## Ejemplos de entrada y de error

<!-- contrato-ejemplos -->

<!-- pagina -->
## 3. Modelo de datos y configuración

| Entidad | Clave y tipos | Relaciones |
| --- | --- | --- |
| catalog_locations | key TEXT como PK. name, icon y description TEXT. lat y lng REAL. | Un lugar puede ser destino o parada en varios viajes. |
| trips | id TEXT como PK. name, dest_key y departure_iso TEXT. created_at y updated_at DATETIME. | dest_key referencia catalog_locations.key. |
| stops | id INTEGER como PK. trip_id y stop_key TEXT. stay_min y sequence_order INTEGER. | trip_id referencia trips.id. stop_key referencia catalog_locations.key. |

Cada viaje tiene un destino y admite hasta diez paradas. El repositorio guarda el viaje y sus paradas en una transacción y revierte la escritura si falla. Borrar un viaje elimina sus paradas en cascada. Borrar una ubicación referenciada devuelve HTTP 409.

El servidor ejecuta schema.sql y carga seed.sql al inicializar la base. La base queda marcada como inicializada, por lo que reiniciar el servicio conserva las eliminaciones posteriores del catálogo.

La configuración usa PORT, NODE_ENV, DB_PATH y CORS_ORIGIN. La plantilla .env.example contiene valores de ejemplo. SQLite necesita una ruta de archivo y no requiere usuario ni contraseña. Los archivos de configuración local, las bases generadas y las llaves de firma quedan fuera de la entrega.

El modo demo escucha en el puerto 43101 del PC y usa una base SQLite separada. En un teléfono físico, el túnel ADB dirige las peticiones al PC. El monitor muestra el método, la ruta, el estado y los cuerpos JSON de las solicitudes de Viajes.

<!-- pagina -->
## 4. Capas y decisión de arquitectura

El cliente llama a Express. El controlador recibe la petición y forma la respuesta HTTP. El servicio aplica las reglas del dominio. El repositorio ejecuta las consultas en SQLite.

**Ejemplo POST /api/trips.** Express recibe el JSON, el controlador llama a tripService y el servicio valida el nombre, la fecha y las referencias del catálogo. dbRepository guarda el viaje y las paradas. El controlador devuelve HTTP 201 con el ID y la cabecera Location. Un GET posterior recupera los datos de la base.

| Tecnología | Justificación y costo |
| --- | --- |
| JavaScript y Node.js | Reutilizan el lenguaje del prototipo. La entrada JSON necesita validación explícita en ejecución. |
| Express | El ruteo y los middleware simplifican el contrato HTTP. El equipo mantiene las fronteras entre las capas. |
| SQLite | Elimina la necesidad de operar un servidor de base de datos separado. Las escrituras concurrentes se coordinan con un solo escritor por base. |

**Decisión.** Francisco y Victor integran un equipo de dos personas. La carga prevista para el laboratorio es baja, con un teléfono y un cliente de pruebas, sin una estimación de capacidad productiva. El monolito reduce el despliegue a un proceso Node y un archivo SQLite. Distribuir el sistema implicaría operar más procesos y coordinar cambios entre servicios. El equipo revisaría SQLite si las escrituras simultáneas se vuelven un cuello de botella y reconsideraría la separación del servicio si un componente necesitara escalar o desplegarse por su cuenta.

<!-- pagina -->
## 5. Verificación, demostración y referencias

Se verificaron ambos CRUD, validación de entradas, conflictos, borrado y persistencia después de reiniciar. La colección incluye 14 solicitudes comprobadas contra HTTP local. El flujo de Android se ensayó en un emulador y se confirmó la consulta inicial desde un teléfono físico por Wi-Fi. Queda por documentar un ensayo de instalación en un segundo computador.

**Demostración.** En Android se crea un viaje a Osorno, se agrega Chillán, se recupera el mismo viaje y se elimina. El monitor permite mostrar cada estado HTTP y el dato persistido. La carpeta Catálogo de Postman crea, consulta, modifica y borra una ubicación ficticia. La explicación de decisiones cierra la exposición.

**Apoyo de IA.** Se usó Codex para apoyar la implementación, las pruebas y la redacción. El equipo revisa el funcionamiento y el contenido antes de la entrega.

**Conclusión.** Wooloo dispone de dos recursos CRUD con un contrato común, persistencia relacional y una demostración que conecta las acciones del teléfono con las respuestas del servidor.

### Referencias

- Fielding, R., Nottingham, M., y Reschke, J. (2022). HTTP Semantics (RFC 9110). https://www.rfc-editor.org/rfc/rfc9110.html
- Node.js. (s. f.). Introduction to Node.js. https://nodejs.org/en/learn/getting-started/introduction-to-nodejs
- Express. (s. f.). Routing. https://expressjs.com/en/guide/routing.html
- SQLite. (s. f.). Appropriate uses for SQLite. https://sqlite.org/whentouse.html
- SQLite. (s. f.). SQLite foreign key support. https://sqlite.org/foreignkeys.html

### Anexos del proyecto

Contrato de la API, colección Postman, modelo relacional, scripts SQL y pruebas de integración.
