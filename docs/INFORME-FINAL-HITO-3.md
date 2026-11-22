# Wooloo

## Informe final del Hito 3

Universidad Mayor · Escuela de Ingeniería Civil
INGT1003 · Arquitectura de Desarrollo (Móvil y Web)
Segundo semestre de 2026 · Santiago, Chile

**Francisco Lizama** · GitHub @Kamisama-all
**Victor Vejar** · GitHub @lolamanx
**Docente** · Carlos Muñoz S.
**Fecha** · 22 de noviembre de 2026

<!-- pagina -->
## Índice

| Sección | Página |
| --- | --- |
| 1. Introducción y evolución del producto | 2 |
| 2. Arquitectura e integración | 3 |
| 3. Decisiones, fallas y cambios | 4 |
| 4. Verificación y ejecución reproducible | 5 |
| 5. Anexos: IA y datos personales | 6 |
| 6. Conclusión, limitaciones y bibliografía | 7 |

## 1. Introducción y evolución del producto

Wooloo permite organizar itinerarios por Chile con destino, fecha de salida y paradas. El flujo principal evaluable fue **crear un viaje a Osorno, agregar Chillán como parada, cerrar la app y recuperar el itinerario** al abrirla de nuevo.

| Hito | Qué se construyó | Qué cambió en el resultado |
| --- | --- | --- |
| Hito 1 | Prototipo navegable y viajes guardados en el dispositivo. | Se exploró el flujo de planificación desde el teléfono. |
| Hito 2 | API REST de Viajes y Catálogo, con Node, Express y SQLite. Se integró la variante Android de demostración y su monitor HTTP. | Una acción en Android envía una solicitud al servicio y el dato puede recuperarse desde SQLite. |
| Hito 3 | Carga asíncrona de Mis viajes, estados de carga, vacío y error, botón Reintentar y guardado asíncrono con validación y conservación del formulario. | El usuario puede distinguir una lista vacía de un corte, restaurar la conexión y guardar sin reingresar el viaje. |

**Alcance final.** Viajes se recorre desde la app. El mantenimiento del Catálogo sigue disponible mediante la API y se puede verificar con Postman. La variante evaluada es Android debug con el servidor local del portable.

<!-- pagina -->
## 2. Arquitectura e integración

La demostración se montó como un monolito por capas en el PC. La vista Android prepara los datos de entrada. El puente de depuración transporta las solicitudes al servicio. Express recibe el HTTP, los servicios validan y el repositorio lee o escribe SQLite.

<!-- diagrama -->

| Capa | Implementación | Responsabilidad |
| --- | --- | --- |
| Presentación | Pantallas Mis viajes, formulario y paradas. | Conserva el borrador, informa el estado de la solicitud y muestra lo guardado. |
| Integración Android | Repositorio local de la interfaz y puente Android debug. | Normaliza el viaje y gestiona las solicitudes asíncronas de lista y creación. |
| Ruteo y negocio | Controladores Express y servicios de Viajes y Catálogo. | Interpreta HTTP, valida datos y referencias, y traduce resultados a estados HTTP. |
| Persistencia | Repositorio, esquema SQLite y datos iniciales. | Consulta los registros y escribe el viaje y sus paradas como una unidad. |
| Observación | Monitor en el navegador del PC. | Muestra peticiones de la demo y sus respuestas para explicar el ciclo del dato. |

La API escucha en 127.0.0.1:43101 en modo demo. El teléfono físico usa ADB reverse y el emulador usa 10.0.2.2. Los mapas y el cálculo vial usan OpenStreetMap y OSRM, respectivamente. El diagrama editable y la secuencia se incluyen en ARQUITECTURA-HITO-3.md.

<!-- pagina -->
## 3. Decisiones, fallas y cambios

| Fecha / etapa | Decisión | Razón y resultado |
| --- | --- | --- |
| Hito 1 | Prototipo con estado local. | Permitió iterar el flujo y los campos antes de integrar el servidor. |
| 21 nov. 2026 | Monolito Express con SQLite. | Frente a un despliegue con varios servicios y un motor aparte, redujo la instalación y operación para un equipo de dos personas. |
| 21–22 nov. 2026 | Demo Android debug conectada al servidor del PC. | Se usó el teléfono físico con ADB y scrcpy ante el parpadeo del emulador. Se conservó el modo local de release. |
| 22 nov. 2026 | Carga asíncrona de viajes y reintento. | Se separó el estado vacío de un error de conexión y se evitó reiniciar la aplicación para recuperar la lista. |
| 22 nov. 2026 | Guardado asíncrono con borrador e ID reutilizado. | Una interrupción al guardar conserva los campos. El mismo ID permite confirmar un envío previo en caso de conflicto con los mismos datos. |

**Falla observada.** Una pérdida de conexión durante el guardado podía obligar a interpretar un mensaje genérico. Se agregó validación de nombre, destino y fecha en la interfaz, un aviso de guardado y un mensaje que permite reintentar conservando los campos. Express valida los datos de forma independiente.

**Condición para revisar la arquitectura.** Se mantiene el monolito para una carga baja de laboratorio. Una necesidad de operación multiusuario, despliegue público o escrituras simultáneas sostenidas justificaría revisar autenticación, motor de datos y estrategia de despliegue.

La bitácora editable, con las alternativas y los límites de cada decisión, se encuentra en BITACORA-HITO-3.md.

<!-- pagina -->
## 4. Verificación y ejecución reproducible

| Evidencia | Resultado | Alcance |
| --- | --- | --- |
| Regresión automatizada | 35 pruebas de las funciones existentes y 2 pruebas nuevas de interfaz aprobadas. | Las pruebas de interfaz en Chromium simularon el puente Android y comprobaron estados, reintento y conservación del borrador. |
| APK debug | Compilación exitosa con Gradle. | La variante debug incluye la conexión al backend de la demo. |
| Recorrido en Samsung | Se reportó que el viaje con Chillán se conservó al reabrir Wooloo. El monitor registró la consulta inicial con GET 200. | Prueba móvil en el entorno habitual de Windows 11. |
| Corte al guardar | Se retiró temporalmente el túnel ADB. Se conservaron nombre, destino y fecha. Al restaurarlo, el monitor registró POST 201. | Comprobación en el Samsung con un viaje ficticio, retirado al terminar. |
| Segundo computador | Instalación reportada como exitosa. Windows 11 Pro, compilación 26200 y Node.js v26.13.0. | Evidencia informada por el integrante. El recorrido del teléfono se comprobó en el equipo habitual. |

**Recorrido para evaluación.** Ejecutar el iniciador, abrir Wooloo, crear Viaje Hito 3 con destino Osorno, agregar Chillán, cerrar la app, volver a abrirla y comprobar la parada desde Mis viajes. El manual incluye el procedimiento para recuperar el túnel y repetir la consulta.

**Material audiovisual.** El anuncio de Wooloo se enlaza desde el README y dura 2:00 según YouTube. Las dos grabaciones de prueba se editaron por separado como evidencia de recuperación ante fallos. El anexo documenta por qué el cambio de paradas y la recarga de Mis viajes se revisaron en ensayos distintos.

<!-- pagina -->
## 5. Anexos: IA y datos personales

### Uso de inteligencia artificial

Se usó Codex como apoyo para el código, las pruebas automatizadas, los iniciadores, el diagnóstico de ADB y la revisión de documentación. Se verificaron los cambios con lectura del código, compilación Android, pruebas HTTP y de interfaz, y comprobaciones en el Samsung. Los resultados del segundo equipo se registraron como datos informados por el integrante. Se mantuvo la distinción entre pruebas simuladas y pruebas en el dispositivo.

### Inventario de datos y finalidad

| Dato | Finalidad y tratamiento | Medida aplicada o límite |
| --- | --- | --- |
| Nombre del viaje, fecha, destino y paradas | SQLite conserva el itinerario y sus referencias al catálogo para mostrarlo al reabrir la app. El nombre de texto libre podría incluir información identificable. | El backend valida el formato y permite borrar el viaje junto con sus paradas. Para la exposición se usaron nombres ficticios. |
| Ubicación durante la navegación | El dispositivo usa la posición cuando se solicita ubicación. El cálculo de ruta puede enviar puntos a OSRM. | La persistencia de viajes usa referencias del catálogo y el origen de sesión. El esquema SQLite de la API carece de campos GPS para viajes. |
| Datos del monitor | Las solicitudes y respuestas de Viajes se mantienen en un historial de hasta 30 intercambios en memoria. | El monitor opera con el servidor local en modo demo. Durante la proyección se emplean datos de prueba. |
| Solicitudes de mapa y ruta | OpenStreetMap entrega teselas y OSRM calcula rutas. | Son servicios externos. La retención y el tratamiento que realicen esos proveedores quedan fuera de esta evaluación. |

El modo demo está destinado al laboratorio y usa una base separada. Antes de publicar el servicio sería necesario definir autenticación, control de acceso, tratamiento de datos, retención y configuración de despliegue.

<!-- pagina -->
## 6. Conclusión, limitaciones y bibliografía

Wooloo integró la interfaz Android con una API real y persistió el itinerario en SQLite. La app distinguió entre carga, vacío y fallo de conexión. La prueba en el Samsung mostró que el formulario conservó los campos durante un corte y que el reintento guardó el viaje al recuperar el túnel.

### Limitaciones de la versión entregada

- La variante demostrada usa Android debug, ADB y un servidor local. Release conserva almacenamiento local.
- La API de demostración está acotada a la interfaz local y carece de autenticación para un despliegue multiusuario.
- El mapa y el cálculo vial dependen de proveedores externos y conexión. La prueba principal de persistencia de viajes usa el backend local.
- El segundo equipo acreditó instalación por reporte del integrante. Se conservó por separado la evidencia técnica del Samsung.

### Bibliografía

- Fielding, R., Nottingham, M., y Reschke, J. (2022). HTTP Semantics (RFC 9110). https://www.rfc-editor.org/rfc/rfc9110.html
- Express. (s. f.). Routing. https://expressjs.com/en/guide/routing.html
- SQLite. (s. f.). SQLite foreign key support. https://sqlite.org/foreignkeys.html
- Android Developers. (s. f.). Access a local development server from WebView. https://developer.android.com/develop/ui/views/layout/webapps/access-local-server

### Archivos complementarios

MANUAL-USO-INSTALACION.md, ARQUITECTURA-HITO-3.md, BITACORA-HITO-3.md, REGISTRO-PRUEBA-WINDOWS-11.txt y GRABAR-PRUEBA-HITO-3.txt.
