# fb-watchdog.ps1 -- reaper de runs RUNAWAY do scraping do Facebook.
#
# HISTORICO: a versao antiga usava "CPU congelada" como heartbeat. Isso e ERRADO
# para o FB: a captacao e limitada por REDE (espera o proxy residencial responder),
# entao um worker SAUDAVEL fica com CPU ~0 enquanto aguarda -> era morto por engano,
# deixando sweeps pela metade e zerando as oportunidades. CPU nao distingue
# "esperando rede lenta" de "travado".
#
# REGRA NOVA (so idade): mata o worker so quando ele passa do teto duro. Nenhum
# sweep saudavel chega perto disso (os mais longos ~15-17 min); acima do teto e
# processo runaway/orfao de verdade. Simples e sem falso-positivo.
#
# Agende a cada ~10 min:
#   schtasks /Create /TN "RL-fb-watchdog" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\claude\repasse-livre\scripts\fb-watchdog.ps1" /SC MINUTE /MO 10 /F

param(
  [int]$TetoDuroMin = 45    # acima disso, mata (nenhum run saudavel passa disso)
)

$ErrorActionPreference = "SilentlyContinue"
$logFile = Join-Path $PSScriptRoot "fb-watchdog.log"
function Log($m){ Add-Content -Path $logFile -Encoding UTF8 -Value ("{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $m) }

# workers do FB = node rodando facebookMain (o processo que faz o trabalho)
function Get-FbWorkers {
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -match 'facebookMain' -and $_.CommandLine -match 'discovery-worker' }
}

# mata o worker + descendentes + ancestrais npm/npx que tambem sao do FB (a arvore da regiao)
function Kill-Tree($procId){
  $kids = Get-CimInstance Win32_Process -Filter "ParentProcessId=$procId"
  foreach($k in $kids){ Kill-Tree $k.ProcessId }
  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$procId"
  if($p -and $p.ParentProcessId){
    $par = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.ParentProcessId)"
    if($par -and $par.CommandLine -match 'facebook'){ Stop-Process -Id $par.ProcessId -Force }
  }
  Stop-Process -Id $procId -Force
}

$workers = Get-FbWorkers
if(-not $workers){ exit 0 }

$agora = Get-Date
foreach($w in $workers){
  $idade = ($agora - $w.CreationDate).TotalMinutes
  if($idade -ge $TetoDuroMin){
    Log ("MATANDO PID {0} -- runaway (idade {1} min >= teto {2} min)" -f $w.ProcessId, [math]::Round($idade,1), $TetoDuroMin)
    Kill-Tree $w.ProcessId
  }
}
exit 0
