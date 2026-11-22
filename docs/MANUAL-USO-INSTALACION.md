# Wooloo · Manual de uso e instalación · Hito 3

**Universidad Mayor · INGT1003 · Francisco Lizama y Victor Vejar**

Este manual usa la versión Android `debug` del Hito 3 y el backend local del portable. El recorrido principal es guardar un viaje, agregar una parada y encontrarla al reabrir la aplicación.

## 1. Preparar el equipo

- PC con Windows y Node.js 22 o superior con npm. Se usó Windows 11 Pro con Node.js v26.13.0 en la instalación reportada del segundo equipo.
- Android con depuración USB habilitada o depuración inalámbrica vinculada. Para la conexión por Wi-Fi, el teléfono y el PC deben poder comunicarse en la misma red.
- Android SDK Platform-Tools para ADB, cable de datos si se usa USB e internet durante la primera instalación de dependencias.
- El portable incorpora el APK evaluado y scrcpy para Windows x64. Para editar y recompilar el Android desde el repositorio, usa Android Studio, JDK 17 y SDK 35.

## 2. Instalar y abrir Wooloo desde el portable

1. Extrae **todo el ZIP del Hito 3**. Conecta y desbloquea el teléfono. Si Android pide autorizar el equipo, acepta la confirmación.
2. Ejecuta `WOOLOO-DEMO.cmd`. Si detecta que falta Node.js o ADB, ofrece instalarlos con WinGet. El iniciador instala las dependencias del backend cuando es necesario, inicia o reutiliza el servidor, establece el túnel hacia el puerto 43101 e instala el APK incluido si corresponde.
3. Abre el [monitor HTTP](http://127.0.0.1:43101/demo/android.html). La ventana **Wooloo-Android** duplica el teléfono. Usa el teléfono para operar la app.
4. Comprueba que al abrir Wooloo aparece `GET /api/trips` con **200** en el monitor. La [ruta de salud](http://127.0.0.1:43101/health) permite verificar el backend por separado.

### Alternativa desde el código del repositorio

Desde la raíz, en PowerShell:

```powershell
if (-not (Test-Path .\backend\.env)) { Copy-Item .\.env.example .\backend\.env }
Set-Location .\backend
npm.cmd ci
npm.cmd test
npm.cmd run demo
```

Selecciona la variante **debug** en Android Studio. Para un teléfono físico, selecciona su identificador con ADB y establece el túnel antes de abrir Wooloo:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices
& $adb -s "IDENTIFICADOR_DEL_TELEFONO" reverse tcp:43101 tcp:43101
```

Sustituye el identificador por el de la primera columna. Si tu servidor ADB usa el puerto 5038, agrega `-P 5038` después de `$adb`. El emulador Android usa la pasarela `10.0.2.2:43101`. La variante release conserva el guardado local.

## 3. Datos de prueba y recorrido autónomo

La API local de la demo se usa sin cuenta. Usa un nombre ficticio, **Viaje Hito 3**, con **Osorno** como destino y una fecha válida.

| Acción | Resultado que debe ver el evaluador |
| --- | --- |
| Pulsa **+**, ingresa el viaje y pulsa **Guardar y continuar**. | La app muestra el guardado mientras espera al servidor y luego permite configurar paradas. En el monitor aparece POST 201. |
| Agrega **Chillán** como parada. | Chillán aparece en el viaje. En el monitor se observa PUT 200. |
| Cierra Wooloo desde Aplicaciones recientes y vuelve a abrirlo. | Mis viajes consulta al servidor y muestra el mismo viaje. |
| Abre el viaje y revisa sus paradas. | Chillán sigue visible. El monitor muestra GET 200. |
| Al terminar, borra únicamente el viaje de prueba desde Mis viajes. | El viaje desaparece y la API responde DELETE 200. |

Para revisar la recuperación, sigue [la guía de grabación](../GRABAR-PRUEBA-HITO-3.txt). El comando **Cortar** interrumpe solo el acceso de Wooloo al backend. **Restaurar** recupera el túnel para pulsar **Reintentar** en Mis viajes o **Guardar y continuar** en el mismo formulario.

## 4. Tres fallas frecuentes

| Síntoma | Solución |
| --- | --- |
| El iniciador indica que falta Node.js o ADB. | Acepta la instalación ofrecida. Si WinGet falla, instala Node.js con npm y Platform-Tools desde sus fuentes oficiales, abre una terminal nueva y ejecuta de nuevo el iniciador. |
| La app muestra «No pudimos cargar tus viajes». | Comprueba `/health`, que el teléfono figure como `device` y que el túnel 43101 esté activo. Ejecuta nuevamente el iniciador o restaura el túnel con el comando anterior. Después pulsa **Reintentar**. |
| Android informa que el APK tiene una firma incompatible. | Si la copia instalada fue firmada con otra clave, una actualización compatible requiere esa misma clave. La instalación limpia de la demo es otra opción, previa confirmación del propietario del teléfono porque desinstalar elimina los datos locales de la app. |

Si el puerto ya tiene una instancia compatible, el iniciador la reutiliza. Si lo ocupa otro programa, libera el puerto o pide ayuda a quien administra el PC antes de continuar.
