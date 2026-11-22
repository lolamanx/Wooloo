@echo off
setlocal
set "WOOLOO_DEMO_LAUNCHER=%~f0"
powershell.exe -NoProfile -Command "$p=$env:WOOLOO_DEMO_LAUNCHER; $s=[IO.File]::ReadAllText($p); $m=[regex]::Match($s,'(?m)^# WOOLoo PowerShell\r?$'); & ([ScriptBlock]::Create($s.Substring($m.Index))) (Split-Path -LiteralPath $p)"
set "WOOLOO_EXIT=%ERRORLEVEL%"
pause
exit /b %WOOLOO_EXIT%
# WOOLoo PowerShell
param([string]$Root)
$ErrorActionPreference = 'Stop'
$Base = 'http://127.0.0.1:43101'

function Install-Dependency([string]$Name, [string]$PackageId, [string]$ManualUrl) {
    $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
    if (-not $winget) {
        throw "No se encontro WinGet. Instala $Name desde $ManualUrl y vuelve a ejecutar el CMD."
    }
    Write-Host "Hace falta $Name. WinGet puede instalar el paquete $PackageId."
    $choice = Read-Host 'Instalar ahora con WinGet? [S/N]'
    if ($choice -notmatch '^(s|si)$') {
        throw "Instala $Name desde $ManualUrl y vuelve a ejecutar el CMD."
    }
    & $winget.Source install --id $PackageId --exact --source winget
    if ($LASTEXITCODE -ne 0) {
        throw "WinGet no pudo instalar $Name (codigo $LASTEXITCODE). Descarga manual: $ManualUrl"
    }
    $machinePath = [Environment]::GetEnvironmentVariable('Path','Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path','User')
    $env:Path = "$env:Path;$machinePath;$userPath;$env:LOCALAPPDATA\Microsoft\WinGet\Links"
}

function Find-Node {
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    $paths = @($node.Source, "$env:ProgramFiles\nodejs\node.exe") | Where-Object { $_ }
    foreach ($path in $paths) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { continue }
        $npm = Join-Path (Split-Path -LiteralPath $path) 'npm.cmd'
        if (-not (Test-Path -LiteralPath $npm -PathType Leaf)) { continue }
        $version = & $path --version
        if ($version -match '^v(\d+)' -and [int]$Matches[1] -ge 22) {
            $env:Path = "$(Split-Path -LiteralPath $path);$env:Path"
            return @{ Node = $path; Npm = $npm; Version = $version }
        }
    }
}

function Test-Monitor {
    try {
        $health = Invoke-RestMethod "$Base/health" -TimeoutSec 2
        $page = Invoke-WebRequest "$Base/demo/android.html" -UseBasicParsing -TimeoutSec 2
        return ($health.status -eq 'OK' -and $health.service -eq 'Wooloo Backend API' -and
                $page.Content -match 'Monitor de solicitudes')
    } catch { return $false }
}

function Start-Demo($Runtime) {
    if (Test-Monitor) {
        Write-Host 'Servidor Wooloo ya activo.'
        return
    }
    $backend = Join-Path $Root 'backend'
    if (-not (Test-Path -LiteralPath (Join-Path $backend 'demo/start.js'))) {
        throw 'Extrae el ZIP completo. Falta backend/demo/start.js.'
    }
    $node = $Runtime.Node
    Push-Location -LiteralPath $backend
    try {
        $probe = "for (const name of ['express','cors','dotenv','sqlite3']) require(name)"
        $ErrorActionPreference = 'Continue'
        & $node -e $probe 2>$null
        $probeExit = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'
        if ($probeExit -ne 0) {
            Write-Host 'Instalando dependencias del backend...'
            & $Runtime.Npm ci --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw 'Fallo npm ci. Si SQLite esta en uso, cierra el servidor anterior.' }
            & $node -e $probe
            if ($LASTEXITCODE -ne 0) { throw 'La instalacion de las dependencias quedo incompleta.' }
        }
        $env:PORT = '43101'
        $log = Join-Path $backend 'wooloo-demo.log'
        $errorLog = Join-Path $backend 'wooloo-demo-error.log'
        $server = Start-Process -FilePath $node -ArgumentList 'demo/start.js' -WorkingDirectory $backend -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $errorLog -PassThru
        for ($attempt = 0; $attempt -lt 20; $attempt++) {
            if (Test-Monitor) { Write-Host "Servidor Wooloo activo (PID $($server.Id))."; return }
            $server.Refresh()
            if ($server.HasExited) {
                Get-Content -LiteralPath $errorLog -Tail 8
                throw 'El servidor no arranco. Comprueba que el puerto 43101 este libre.'
            }
            Start-Sleep -Milliseconds 500
        }
        throw "El monitor no respondio. Revisa $log y $errorLog."
    } finally { Pop-Location }
}

function Find-Adb {
    $paths = @()
    foreach ($sdk in @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, "$env:LOCALAPPDATA\Android\Sdk")) {
        if ($sdk) { $paths += Join-Path $sdk 'platform-tools\adb.exe' }
    }
    $paths += "$env:LOCALAPPDATA\Microsoft\WinGet\Links\adb.exe"
    $command = Get-Command adb.exe -ErrorAction SilentlyContinue
    if ($command) { $paths += $command.Source }
    foreach ($path in $paths) {
        if ((Test-Path -LiteralPath $path -PathType Leaf) -and
            ((& $path version) -join ' ') -match 'Android Debug Bridge version 1\.0\.(\d+)' -and
            [int]$Matches[1] -ge 41) { return $path }
    }
}

function Get-Phones([string]$Adb) {
    $ErrorActionPreference = 'Continue'
    $ports = if ($env:WOOLOO_ADB_PORT) { @([int]$env:WOOLOO_ADB_PORT) } else { @(5038, 5037) }
    foreach ($port in $ports) {
        $found = @(foreach ($line in (& $Adb -P $port devices 2>$null)) {
            if ($line -match '^((?!emulator-)\S+)\s+device\s*$') {
                [pscustomobject]@{ Serial = $Matches[1]; Port = $port }
            }
        })
        if ($found.Count) { return $found }
    }
}

function Get-Sha256([string]$Path) {
    $sha = [Security.Cryptography.SHA256]::Create()
    $stream = [IO.File]::OpenRead($Path)
    try { return [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '') }
    finally { $stream.Dispose(); $sha.Dispose() }
}

function Install-Wooloo([string]$Adb, $Phone) {
    $apk = Join-Path $Root 'android\Wooloo-debug.apk'
    if (-not (Test-Path -LiteralPath $apk -PathType Leaf)) {
        throw 'Falta android/Wooloo-debug.apk. Extrae el ZIP completo de Wooloo.'
    }
    $target = @('-P', "$($Phone.Port)", '-s', $Phone.Serial)
    $ErrorActionPreference = 'Continue'
    $remotePath = & $Adb @target shell pm path cl.rutaviajera.app 2>$null |
        Where-Object { $_ -match '^package:/[A-Za-z0-9_./+=~-]+/base\.apk$' } |
        Select-Object -First 1
    if ($remotePath) {
        $digest = & $Adb @target shell sha256sum $remotePath.Substring(8) 2>$null
        if ($LASTEXITCODE -eq 0 -and $digest -match '^([0-9a-fA-F]{64})\s' -and
            $Matches[1] -eq (Get-Sha256 $apk)) {
            Write-Host 'El telefono ya tiene exactamente el APK de este ZIP.'
            return
        }
    }
    Write-Host 'Instalando o actualizando el APK de Wooloo incluido en el ZIP...'
    $installation = & $Adb @target install -r $apk 2>&1
    if ($LASTEXITCODE -ne 0 -or ($installation -join ' ') -notmatch '\bSuccess\b') {
        $message = $installation -join ' '
        if ($message -match 'INSTALL_FAILED_UPDATE_INCOMPATIBLE') {
            throw 'El telefono tiene un Wooloo firmado con otra clave. Android require desinstalar esa copia antes de instalar el APK de la demo. Desinstalar borra sus datos locales.'
        }
        throw "ADB no pudo instalar Wooloo: $message"
    }
    Write-Host 'APK de Wooloo instalado.'
}

function Open-Wooloo([string]$Adb, $Phone) {
    $initial = @((Invoke-RestMethod "$Base/demo/android-requests" -TimeoutSec 3) |
        ForEach-Object { $_.id })
    & $Adb -P $Phone.Port -s $Phone.Serial shell am start -S -n 'cl.rutaviajera.app/.MainActivity' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'ADB no pudo abrir la aplicacion. Desbloquea el telefono y abre Wooloo.' }
    for ($attempt = 0; $attempt -lt 12; $attempt++) {
        $received = (Invoke-RestMethod "$Base/demo/android-requests" -TimeoutSec 3) |
            Where-Object { $_.id -notin $initial -and $_.method -eq 'GET' -and
                $_.route -eq '/api/trips' -and $_.status -eq 200 } | Select-Object -First 1
        if ($received) {
            Write-Host 'Wooloo abierto. El monitor recibio GET /api/trips con HTTP 200.'
            return
        }
        Start-Sleep -Milliseconds 500
    }
    Write-Host 'Todavia no llego la consulta inicial. Desbloquea el telefono y vuelve a abrir Wooloo.' -ForegroundColor Yellow
}

function Show-Phone([string]$Adb, $Phone) {
    $title = 'Wooloo-Android'
    $existing = Get-Process scrcpy -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowTitle -eq $title }
    if ($existing) {
        Write-Host "La ventana $title ya esta abierta."
        return
    }
    $tools = Join-Path $Root 'herramientas'
    $archive = Join-Path $tools 'scrcpy-win64-v5.0.1.zip'
    $exe = Join-Path $tools 'scrcpy-win64-v5.0.1\scrcpy.exe'
    if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) {
        if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) {
            throw 'Falta scrcpy. Extrae el ZIP completo de Wooloo.'
        }
        $expected = 'B12A2C4EE8BE317422451FC7DCF8EE20A71B5EA7EF9AD73DDD825A25316227A5'
        $actual = Get-Sha256 $archive
        if ($actual -ne $expected) {
            throw 'El ZIP de scrcpy no coincide con el archivo oficial.'
        }
        Write-Host 'Preparando scrcpy para mostrar el telefono...'
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [IO.Compression.ZipFile]::ExtractToDirectory($archive, $tools)
    }
    $env:ADB = $Adb
    $env:ADB_SERVER_SOCKET = "tcp:127.0.0.1:$($Phone.Port)"
    $env:ANDROID_ADB_SERVER_PORT = [string]$Phone.Port
    $log = Join-Path $tools 'scrcpy-error.log'
    $process = Start-Process -FilePath $exe -WorkingDirectory (Split-Path -LiteralPath $exe) `
        -ArgumentList '-s',$Phone.Serial,'--no-control','--no-audio','--max-size=1024','--max-fps=30',"--window-title=$title" `
        -RedirectStandardError $log -PassThru
    for ($attempt = 0; $attempt -lt 24; $attempt++) {
        $process.Refresh()
        if ($process.HasExited) {
            Get-Content -LiteralPath $log -Tail 8
            throw 'scrcpy se cerro antes de mostrar la pantalla.'
        }
        if ($process.MainWindowTitle -eq $title) {
            Write-Host "Pantalla del telefono visible en $title."
            return
        }
        Start-Sleep -Milliseconds 250
    }
    Write-Host "scrcpy sigue iniciando. Busca la ventana $title."
}

try {
    $runtime = Find-Node
    if (-not $runtime) {
        Install-Dependency 'Node.js LTS con npm' 'OpenJS.NodeJS.LTS' 'https://nodejs.org/en/download'
        $runtime = Find-Node
        if (-not $runtime) { throw 'No se encontro Node.js 22 o superior con npm. Cierra y vuelve a abrir el CMD tras instalarlo.' }
    }
    Write-Host "Node.js $($runtime.Version) y npm disponibles."
    Start-Demo $runtime
    $adb = Find-Adb
    if (-not $adb) {
        Install-Dependency 'Android SDK Platform-Tools' 'Google.PlatformTools' 'https://developer.android.com/tools/releases/platform-tools'
        $adb = Find-Adb
        if (-not $adb) { throw 'ADB aun no aparece. Cierra y vuelve a abrir el CMD tras instalar Platform-Tools.' }
    }
    Write-Host "ADB disponible en $adb"
    $phones = @(Get-Phones $adb)
    if ($phones.Count -eq 0) {
        Write-Host ''
        Write-Host 'USB: activa Depuracion USB, conecta el cable y acepta el aviso del telefono.'
        Write-Host 'Wi-Fi: activa Depuracion inalambrica y vincula el telefono desde Android Studio.'
        [void](Read-Host 'Pulsa Enter cuando el telefono figure conectado para volver a buscar')
        $phones = @(Get-Phones $adb)
    }
    if ($phones.Count -eq 0) { throw 'ADB aun no ve un telefono autorizado.' }
    $phone = $phones[0]
    if ($phones.Count -gt 1) {
        for ($i = 0; $i -lt $phones.Count; $i++) {
            Write-Host ("{0}. {1} (ADB {2})" -f ($i + 1),$phones[$i].Serial,$phones[$i].Port)
        }
        $selected = 0
        if (-not [int]::TryParse((Read-Host 'Elige el numero del telefono'),[ref]$selected) -or
            $selected -lt 1 -or $selected -gt $phones.Count) { throw 'Seleccion de telefono invalida.' }
        $phone = $phones[$selected - 1]
    }
    & $adb -P $phone.Port -s $phone.Serial reverse tcp:43101 tcp:43101 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'ADB no pudo crear el tunel hacia el servidor.' }
    Write-Host 'Tunel ADB listo.'
    Install-Wooloo $adb $phone
    Open-Wooloo $adb $phone
    try {
        Show-Phone $adb $phone
    } catch {
        Write-Host "No se pudo duplicar la pantalla: $($_.Exception.Message)" -ForegroundColor Yellow
        $failed = $true
    }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    $failed = $true
} finally {
    Write-Host ''
    Write-Host "Monitor de solicitudes: $Base/demo/android.html"
}
if ($failed) { exit 1 }
