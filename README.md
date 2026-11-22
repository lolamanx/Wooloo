# Wooloo · Hito 3

Wooloo permite planificar viajes por Chile con un destino y paradas. La versión evaluada usa Android **debug**, una API Express y SQLite. El flujo principal consiste en guardar un viaje a Osorno, añadir Chillán, cerrar la aplicación y recuperar el mismo itinerario al abrirla de nuevo.

**Equipo:** Francisco Lizama (@Kamisama-all) y Victor Vejar (@lolamanx). Universidad Mayor · INGT1003.

## Ejecutar la demo

En el portable de Windows, extrae todo el ZIP, conecta y desbloquea el teléfono y ejecuta `WOOLOO-DEMO.cmd`. El iniciador prepara el servidor, establece el túnel de ADB, abre el APK incluido y duplica la pantalla con scrcpy. El monitor está en [127.0.0.1:43101/demo/android.html](http://127.0.0.1:43101/demo/android.html).

Si instalas desde el código del repositorio, usa Android Studio con la variante debug. Desde `backend/`, ejecuta `npm ci`, `npm test` y `npm run demo`. El [manual de uso e instalación](docs/MANUAL-USO-INSTALACION.md) explica los requisitos, el túnel ADB y la configuración de ejemplo.

## Recorrido de revisión

1. Crea **Viaje Hito 3** con destino **Osorno** y fecha válida.
2. Agrega **Chillán** como parada. Cierra Wooloo y vuelve a abrir la app.
3. Abre el mismo viaje y comprueba que conserva Chillán.
4. Para ensayar un corte durante el guardado, usa la [guía de grabación](GRABAR-PRUEBA-HITO-3.txt). El formulario conserva los datos y permite reintentar después de recuperar la conexión.

## Pruebas automatizadas

- En `backend/`, ejecuta `npm.cmd ci` y `npm.cmd test` para probar CRUD, errores y persistencia en SQLite.
- En la raíz, ejecuta `npm.cmd ci`, `npx.cmd playwright install chromium` y `npm.cmd run test:trip-list` para probar los estados de Mis viajes y el reintento del formulario con el puente Android simulado.

## Documentación

- [Informe final en PDF](docs/INFORME-FINAL-HITO-3.pdf)
- [Manual de uso e instalación](docs/MANUAL-USO-INSTALACION.md)
- [Diagramas de arquitectura](docs/ARQUITECTURA-HITO-3.md)
- [Bitácora de decisiones](docs/BITACORA-HITO-3.md)
- [Registro de pruebas](REGISTRO-PRUEBA-WINDOWS-11.txt)

El APK de depuración está destinado a la demo local. El modo release conserva el almacenamiento local de los viajes.

## Video promocional

[Ver Video Publicitario Wooloo en YouTube](https://www.youtube.com/watch?v=tJAr1DkLYg4).

Las pruebas de recuperación se incluyen como evidencia complementaria en el [anexo técnico](docs/anexos/ANEXO-TECNICO-FALLOS-Y-SOLUCIONES.txt) y su [video de 27 segundos](docs/anexos/Wooloo-Anexo-Fallos-y-Soluciones.mp4).
