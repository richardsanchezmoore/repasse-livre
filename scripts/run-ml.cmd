@echo off
REM ============================================================================
REM  Captacao do Mercado Livre rodando LOCAL (IP residencial, sem proxy Thordata).
REM  Disparado pelo Agendador de Tarefas do Windows a cada 6h. Cada execucao abre,
REM  capta e fecha (nao e servidor). Log em C:\claude\ml-cron.log.
REM
REM  Esta e a copia versionada (backup). A que roda de verdade fica em
REM  C:\claude\run-ml.cmd. Se restaurar noutro PC, ajuste os caminhos abaixo.
REM  Ver docs/mercadolivre-captacao-local.md.
REM ============================================================================
cd /d "C:\claude\repasse-livre\apps\discovery-worker"
set "PATH=%PATH%;C:\Program Files\nodejs"
REM Caminho fixo dos browsers do Playwright — evita a ambiguidade de AppData/perfil
REM no contexto do Agendador de Tarefas (o schtasks resolve o LOCALAPPDATA diferente).
set "PLAYWRIGHT_BROWSERS_PATH=C:\claude\pw-browsers"
echo ==================================================>> "C:\claude\ml-cron.log"
echo [%date% %time%] iniciando ML (local)>> "C:\claude\ml-cron.log"
call npm run discover:mercadolivre >> "C:\claude\ml-cron.log" 2>&1
echo [%date% %time%] fim (exit %errorlevel%)>> "C:\claude\ml-cron.log"
