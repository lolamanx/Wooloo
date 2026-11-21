# Wooloo

Wooloo es una aplicación Android para planificar viajes por Chile con un destino y paradas intermedias. En la demo del **Hito 2 de INGT1003**, puedes operar la app desde un teléfono y ver en el PC las solicitudes HTTP que recibe el servidor.

**Universidad Mayor · Arquitectura de Desarrollo · Segundo semestre de 2026**

## Qué incluye

- **Android** con Java y WebView para planificar viajes.
- **API REST** con Node.js, Express y SQLite. Los recursos **Viajes** y **Catálogo** permiten crear, consultar, modificar y borrar registros.
- **Monitor HTTP** para mostrar el método, la ruta, el estado y el JSON de las operaciones de Viajes desde Android. La administración de Catálogo se demuestra con Postman.

## Levantar el backend

Necesitas Node.js con npm. Abre PowerShell en la raíz del repositorio y ejecuta:

```powershell
if (-not (Test-Path .\backend\.env)) {
    Copy-Item .\.env.example .\backend\.env
}
Set-Location .\backend
npm.cmd ci
npm.cmd test
npm.cmd start
```

El servidor queda escuchando en `127.0.0.1:3000` con la configuración de ejemplo. En otra ventana, comprueba el arranque:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
```

El backend crea la base SQLite al iniciar. Las pruebas usan una base temporal y verifican los dos recursos CRUD, el manejo de errores y la persistencia después de reiniciar el servicio.

## Demo en vivo

1. Desde `backend/`, ejecuta `npm.cmd run demo` y deja el servidor abierto. La demo usa el puerto **43101** y la base separada `backend/db/wooloo-demo.db`.
2. Abre el [monitor HTTP](http://127.0.0.1:43101/demo/android.html) en el navegador del PC.
3. Abre la raíz del repositorio en **Android Studio** con **JDK 17 y SDK 35**. Selecciona la variante **debug**. Si usas el emulador, pulsa **Run**. Para un teléfono físico, configura el túnel ADB antes de ejecutar la app.
4. Confirma que el monitor muestre `GET /api/trips → 200` al abrir Wooloo. Crea un viaje a Osorno, agrega Chillán, vuelve a abrirlo para mostrar la parada guardada y bórralo.

### Teléfono físico por USB o Wi-Fi

Conecta el teléfono mediante depuración USB o vincúlalo mediante depuración inalámbrica. En PowerShell, usa el ADB del SDK:

```powershell
$adbSdk = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adbSdk devices
& $adbSdk -s "SERIAL_DEL_TELEFONO" reverse tcp:43101 tcp:43101
```

Usa el identificador que aparece en `devices` en lugar de `SERIAL_DEL_TELEFONO`. Si vinculaste el teléfono con un servidor ADB en el puerto alternativo 5038, añade `-P 5038` después de `$adbSdk` en ambos comandos. Selecciona el teléfono en Android Studio y pulsa **Run**. Para proyectar, ubica la pantalla duplicada del teléfono junto al monitor HTTP.

### Postman

Importa la [colección de pruebas](backend/postman_collection.json) y ejecuta las peticiones de cada carpeta en orden. **Viajes** guarda el ID creado y **Catálogo** reutiliza la clave de la ubicación de prueba. La colección apunta al puerto **43101**. Si estás usando `npm start`, cambia `baseUrl` a `http://127.0.0.1:3000`.

## Arquitectura y documentación

Wooloo usa un monolito en capas. Express recibe las peticiones, los controladores forman las respuestas HTTP, los servicios validan las reglas del dominio y el repositorio ejecuta las consultas en SQLite.

| Documento | Contenido |
| --- | --- |
| [Informe técnico del Hito 2](docs/INFORME_TECNICO_HITO_2.pdf) | Trazabilidad con el Hito 1, contrato, persistencia y decisión de arquitectura. |
| [Contrato REST](docs/API_CONTRACT.md) | Rutas, parámetros, ejemplos JSON y códigos de respuesta. |
| [Modelo relacional](db/MODELO.md) | Entidades, claves, relaciones y scripts de inicialización. |
| [Guion de presentación](docs/GUIA_PRESENTACION.md) | Recorrido de la demo y preguntas de defensa. |
| [Trazabilidad de los diez puntos](docs/TRAZABILIDAD_10_PUNTOS.md) | Evidencia de los requisitos de la pauta. |

## Integrantes

- **Francisco Lizama** · [@Kamisama-all](https://github.com/Kamisama-all)
- **Victor Vejar** · [@lolamanx](https://github.com/lolamanx)
