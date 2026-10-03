@echo off
REM Captacao do Facebook Marketplace PARAGUAI, rodando LOCAL (IP residencial).
REM
REM Mesmo motivo do run-fb.cmd brasileiro: IP de datacenter leva muro do FB, e
REM o proxy ISP bloqueia o dominio facebook.com. Residencial pega o Marketplace
REM real. Aqui vale em dobro: a maquina esta NO Paraguai, entao o IP combina com
REM a praca que estamos varrendo.
REM
REM Uso: run-fb-py.cmd <regiao-slug>   ex.: run-fb-py.cmd ciudad-del-este-py-apa
REM      sem argumento, varre TODAS as pracas paraguaias do painel.
cd /d "C:\claude\repasse-livre\apps\discovery-worker"
set "PATH=%PATH%;C:\Program Files\nodejs"

REM Os browsers do Playwright vivem FORA do node_modules (C:claudepw-browsers),
REM mesma convencao do run-ml.cmd. Sem esta linha a captacao sobe, nao acha o
REM chromium e morre - e agora ela DEPENDE do navegador, porque o Facebook
REM fechou o Marketplace para visitante anonimo em 02/10/2026.
set "PLAYWRIGHT_BROWSERS_PATH=C:\claude\pw-browsers"

REM LOG POR REGIAO, nunca compartilhado. O ">>" do Windows abre com lock
REM EXCLUSIVO: duas regioes ao mesmo tempo e a segunda falha em "arquivo ja em
REM uso", o .cmd sai 1 e a run inteira se perde sem rastro. Aconteceu no Brasil
REM em 16/07 com santa-maria e blumenau.
set "REGIAO=%~1"
if "%REGIAO%"=="" set "REGIAO=todas"
set "LOG=C:\claude\fb-py-%REGIAO%.log"

echo ==================================================>> "%LOG%"
echo [%date% %time%] iniciando FB Paraguai regiao=%REGIAO%>> "%LOG%"
call npx tsx src/capturarParaguai.ts %1 >> "%LOG%" 2>&1
echo [%date% %time%] fim (exit %errorlevel%)>> "%LOG%"
