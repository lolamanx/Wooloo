param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Estado', 'Cortar', 'Restaurar')]
    [string]$Accion,
    [int]$PuertoAdb,
    [string]$Serial
)

$ErrorActionPreference = 'Stop'
$sdkPaths = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, "$env:LOCALAPPDATA\Android\Sdk")
$candidates = @(foreach ($sdk in $sdkPaths) {
    if ($sdk) { Join-Path $sdk 'platform-tools\adb.exe' }
})
$candidates += "$env:LOCALAPPDATA\Microsoft\WinGet\Links\adb.exe"
$adbCommand = Get-Command adb.exe -ErrorAction SilentlyContinue
if ($adbCommand) { $candidates += $adbCommand.Source }
$adb = $candidates | Where-Object {
    (Test-Path -LiteralPath $_ -PathType Leaf) -and
    ((& $_ version) -join ' ') -match 'Android Debug Bridge version 1\.0\.(\d+)' -and
    [int]$Matches[1] -ge 41
} | Select-Object -First 1
if (!$adb) { throw 'No se encontro ADB del SDK. Ejecuta primero WOOLOO-DEMO.cmd.' }

$ports = if ($PuertoAdb) { @($PuertoAdb) } elseif ($env:WOOLOO_ADB_PORT) {
    @([int]$env:WOOLOO_ADB_PORT)
} else { @(5038, 5037) }
$phone = $null
$ErrorActionPreference = 'Continue'
foreach ($port in $ports) {
    $devices = @(foreach ($line in (& $adb -P $port devices 2>$null)) {
        if ($line -match '^((?!emulator-)\S+)\s+device\s*$') { $Matches[1] }
    })
    if ($Serial) { $devices = @($devices | Where-Object { $_ -ceq $Serial }) }
    if ($devices.Count -gt 1) { throw 'Hay varios telefonos. Usa -Serial con el identificador del Samsung.' }
    if ($devices.Count -eq 1) {
        $phone = @{ Port = $port; Serial = $devices[0] }
        break
    }
}
$ErrorActionPreference = 'Stop'
if (!$phone) { throw 'No se encontro un telefono autorizado en ADB.' }

$target = @('-P', "$($phone.Port)", '-s', $phone.Serial)
$mapping = '(^|\s)tcp:43101\s+tcp:43101\s*$'
if ($Accion -eq 'Cortar') {
    $before = & $adb @target reverse --list
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar el tunel ADB.' }
    if ($before -match $mapping) {
        & $adb @target reverse --remove tcp:43101
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo quitar el tunel ADB.' }
    }
} elseif ($Accion -eq 'Restaurar') {
    & $adb @target reverse tcp:43101 tcp:43101 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo restaurar el tunel ADB.' }
}

$actual = & $adb @target reverse --list
if ($LASTEXITCODE -ne 0) { throw 'No se pudo confirmar el estado del tunel ADB.' }
$connected = [bool]($actual -match $mapping)
if (($Accion -eq 'Cortar' -and $connected) -or ($Accion -eq 'Restaurar' -and !$connected)) {
    throw 'El estado del tunel no coincide con la accion solicitada.'
}
if ($connected) { 'Tunel Wooloo activo en tcp:43101.' }
else { 'Tunel Wooloo cortado. ADB y la pantalla duplicada siguen conectados.' }
