@echo off
REM Reforco do codigo FIPE: resolve os anuncios que ficaram SEM codigo (backstop
REM do tail dificil + qualquer straggler que a captacao nao pegou). Roda LOCAL no
REM IP residencial (a FIPE oficial responde do residencial; na Railway 403a). Usa
REM o resolvedor HIBRIDO (Parallelum primario -> oficial fallback). Disparado pelo
REM Agendador de Tarefas 1x/dia. One-shot: resolve o backlog e fecha.
REM Log em C:\claude\rematch-fipe-cron.log.
cd /d "C:\claude\repasse-livre\apps\discovery-worker"
set "PATH=%PATH%;C:\Program Files\nodejs"
REM Afrouxa o ritmo da FIPE (fallback oficial): ninguem espera este job, entao
REM prioriza nao tomar 429 a correr atras de velocidade.
set "FIPE_INTERVALO_MS=900"
echo ==================================================>> "C:\claude\rematch-fipe-cron.log"
echo [%date% %time%] iniciando rematch FIPE (local, hibrido)>> "C:\claude\rematch-fipe-cron.log"
call npm run rematch:fipe -- --aplicar >> "C:\claude\rematch-fipe-cron.log" 2>&1
echo [%date% %time%] fim (exit %errorlevel%)>> "C:\claude\rematch-fipe-cron.log"
