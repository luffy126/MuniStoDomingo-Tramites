# Comparte la app de Docker con una URL pública (Cloudflare Tunnel).
# Se usa con doble clic en compartir.bat, con la app ya iniciada (iniciar.bat).
#
#   compartir.bat           publica en https://muni.tenerex.cl (necesita el token)
#   compartir.bat -Rapido   URL al azar *.trycloudflare.com (sin cuenta ni token)
#
# 1. Revisa que los contenedores respondan en http://127.0.0.1:8080 (FRONTEND_PORT).
# 2. Con token: deja el túnel "muni-compartir" apuntando a ese puerto y el DNS del
#    dominio apuntando al túnel (la primera vez los crea). Sin token, Quick Tunnel.
# 3. Recrea el backend con PUBLIC_URL (enlaces de los correos con la URL pública) y
#    TRUST_PROXY=2 (IP real de cada visitante para el límite de intentos).
# 4. Ctrl+C cierra el túnel y deja el backend como antes (localhost, TRUST_PROXY=1).
#
# Token de Cloudflare (permisos Account > Cloudflare Tunnel > Edit y Zone > DNS > Edit
# en la zona del dominio): variable CLOUDFLARE_API_TOKEN o archivo cloudflare-token.txt
# en esta carpeta. Git lo ignora: nunca lo subas ni lo compartas.
#
# Es el mismo túnel que usa compartir.ps1 de la versión XAMPP: no se pueden usar
# las dos a la vez (este script avisa si el túnel ya está conectado en otra parte).

param(
  [switch]$Rapido,
  [string]$Dominio = 'muni.tenerex.cl',
  [string]$NombreTunel = 'muni-compartir'
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Set-Location -Path $PSScriptRoot

function Paso([string]$texto) {
  Write-Host ''
  Write-Host "==> $texto" -ForegroundColor Cyan
}

function Falla([string]$texto) {
  Write-Host ''
  Write-Host "ERROR: $texto" -ForegroundColor Red
  exit 1
}

function LeerVariable([string]$archivo, [string]$nombre) {
  if (-not (Test-Path $archivo)) { return $null }
  $linea = Get-Content $archivo | Where-Object { $_ -match "^$nombre=" } | Select-Object -Last 1
  if ($linea) { return ($linea -split '=', 2)[1].Trim() }
  return $null
}

# Mismos archivos de variables que iniciar.bat
$archivosEnv = @('--env-file', '.env.docker')
$puerto = LeerVariable '.env.docker' 'FRONTEND_PORT'
if (Test-Path '.env.docker.local') {
  $archivosEnv += @('--env-file', '.env.docker.local')
  $local = LeerVariable '.env.docker.local' 'FRONTEND_PORT'
  if ($local) { $puerto = $local }
}
if (-not $puerto) { $puerto = '8080' }

# Recrea solo el backend con las variables del proceso actual (PUBLIC_URL, TRUST_PROXY).
# Las sesiones abiertas siguen válidas: el JWT no cambia.
function RecrearBackend {
  # docker escribe su progreso en stderr: con 'Stop', PowerShell 5.1 lo tomaría como error
  $ErrorActionPreference = 'Continue'
  & docker compose @archivosEnv up -d --wait backend 2>&1 | Out-Null
  return ($LASTEXITCODE -eq 0)
}

# ── 1. Requisitos ─────────────────────────────────
Paso 'Revisando requisitos'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Falla 'No se encontró Docker. Instálalo y ejecuta iniciar.bat primero (ver INSTALAR.md).'
}
try {
  $salud = Invoke-RestMethod -Uri "http://127.0.0.1:$puerto/api/health" -TimeoutSec 5
} catch { $salud = $null }
if (-not $salud) {
  Falla "La app no responde en http://localhost:$puerto. Ejecuta iniciar.bat, espera a que diga Listo y vuelve a abrir compartir.bat."
}
Write-Host "  App funcionando en http://localhost:$puerto"

$logs = Join-Path $env:TEMP 'muni-compartir-docker'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$archivoPid = Join-Path $logs 'tunel.pid'

# Túnel que quedó abierto de una ejecución anterior cerrada sin Ctrl+C
if (Test-Path $archivoPid) {
  $pidAnterior = (Get-Content $archivoPid -Raw -ErrorAction SilentlyContinue)
  if ($pidAnterior -match '^\s*(\d+)') {
    $resto = Get-Process -Id $Matches[1] -ErrorAction SilentlyContinue
    if ($resto -and $resto.ProcessName -eq 'cloudflared') {
      Stop-Process -Id $resto.Id -Force -ErrorAction SilentlyContinue
      Write-Host '  Cerrado un túnel que quedó de una ejecución anterior'
      Start-Sleep -Seconds 1
    }
  }
  Remove-Item $archivoPid -ErrorAction SilentlyContinue
}

$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) {
  $cloudflared = @(
    "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe",
    "$env:ProgramFiles\cloudflared\cloudflared.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $cloudflared) {
  Falla 'Falta cloudflared. Instálalo con:  winget install --id Cloudflare.cloudflared  y vuelve a abrir compartir.bat.'
}
Write-Host '  cloudflared encontrado'

# ── 2. Túnel con nombre (dominio fijo) ────────────
$tokenTunel = $null
if (-not $Rapido) {
  $archivoToken = Join-Path $PSScriptRoot 'cloudflare-token.txt'
  $tokenApi = $env:CLOUDFLARE_API_TOKEN
  if (-not $tokenApi -and (Test-Path $archivoToken)) { $tokenApi = (Get-Content $archivoToken -Raw).Trim() }

  if (-not $tokenApi) {
    Write-Host "  Sin token de Cloudflare: se usará una URL al azar en vez de $Dominio." -ForegroundColor Yellow
    Write-Host "  (Para la dirección fija, guarda el token en $archivoToken)" -ForegroundColor Yellow
  } else {
    Paso "Preparando el túnel $NombreTunel para $Dominio"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    function Cloudflare([string]$Metodo, [string]$Ruta, $Cuerpo = $null) {
      $peticion = @{
        Method      = $Metodo
        Uri         = "https://api.cloudflare.com/client/v4$Ruta"
        Headers     = @{ Authorization = "Bearer $tokenApi" }
        ContentType = 'application/json'
      }
      if ($null -ne $Cuerpo) { $peticion.Body = $Cuerpo | ConvertTo-Json -Depth 10 }
      try { $respuesta = Invoke-RestMethod @peticion }
      catch {
        $estado = 0
        if ($_.Exception.Response) { $estado = [int]$_.Exception.Response.StatusCode }
        if ($estado -in 401, 403) { Falla "El token de Cloudflare no tiene permiso para $Metodo $Ruta. Necesita Edit en Cloudflare Tunnel y en DNS." }
        Falla "Cloudflare no respondió a $Metodo ${Ruta}: $($_.Exception.Message)"
      }
      if (-not $respuesta.success) { Falla "Cloudflare rechazó $Metodo $Ruta." }
      return $respuesta.result
    }

    $raiz = ($Dominio -split '\.')[-2..-1] -join '.'
    $zona = Cloudflare GET "/zones?name=$raiz" | Select-Object -First 1
    if (-not $zona) { Falla "El token no ve la zona $raiz." }
    $cuenta = $zona.account.id

    $tunelCf = Cloudflare GET "/accounts/$cuenta/cfd_tunnel?name=$NombreTunel&is_deleted=false" | Select-Object -First 1
    if (-not $tunelCf) {
      Write-Host "  Creando el túnel $NombreTunel (solo la primera vez)"
      $tunelCf = Cloudflare POST "/accounts/$cuenta/cfd_tunnel" @{ name = $NombreTunel; config_src = 'cloudflare' }
    } else {
      # Recién cerrado un resto, Cloudflare tarda unos segundos en marcarlo desconectado
      $limite = (Get-Date).AddSeconds(20)
      while ($tunelCf.status -eq 'healthy') {
        if ((Get-Date) -gt $limite) {
          Falla "El túnel $NombreTunel ya está conectado desde otra ventana o equipo (¿la versión XAMPP?). Ciérralo antes de abrir uno nuevo."
        }
        Start-Sleep -Seconds 2
        $tunelCf = Cloudflare GET "/accounts/$cuenta/cfd_tunnel/$($tunelCf.id)"
      }
    }

    # 127.0.0.1 y no localhost: evita que cloudflared pruebe primero IPv6
    Cloudflare PUT "/accounts/$cuenta/cfd_tunnel/$($tunelCf.id)/configurations" @{
      config = @{
        ingress = @(
          @{ hostname = $Dominio; service = "http://127.0.0.1:$puerto" },
          @{ service = 'http_status:404' }
        )
      }
    } | Out-Null

    $destino = "$($tunelCf.id).cfargotunnel.com"
    $registros = @(Cloudflare GET "/zones/$($zona.id)/dns_records?name=$Dominio")
    $actual = $registros | Select-Object -First 1
    if ($actual -and $actual.type -ne 'CNAME') {
      Falla "$Dominio ya tiene un registro $($actual.type) que no es de este túnel. Bórralo en Cloudflare si no lo usas."
    }
    if ($actual -and $actual.content -ne $destino -and $actual.content -notlike '*.cfargotunnel.com') {
      Falla "$Dominio ya apunta a $($actual.content). Bórralo en Cloudflare si no lo usas."
    }
    $registro = @{ type = 'CNAME'; name = $Dominio; content = $destino; proxied = $true; ttl = 1 }
    if (-not $actual) {
      Write-Host "  Creando el registro DNS de $Dominio (solo la primera vez)"
      Cloudflare POST "/zones/$($zona.id)/dns_records" $registro | Out-Null
    } elseif ($actual.content -ne $destino -or -not $actual.proxied) {
      Cloudflare PUT "/zones/$($zona.id)/dns_records/$($actual.id)" $registro | Out-Null
    }

    $tokenTunel = Cloudflare GET "/accounts/$cuenta/cfd_tunnel/$($tunelCf.id)/token"
    Write-Host "  Túnel listo"
  }
}

# ── 3. Abrir el túnel y ajustar el backend ────────
$logTunel = Join-Path $logs 'tunel.log'
Remove-Item -Path $logTunel -ErrorAction SilentlyContinue
$tunel = $null
$backendCambiado = $false

try {
  Paso 'Abriendo el túnel de Cloudflare'
  $url = $null
  if ($tokenTunel) {
    # El token va por variable de entorno para que no quede en la línea de comandos
    $env:TUNNEL_TOKEN = $tokenTunel
    $tunel = Start-Process -FilePath $cloudflared -NoNewWindow -PassThru `
      -ArgumentList 'tunnel', '--no-autoupdate', '--pidfile', "`"$archivoPid`"", 'run' `
      -RedirectStandardOutput (Join-Path $logs 'tunel-salida.log') -RedirectStandardError $logTunel
    Remove-Item Env:\TUNNEL_TOKEN

    $limite = (Get-Date).AddSeconds(45)
    while (-not (Select-String -Path $logTunel -Pattern 'Registered tunnel connection' -Quiet -ErrorAction SilentlyContinue)) {
      if ($tunel.HasExited -or (Get-Date) -gt $limite) { Falla "El túnel no se conectó. Revisa $logTunel" }
      Start-Sleep -Milliseconds 500
    }
    $url = "https://$Dominio"
  } else {
    $tunel = Start-Process -FilePath $cloudflared -NoNewWindow -PassThru `
      -ArgumentList 'tunnel', '--no-autoupdate', '--pidfile', "`"$archivoPid`"", '--url', "http://127.0.0.1:$puerto" `
      -RedirectStandardOutput (Join-Path $logs 'tunel-salida.log') -RedirectStandardError $logTunel

    $limite = (Get-Date).AddSeconds(45)
    while (-not $url) {
      if ($tunel.HasExited -or (Get-Date) -gt $limite) { Falla "El túnel no entregó una URL. Revisa $logTunel" }
      Start-Sleep -Milliseconds 500
      $coincidencia = Select-String -Path $logTunel -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue |
        Select-Object -First 1
      if ($coincidencia) { $url = $coincidencia.Matches[0].Value }
    }
  }

  Paso 'Ajustando la API para la URL pública (unos segundos)'
  $env:PUBLIC_URL = $url
  $env:TRUST_PROXY = '2'
  $backendCambiado = $true
  if (-not (RecrearBackend)) { Falla 'No se pudo reiniciar el backend. Revisa: docker compose logs backend' }
  Write-Host '  Los enlaces de los correos usarán la URL pública'

  try { Set-Clipboard -Value $url } catch { }

  Write-Host ''
  Write-Host '  ================================================================' -ForegroundColor Green
  Write-Host '    App publicada. Comparte esta URL:' -ForegroundColor Green
  Write-Host ''
  Write-Host "    $url" -ForegroundColor Yellow
  Write-Host ''
  Write-Host '    (ya está copiada en el portapapeles)' -ForegroundColor Green
  Write-Host '  ================================================================' -ForegroundColor Green
  Write-Host ''
  Write-Host '  Cuentas de prueba: vecino@test.com / funcionario@test.com  (Test1234)'
  Write-Host '  La URL puede tardar unos segundos en responder la primera vez.'
  Write-Host '  Presiona Ctrl+C para dejar de compartir (la app sigue en localhost).' -ForegroundColor Cyan

  while ($true) {
    if ($tunel.HasExited) { Falla "El túnel se cerró. Revisa $logTunel" }
    Start-Sleep -Seconds 2
  }
}
finally {
  Write-Host ''
  Write-Host 'Cerrando el túnel...' -ForegroundColor Cyan
  if ($tunel -and -not $tunel.HasExited) {
    Stop-Process -Id $tunel.Id -Force -ErrorAction SilentlyContinue
  }
  Remove-Item $archivoPid -ErrorAction SilentlyContinue
  if ($backendCambiado) {
    Remove-Item Env:\PUBLIC_URL -ErrorAction SilentlyContinue
    Remove-Item Env:\TRUST_PROXY -ErrorAction SilentlyContinue
    if (RecrearBackend) { Write-Host 'API devuelta a la configuración local.' }
    else { Write-Host 'Aviso: no se pudo devolver la API a localhost. Ejecuta iniciar.bat.' -ForegroundColor Yellow }
  }
  Write-Host 'Listo. La app ya no está pública; sigue funcionando en localhost.'
}
