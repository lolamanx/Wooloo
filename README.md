# Wooloo · Entrega del Hito 2

Sube el **contenido de esta carpeta** como raíz de la rama principal del repositorio del curso. Verifica que el docente tenga acceso. El informe oficial está en [docs/INFORME_TECNICO_HITO_2.pdf](docs/INFORME_TECNICO_HITO_2.pdf). Su fuente editable está en la misma carpeta.

| Ubicación | Qué contiene |
| --- | --- |
| `backend/` | API en Express, configuración, dependencias fijadas, pruebas y monitor HTTP. |
| `backend/db/` | Scripts SQL que ejecuta el servidor para inicializar SQLite. |
| `db/` | Modelo, esquema y datos iniciales en la ubicación que pide la pauta. |
| `docs/` | Informe PDF, fuente editable, contrato REST y guía de presentación. |
| `backend/postman_collection.json` | Colección con los dos recorridos CRUD y comprobaciones de errores. |
| `.env.example` | Plantilla raíz. El backend lee la copia local `backend/.env`. |
| `app/`, `gradle/` y archivos Gradle de raíz | Proyecto Android para abrir en Android Studio y ejecutar en variante debug. |

## Levantar y probar en Windows

Abre PowerShell en la raíz de esta entrega. Se requiere Node.js con npm. Se comprobó la API con Node.js 26. Para Android se usaron JDK 17 y SDK 35.

```powershell
if (-not (Test-Path .\backend\.env)) { Copy-Item .\.env.example .\backend\.env }
Set-Location .\backend
npm.cmd ci
npm.cmd test
npm.cmd start
```

`npm test` levanta instancias locales propias con puertos dinámicos y una base temporal. Comprueba CRUD, validación, conflicto de integridad y persistencia tras reiniciar. `npm start` escucha en `127.0.0.1:3000` con los valores del ejemplo. En otra ventana, verifica con `Invoke-RestMethod http://127.0.0.1:3000/health`. La base estándar se crea en `backend/db/wooloo.db`.

## Modo exposición

Desde `backend/`, ejecuta `npm.cmd run demo` y abre el [monitor Android](http://127.0.0.1:43101/demo/android.html). Se usa otra base, `backend/db/wooloo-demo.db`.

- **Teléfono físico.** Selecciónalo en Android Studio y ejecuta la variante debug. Con el ADB del SDK, aplica `adb -s SERIAL reverse tcp:43101 tcp:43101`. Sustituye SERIAL por el valor de `adb devices`. Si vinculaste mediante el servidor alternativo del PC, añade `-P 5038` después de `adb` en ambos comandos. Mantén abierto el duplicado del teléfono para proyectarlo.
- **Emulador.** Ejecuta la variante debug con un AVD. La aplicación apunta a `10.0.2.2:43101`.
- **Comprobación.** Cuando Wooloo abra, el monitor debe mostrar `GET /api/trips → 200`. Para probar Catálogo o repetir el recorrido de Viajes, importa la colección en Postman. Para `npm start`, cambia `baseUrl` a `http://127.0.0.1:3000`.

Consulta la [guía de siete minutos](docs/GUIA_PRESENTACION.md) para saber qué decir y qué mostrar en cada paso.
