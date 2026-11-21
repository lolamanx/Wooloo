# Guía de exposición · Wooloo

## Preparación

Actualiza el servidor desde esta entrega. Si sigue abierto el backend de una sesión anterior, detenlo antes de iniciar el nuevo. Ejecuta `npm run demo`. Abre el monitor Android a la derecha y el duplicado del teléfono a la izquierda. Ten Postman importado con la carpeta **2 · Catálogo** lista. Usa datos ficticios. Antes del cronómetro confirma `GET /api/trips → 200`.

Para volver a abrir el duplicado con scrcpy, usa el ADB del SDK y el identificador que entrega `adb devices`. En el equipo que usa ADB en el puerto 5038, ejecuta lo siguiente en PowerShell. Cambia la ruta de scrcpy y el identificador según el equipo:

```powershell
$env:ADB = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$env:ADB_SERVER_SOCKET = 'tcp:127.0.0.1:5038'
& 'RUTA_A_SCRCPY.EXE' -s 'SERIAL_DEL_TELEFONO' --no-audio --no-control --max-size=1024 --max-fps=30
```

## Siete minutos

| Tiempo | Qué mostrar | Qué decir |
| --- | --- | --- |
| 0:00–0:20 | Teléfono y monitor en la misma pantalla | «Wooloo organiza viajes con paradas. Vamos a demostrar cómo la app guarda un itinerario y lo recupera desde el servidor». |
| 0:20–2:35 | Crea un viaje a Osorno, agrega Chillán, regresa a Mis viajes y abre el mismo viaje, luego bórralo | «POST devuelve 201 y un ID. PUT guarda la parada. GET recupera el mismo ID y muestra Chillán en el JSON. DELETE confirma el borrado con 200». |
| 2:35–3:20 | Ejecuta la carpeta Catálogo de Postman y muestra su resumen | «El segundo recurso también acepta alta, lectura, actualización y baja. El GET final devuelve 404. La colección comprueba el nombre actualizado antes de borrar». |
| 3:20–4:50 | Lámina con Node.js, Express y SQLite | «JavaScript aprovecha el conocimiento del proyecto, con validación explícita. Express organiza las rutas y el manejo de errores, con capas que definimos nosotros. SQLite simplifica la instalación, con escrituras por turnos». |
| 4:50–6:35 | Flujo Android → ruta → controlador → servicio → repositorio → SQLite | «Elegimos un monolito porque el equipo tiene [número real] personas y esperamos carga baja en el laboratorio. Operamos un proceso y una base. Si crecen las escrituras concurrentes o hacen falta despliegues independientes, revisamos esa decisión». |
| 6:35–7:00 | Última respuesta HTTP y cierre | «Mostramos dos recursos persistentes. En Viajes vimos una acción del teléfono y la respuesta real del servidor». |

## Preguntas para cada integrante

- **¿Por qué el servicio valida el destino y la parada?** Cualquier cliente puede enviar JSON. La regla del dominio debe aplicarse en el servicio y la base conserva las referencias con claves foráneas.
- **¿Qué pasa si falla una parada a mitad de una actualización?** El repositorio revierte la transacción. Los cambios del viaje y de sus paradas se confirman juntos.
- **¿Por qué puede fallar un DELETE de Catálogo con 409?** Si la ubicación se usa como destino o parada, SQLite protege la referencia. El servicio traduce ese conflicto a un mensaje HTTP.
- **¿Qué diferencia hay entre 400, 404 y 409?** Entrada inválida, registro o ruta inexistente, y conflicto con el estado guardado, respectivamente.
- **¿Cómo muestra el PC una acción del teléfono?** Android envía HTTP mediante el túnel ADB. Express registra método, ruta, estado y cuerpos de las peticiones de la demo. La pestaña consulta ese historial.
- **¿Qué verificaron en otro computador?** Indiquen el equipo, la versión de Node y qué salió de `npm ci`, `npm test` y `/health`. Si aún falta el ensayo, indiquen el estado real.
