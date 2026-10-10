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

LOG=/c/claude/ciclo24h.log
PARAR=/c/claude/ciclo24h.parar
: > "$LOG"
rm -f "$PARAR"

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
while [ ! -f "$PARAR" ]; do
  volta=$((volta + 1))

  marca "VOLTA $volta · 1/3 CATÁLOGO (busca por termo)"
  esperarTrava
  PY_MODO=termo PY_TERMOS_POR_RODADA=25 PY_SEM_FOTO=1 PY_MAX_ITENS=250 \
    PY_ESPERA_ITEM=1500 PY_PACING=1200 \
    npx tsx src/capturarParaguai.ts >> "$LOG" 2>&1
  echo "  catálogo saiu com $?" >> "$LOG"

  [ -f "$PARAR" ] && break
  sleep 120

  marca "VOLTA $volta · 2/3 FAIXAS (autoload)"
  esperarTrava
  PY_AUTOLOAD=1 PY_FAIXAS=12 PY_SEM_FOTO=1 \
    PY_ROLAGENS=25 PY_PAUSA_ROLAGEM=2200 PY_PACING=1200 \
    npx tsx src/capturarParaguai.ts >> "$LOG" 2>&1
  echo "  faixas saiu com $?" >> "$LOG"

  [ -f "$PARAR" ] && break
  sleep 120

  marca "VOLTA $volta · 3/3 FOTOS"
  esperarTrava
  FOTOS_LIMITE=200 FOTOS_PAUSA_MS=1500 \
    npx tsx src/backfillFotosPY.ts >> "$LOG" 2>&1
  echo "  fotos saiu com $?" >> "$LOG"

  # ★★ Republica a TABELA a cada volta: anúncio novo que entrou já entra na
  # mediana do mês. Não usa a sessão do Facebook, então não precisa da trava.
  #
  # ⚠️ Enquanto a migração 0093 não rodar, isto falha e segue — de propósito.
  # Melhor logar o erro do que travar a captação por causa da tabela.
  marca "VOLTA $volta · tabela de referência"
  npx tsx src/publicarTabelaPY.ts --gravar >> "$LOG" 2>&1
  echo "  tabela saiu com $?" >> "$LOG"

  marca "VOLTA $volta encerrada — pausa de 5 min"
  sleep 300
done

marca "CICLO PARADO"
