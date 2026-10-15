# ===========================================================================
#  Reconfigura a tarefa RL-fb-py-todas para VIGIAR os lacos continuos do
#  Auto Radar PY, em vez de rodar uma captura avulsa a cada 4h10.
#
#  POR QUE: a maquina caiu tres vezes em tres dias (falta de luz, bateria e
#  uma terceira que custou 30 HORAS de varredura parada). A hibernacao ja
#  esta ligada e resolve a queda por bateria; esta tarefa cobre o resto -
#  desligamento forcado, falta de luz com a maquina apagada, ou um laco que
#  morra por qualquer motivo.
#
#  O QUE MUDA:
#    acao    : C:\claude\run-fb-py.cmd       -> C:\claude\run-ciclo-py.cmd
#    gatilho : a cada 4h10 desde 02/10       -> no LOGON + a cada 15 min
#    config  : StartWhenAvailable=False      -> True (roda a execucao perdida
#              assim que a maquina volta)
#
#  AVISO SOBRE ACENTOS: este arquivo e deliberadamente ASCII puro. O
#  PowerShell 5.1 le .ps1 sem BOM usando a codepage ANSI do sistema; a versao
#  anterior era UTF-8 sem BOM e tinha cinco linhas acentuadas, que viraram
#  bytes soltos e quebraram o parser com um erro enganoso ("a cadeia de
#  caracteres nao tem o terminador") apontando para a ULTIMA linha do arquivo.
#
#  Repetir de 15 em 15 min e seguro: os dois .sh tem guarda de instancia unica
#  (.pid + kill -0). Se o laco ja esta vivo, o novo sai sem tocar em nada.
#
#  O sinal de parada tem precedencia: enquanto C:\claude\ciclo24h.parar
#  existir, o .cmd nao sobe nada.
#
#  RODAR COMO ADMINISTRADOR:
#    powershell -ExecutionPolicy Bypass -File C:\claude\configurar-tarefa-py.ps1
#
#  VOLTAR AO MODO ANTIGO:
#    Register-ScheduledTask -Xml (Get-Content C:\claude\RL-fb-py-todas.backup.xml -Raw) -TaskName 'RL-fb-py-todas' -Force
# ===========================================================================

$ErrorActionPreference = 'Stop'

$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$pr = New-Object Security.Principal.WindowsPrincipal($id)
if (-not $pr.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "Esta janela NAO e administrador. Abra o PowerShell como administrador e rode de novo." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path 'C:\claude\run-ciclo-py.cmd')) {
  Write-Host "C:\claude\run-ciclo-py.cmd nao existe." -ForegroundColor Red
  exit 1
}

$acao = New-ScheduledTaskAction -Execute 'C:\claude\run-ciclo-py.cmd'

$tLogon = New-ScheduledTaskTrigger -AtLogOn

# Repeticao de 15 min: o vigia. Comeca no proximo minuto redondo de hoje.
#
# AVISO: no PowerShell 5.1 o -RepetitionInterval sozinho nao fixa a duracao, e
# sem duracao a repeticao pode nao valer. Por isso a duracao e escrita depois,
# direto no objeto, com o valor "indefinido" do agendador.
$tRep = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 15)
$tRep.Repetition.Duration = $null   # null = repete para sempre

$cfg = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Set-ScheduledTask -TaskName 'RL-fb-py-todas' -Action $acao -Trigger @($tLogon, $tRep) -Settings $cfg | Out-Null
Enable-ScheduledTask -TaskName 'RL-fb-py-todas' | Out-Null

$t = Get-ScheduledTask -TaskName 'RL-fb-py-todas'
Write-Host ""
Write-Host "OK - RL-fb-py-todas reconfigurada" -ForegroundColor Green
Write-Host "  estado : $($t.State)"
Write-Host "  acao   : $($t.Actions[0].Execute)"
foreach ($g in $t.Triggers) {
  Write-Host "  gatilho: $($g.CimClass.CimClassName)  repete=$($g.Repetition.Interval)"
}
Write-Host ""
Write-Host "Teste agora sem esperar:"
Write-Host "  Start-ScheduledTask -TaskName 'RL-fb-py-todas'"
