#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  CICLO CONTÍNUO DO AUTO RADAR PY — catálogo → faixas → fotos, repetindo.
#
#  ★ Pedido do Gustavo (10/10/2026): *"agora vamos com tudo... sem parar por
#    24h"*, rumo aos 1.000 anúncios para lançar.
#
#  ⚠️⚠️ TUDO EM SÉRIE, NUNCA EM PARALELO. Os três passos usam a MESMA pasta de
#  sessão do Playwright (C:/claude/fb-sessao-py). Dois processos ali ao mesmo
#  tempo corrompem a sessão — e a trava por PID faz o segundo sair com código 0
#  em silêncio, ou seja, pareceria que rodou e não rodou nada.
#
#  ⚠️⚠️ A CONTA É USÁVEL E NÃO PODE SER BLOQUEADA. Por isso o ciclo tem pausa
#  entre voltas e pacing dentro de cada passo: 24h de martelo sem respiro é
#  exatamente o padrão que o Facebook marca. Preferimos 24h rendendo do que 3h
#  rendendo e a conta na geladeira.
#
#  ⚠️ A ORDEM NÃO É ARBITRÁRIA:
#    1. CATÁLOGO (busca por termo) primeiro — é o que enxerga a frota JDM que
#       categoria+faixa não acha (248 anúncios por palavra-chave, zero na base).
#    2. FAIXAS (autoload) — o volume.
#    3. FOTOS por último — não adianta foto de anúncio cujo preço ainda não
#       passou pelo crivo.
#
#  Parar: Ctrl+C, ou apagar o arquivo C:/claude/ciclo24h.parar
# ═══════════════════════════════════════════════════════════════════════════

export PATH="/c/Program Files/nodejs:$PATH"
export PLAYWRIGHT_BROWSERS_PATH=C:/claude/pw-browsers   # ⚠️ chromium mora aqui desde 03/07
cd "$(dirname "$0")" || exit 1

# ═══ GUARDA DE INSTÂNCIA ÚNICA ═════════════════════════════════════════════
#
# ★ Entrou em 13/10/2026, quando o ciclo passou a subir sozinho no logon
# (tarefa agendada) ALÉM de eu poder subir na mão. Sem isto, dois laços
# disputariam a mesma sessão do Playwright a cada volta.
#
# ⚠️⚠️ E vem ANTES de `: > "$LOG"` de propósito: a segunda instância ZERAVA O
# LOG DA PRIMEIRA antes de qualquer verificação. O ciclo seguia rodando e o
# histórico sumia — defeito pior que o conflito, porque é silencioso.
#
# ⚠️ `kill -0` só pergunta se o processo existe; não envia sinal nenhum.
TRAVA_LACO=/c/claude/ciclo24h.pid
if [ -f "$TRAVA_LACO" ] && kill -0 "$(cat "$TRAVA_LACO" 2>/dev/null)" 2>/dev/null; then
  echo "⛔ já existe um ciclo rodando (pid $(cat "$TRAVA_LACO")). Saindo sem tocar no log."
  # ⚠️ REGISTRA TAMBÉM NO LOG DO LANÇADOR, e não só na saída padrão.
  #
  # Quando quem chama é a TAREFA AGENDADA, o `start /B` do .cmd desanexa o
  # processo e a saída dele não chega mais ao arquivo — conferido em
  # 15/10/2026: a tarefa rodou às 12:13 e o `run-ciclo-py-ciclo.log` continuou
  # com linhas de dois dias antes. A guarda FUNCIONOU (não subiu segundo
  # ciclo), mas quem fosse diagnosticar veria log parado e concluiria errado.
  echo "[$(date '+%d/%m %H:%M:%S')] ciclo ja vivo (pid $(cat "$TRAVA_LACO")) - nada a fazer" >> /c/claude/varredura-guarda.log
  exit 0
fi
echo $$ > "$TRAVA_LACO"
trap 'rm -f "$TRAVA_LACO"' EXIT

LOG=/c/claude/ciclo24h.log
PARAR=/c/claude/ciclo24h.parar
# ★ Segundo sinal: PARE E SUBA DE NOVO (o vigia consome o arquivo e religa).
#   Serve para aplicar mudanca neste .sh, que o bash so le quando o laco
#   comeca. ⚠️ Usar o `.parar` para isso deixou tudo 23h30 fora do ar.
REINICIAR=/c/claude/ciclo24h.reiniciar
parou() { [ -f "$PARAR" ] || [ -f "$REINICIAR" ]; }

# ⚠️⚠️ O LOG ANTERIOR É GUARDADO, NÃO APAGADO — e isto custou um diagnóstico.
#
# Na madrugada de 16/10 o ciclo morreu e o vigia o religou às 23:31, que é
# exatamente o que ele existe para fazer. Só que o novo ciclo ZEROU o log e,
# com ele, a única pista do que tinha matado o anterior. O mecanismo funcionou
# e apagou a prova de por que precisou funcionar.
#
# ⚠️ Guarda apenas o ÚLTIMO: manter um por reinício encheria o disco em
# silêncio, e o que interessa é sempre o imediatamente anterior.
[ -s "$LOG" ] && mv -f "$LOG" "${LOG%.log}-anterior.log"
: > "$LOG"
rm -f "$PARAR"

# ★ Registra no log do VIGIA que subiu de fato — antes só havia a linha de
# "já vivo, nada a fazer", então uma intervenção real do vigia era invisível.
echo "[$(date '+%d/%m %H:%M:%S')] ciclo SUBIU (pid $$)" >> /c/claude/varredura-guarda.log

# ★★ A QUEDA DE REDE DAS 03:21 MATOU O CICLO. Duas etapas sairam com
# "TypeError: fetch failed" (nao alcancavam o Supabase) e o laco nao sobreviveu.
# Internet domestica no Paraguai cai; o ciclo tem que tratar isso como normal.
#
# ⚠️ Espera a rede VOLTAR antes de tentar de novo, em vez de repetir no vazio:
# repetir sem rede so queima tentativa e, no Facebook, pareceria robo insistindo.
esperarRede() {
  local n=0
  while ! node -e "fetch('https://www.google.com/generate_204',{signal:AbortSignal.timeout(8000)}).then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null; do
    n=$((n + 1))
    echo "  sem rede (tentativa $n) - esperando 60s" >> "$LOG"
    [ "$n" -gt 120 ] && { echo "  2h sem rede - seguindo mesmo assim" >> "$LOG"; return; }
    sleep 60
  done
}

# Roda um passo; se cair, espera a rede e tenta UMA vez mais.
comRede() {
  esperarRede
  "$@" >> "$LOG" 2>&1
  local c=$?
  if [ $c -ne 0 ]; then
    echo "  saiu com $c - esperando a rede e repetindo uma vez" >> "$LOG"
    sleep 60
    esperarRede
    "$@" >> "$LOG" 2>&1
    c=$?
  fi
  echo "  passo encerrado com $c" >> "$LOG"
}

marca() { echo "" >> "$LOG"; echo "═══ $(date '+%d/%m %H:%M:%S') · $* ═══" >> "$LOG"; }

# ⚠️ Espera a trava LIBERAR em vez de só sair: sem isto, um passo que pegasse a
# sessão ocupada sairia 0 e o ciclo pularia o trabalho achando que fez.
esperarTrava() {
  local tentativas=0
  while node -e 'try{const t=JSON.parse(require("fs").readFileSync("C:/claude/fb-sessao-py.lock","utf8"));process.kill(t.pid,0);process.exit(0)}catch(e){process.exit(1)}' 2>/dev/null; do
    tentativas=$((tentativas + 1))
    [ "$tentativas" -gt 120 ] && { echo "  trava presa há 1h — seguindo mesmo assim" >> "$LOG"; return; }
    sleep 30
  done
}

volta=0
while ! parou; do
  volta=$((volta + 1))

  marca "VOLTA $volta · 1/3 CATÁLOGO (busca por termo)"
  esperarTrava
  # ★ PY_METADE=1: metade das praças por volta. Corta o catálogo pela metade e
  # devolve o ciclo às FAIXAS, que é de onde vem o anúncio recém-publicado.
  #
  # ⚠️ A FASE VEM DAQUI, do contador de voltas. Antes era a paridade do dia e
  # isso dava errado: todas as voltas do mesmo dia pegavam a MESMA metade, e a
  # outra ficava até 24h sem varredura (o log mostrou voltas 2 e 3 iguais).
  PY_METADE=1 PY_METADE_FASE=$((volta % 2)) PY_MODO=termo PY_TERMOS_POR_RODADA=25 PY_SEM_FOTO=1 PY_MAX_ITENS=250 \
    PY_ESPERA_ITEM=1500 PY_PACING=1200 \
    comRede npx tsx src/capturarParaguai.ts

  parou && break
  sleep 120

  marca "VOLTA $volta · 2/3 FAIXAS (autoload)"
  esperarTrava
  # ⚠️⚠️ UMA FAIXA, e isto é conclusão MEDIDA — não preguiça.
  #
  # Em 20/10 eu achei que a escada estava "desligada" (`PY_FAIXAS=12` virava
  # uma faixa só) e que ligá-la destravaria a cobertura. A telemetria de
  # 07/10, quando as 23 faixas REALMENTE rodaram em Ciudad del Este, desmente:
  #
  #   escada do DÓLAR    → 0 a 2 ids por faixa, conjuntos distintos (funciona)
  #   escada do GUARANI  → 13 ids, IDÊNTICOS em SEIS faixas seguidas
  #                        (22,5M · 25M · 30M · 45M · 55M · 90M+)
  #
  # Carro de ₲25 milhões não cabe na faixa de ₲90 milhões: acima de ~₲22M o
  # filtro não é aplicado, e 13 é o teto da categoria que já tínhamos medido.
  # Ou seja: a escada NÃO abre alcance onde está 74% do mercado, e 12 faixas
  # seriam 12x mais buscas e 12x mais exposição da conta por nada.
  #
  # ★ Quem traz volume aqui é o AUTOLOAD (rolagem): na mesma volta, Luque deu
  # 90 ids com 1 faixa + rolagem, contra os 13 da escada inteira em CDE.
  PY_AUTOLOAD=1 PY_FAIXAS="1000-2000000000" PY_SEM_FOTO=1 \
    PY_ROLAGENS=25 PY_PAUSA_ROLAGEM=2200 PY_PACING=1200 \
    comRede npx tsx src/capturarParaguai.ts

  parou && break
  sleep 120

  marca "VOLTA $volta · 3/3 FOTOS"
  esperarTrava
  # ⚠️⚠️ 40 POR VOLTA, não 400 — medido em 20/10/2026: acima da posição ~50 o
  # Facebook estrangula a sessão e o aproveitamento cai de 20% para 0,6%
  # (30 sucessos em 5.055 tentativas). Rodada maior não rende e expõe a conta.
  # Ver o cabeçalho de backfillFotosPY.ts para a curva completa.
  FOTOS_LIMITE=40 FOTOS_PAUSA_MS=2500 \
    comRede npx tsx src/backfillFotosPY.ts

  # ⚠⚠ HASH, REANÚNCIO E TABELA SAÍRAM DAQUI (11/10/2026).
  #
  # Eles ficavam no fim da volta, e a volta leva ~2h por causa do catálogo:
  # anúncio novo passava horas sem hash e o duplicado aparecia na vitrine até
  # a volta fechar. Como nenhum dos três usa a sessão do Playwright, eles
  # podem rodar em PARALELO — ver limpeza20min.sh, que roda de 20 em 20 min.

  marca "VOLTA $volta encerrada — pausa de 5 min"
  sleep 300
done

marca "CICLO PARADO"
