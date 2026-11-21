# Ruta de trabajo · Evidencia para los diez puntos

| Nº | Qué se hizo | Dónde revisarlo y cómo comprobarlo |
| --- | --- | --- |
| 1 | Contrato REST de Viajes y Catálogo con rutas, métodos, parámetros, ejemplos y códigos. Se documentó cómo versionar cambios incompatibles. | Abre [API_CONTRACT.md](API_CONTRACT.md) y compara las rutas con `backend/server.js` y `backend/src/controllers/catalogController.js`. |
| 2 | SQLite con tres tablas, tipos, claves y relaciones. El arranque crea y carga una base nueva. | Revisa [MODELO.md](../db/MODELO.md), `schema.sql` y `seed.sql`. La prueba de integración empieza desde una base temporal vacía. |
| 3 | El ruteo HTTP delega en servicios y las consultas están en el repositorio. | Sigue un POST desde `server.js` al controlador, el servicio y `dbRepository.js`. |
| 4 | Viajes tiene POST, GET, PUT y DELETE. Android usa esas rutas en la demo. | En el teléfono crea un viaje, ábrelo, añade una parada y bórralo. En Postman también puedes ejecutar la carpeta Viajes completa. |
| 5 | La configuración se carga por entorno. SQLite local usa una ruta de archivo. Se excluyen `.env`, bases de datos y llaves de firma. | Abre `.env.example` y `.gitignore`. Comparte la plantilla. |
| 6 | Catálogo tiene POST, GET, PUT y DELETE. Las entradas y conflictos se traducen a 400, 404 o 409. | Ejecuta las carpetas Catálogo y Pedido inválido de Postman. `npm test` comprueba también un conflicto de integridad. |
| 7 | Monolito en capas con criterios de carga, equipo, operación, despliegue y condición de revisión. | Consulta la sección **Decisión de arquitectura** en el informe. Completa el tamaño real del equipo. |
| 8 | Cambios H1 → H2 con motivo e impacto. | Consulta **Trazabilidad** en el informe. Muestra primero el flujo del prototipo y luego el estado persistido por la API. |
| 9 | Colección Postman con recorridos reales y variables para capturar IDs. Monitor para las acciones de Android. | Importa `backend/postman_collection.json`, ejecuta las carpetas en orden y repite la instalación en un segundo computador. El ensayo en otro PC queda por registrar. |
| 10 | Guion cronometrado y preguntas para cada integrante. | Sigue la [guía de exposición](GUIA_PRESENTACION.md). Ensaya con cronómetro y reparte los bloques entre el equipo. |
