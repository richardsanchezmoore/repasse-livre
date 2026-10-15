@echo off
REM ===========================================================================
REM  SOBE OS DOIS LACOS CONTINUOS DO AUTO RADAR PY (ciclo + limpeza).
REM
REM  POR QUE EXISTE (Gustavo, 13/10/2026): a maquina desligou duas vezes em dois
REM  dias — falta de luz e bateria — e voltou com TUDO fechado. Toda vez alguem
REM  precisava religar as varreduras na mao, e "alguem" so acontecia quando ele
REM  me chamava. A queda de bateria custou 43 minutos parados.
REM
REM  ⚠️ ISTO SUBSTITUI O MODO ANTIGO da tarefa RL-fb-py-todas, que rodava UMA
REM  passada de capturarParaguai a cada 4h10. O motor hoje e continuo: o
REM  ciclo24h.sh faz catalogo -> faixas -> fotos em laco, e o limpeza20min.sh
REM  roda hash -> reanuncio -> tabela de 20 em 20 min. Religar a tarefa antiga
REM  como estava poria uma captura avulsa para disputar a MESMA sessao do
REM  Playwright com o ciclo.
REM
REM  ⚠️⚠️ PODE SER CHAMADO QUANTAS VEZES QUISER. Os dois .sh tem guarda de
REM  instancia unica (arquivo .pid + kill -0): se o laco ja esta vivo, o novo
REM  sai sem tocar em nada — inclusive sem zerar o log, que era o estrago
REM  silencioso da versao sem guarda. E por isso que esta tarefa pode repetir
REM  de 15 em 15 min e servir de vigia, nao so de partida.
REM
REM  Parar de verdade: criar C:\claude\ciclo24h.parar (os dois leem esse sinal).
REM ===========================================================================

set "BASH=C:\Program Files\Git\bin\bash.exe"
set "WORKER=C:\claude\repasse-livre\apps\discovery-worker"

if not exist "%BASH%" (
  echo [%date% %time%] bash do Git nao encontrado em "%BASH%" >> C:\claude\run-ciclo-py.log
  exit /b 1
)

REM ⚠️ O sinal de parada tem precedencia: se o Gustavo parou de proposito, a
REM tarefa agendada NAO pode desfazer isso na proxima repeticao.
if exist "C:\claude\ciclo24h.parar" (
  echo [%date% %time%] C:\claude\ciclo24h.parar existe — respeitando a parada. >> C:\claude\run-ciclo-py.log
  exit /b 0
)

echo [%date% %time%] garantindo que ciclo e limpeza estao de pe >> C:\claude\run-ciclo-py.log

REM ⚠️ `start ""` com /B desanexa: a tarefa agendada termina em segundos e os
REM lacos seguem vivos. Sem isso a tarefa ficaria "em execucao" por dias e a
REM repeticao de 15 min nunca dispararia.
REM
REM ⚠️⚠️ UM LOG PARA CADA, NUNCA COMPARTILHADO — e eu cai nessa na primeira
REM versao. O ">>" do Windows abre com lock EXCLUSIVO: os dois `start` miravam
REM o mesmo arquivo e o segundo morreu com "O arquivo ja esta sendo usado por
REM outro processo". E exatamente a armadilha que o run-fb-py.cmd ja descreve
REM para os logs por regiao, e eu a repeti.
REM ⚠️⚠️ SEM REDIRECIONAMENTO NO `start` — e isto foi medido em 15/10/2026.
REM
REM A versao anterior era `start ... >> arquivo.log`. Rodando na mao funcionava;
REM chamada pela TAREFA AGENDADA, o bash nunca chegava a escrever nada. O ">>"
REM do cmd abre o arquivo com lock EXCLUSIVO e o mantem enquanto a linha
REM executa — o processo desanexado herda um descritor que ja nao pode escrever.
REM
REM ★ Agora cada .sh registra o proprio veredito em C:\claude\varredura-guarda.log,
REM com append proprio e sem disputa. A saida do `start` nao interessa: o que
REM precisa ficar legivel e SE a guarda disparou ou SE o laco subiu.
start "" /B "%BASH%" "%WORKER%/ciclo24h.sh"
if errorlevel 1 echo [%date% %time%] FALHA ao disparar ciclo24h.sh >> C:\claude\varredura-guarda.log
start "" /B "%BASH%" "%WORKER%/limpeza20min.sh"
if errorlevel 1 echo [%date% %time%] FALHA ao disparar limpeza20min.sh >> C:\claude\varredura-guarda.log

exit /b 0
