#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  LIMPEZA — hash das fotos novas, varredura de reanúncio e tabela.
#
#  ★★ POR QUE SAIU DE DENTRO DO CICLO (Gustavo, 11/10/2026): estes três passos
#  ficavam no FIM da volta, e a volta leva ~2h por causa do catálogo. Resultado
#  medido: anúncio novo passava horas sem hash, e o duplicado aparecia na
#  vitrine até a volta fechar — foi exatamente o par Kenton que ele viu.
#
#  ⚠️⚠️ NENHUM DOS TRÊS USA A SESSÃO DO PLAYWRIGHT. O hash lê do NOSSO bucket,
#  a varredura e a tabela só falam com o banco. Por isso podem rodar em
#  paralelo com a captura sem disputar a trava nem arriscar a conta — que é o
#  que torna este laço possível.
#
#  ⚠️ A ORDEM IMPORTA e é a mesma de antes: hash → reanúncio → tabela.
#    • hash antes do reanúncio, porque a foto é o critério mais forte e precisa
#      estar calculada para valer;
#    • tabela depois dos dois, porque reanúncio marcado muda quem entra na
#      mediana.
#
#  Parar: criar C:/claude/ciclo24h.parar (o mesmo sinal do ciclo).
# ═══════════════════════════════════════════════════════════════════════════

export PATH="/c/Program Files/nodejs:$PATH"
cd "$(dirname "$0")" || exit 1

# ★ Mesma guarda do ciclo24h.sh, e pelo mesmo motivo: a tarefa agendada do
# logon e o start manual podem coincidir. Vem antes de zerar o log.
TRAVA_LACO=/c/claude/limpeza.pid
if [ -f "$TRAVA_LACO" ] && kill -0 "$(cat "$TRAVA_LACO" 2>/dev/null)" 2>/dev/null; then
  echo "⛔ já existe uma limpeza rodando (pid $(cat "$TRAVA_LACO")). Saindo sem tocar no log."
  # ⚠️ Mesmo motivo do ciclo24h.sh: chamada pela tarefa agendada, a saída
  # padrão se perde no `start /B`. O log do lançador é o que fica legível.
  echo "[$(date '+%d/%m %H:%M:%S')] limpeza ja viva (pid $(cat "$TRAVA_LACO")) - nada a fazer" >> /c/claude/varredura-guarda.log
  exit 0
fi
echo $$ > "$TRAVA_LACO"
trap 'rm -f "$TRAVA_LACO"' EXIT

LOG=/c/claude/limpeza.log
PARAR=/c/claude/ciclo24h.parar
: > "$LOG"

marca() { echo "" >> "$LOG"; echo "═══ $(date '+%d/%m %H:%M:%S') · $* ═══" >> "$LOG"; }

while [ ! -f "$PARAR" ]; do
  marca "hash das fotos novas"
  npx tsx src/backfillHashPY.ts >> "$LOG" 2>&1
  echo "  saiu com $?" >> "$LOG"

  [ -f "$PARAR" ] && break

  marca "reanúncios"
  npx tsx src/marcarDuplicatasPY.ts --aplicar >> "$LOG" 2>&1
  echo "  saiu com $?" >> "$LOG"

  [ -f "$PARAR" ] && break

  marca "tabela de referência"
  npx tsx src/publicarTabelaPY.ts --gravar >> "$LOG" 2>&1
  echo "  saiu com $?" >> "$LOG"

  [ -f "$PARAR" ] && break

  # ★★ O CORRETOR DE PREÇO ENTRA AQUI, DEPOIS DA TABELA — e a ordem é a razão
  # de ele estar neste laço e não em outro: ele usa a mediana publicada como
  # ÁRBITRO para decidir se o preço do campo ou o da descrição é o verdadeiro.
  # Rodar antes da tabela seria julgar com a referência da volta passada.
  #
  # ⚠️ Pedido do Gustavo (15/10/2026): *"devemos revisar várias assim,
  # considerando o que tem média já verificada... e definirmos um comportamento
  # de extração da descrição e conferência com a mediana"*. É exatamente o que
  # este script faz — e ele existia desde 09/10 sem nunca ser chamado.
  #
  # ⚠️ Não raspa nada: as descrições já estão no banco. Custo zero de exposição
  # da conta, que é o recurso escasso aqui.
  marca "preço incoerente (descrição × campo, arbitrado pela tabela)"
  PY_APLICAR=1 npx tsx src/corrigirPrecoIncoerentePY.ts >> "$LOG" 2>&1
  echo "  saiu com $?" >> "$LOG"

  # ⚠️ 20 min é o teto de vida de um duplicado na vitrine. Mais curto que isso
  # só gastaria leitura do bucket sem ganho visível: o ciclo não entrega
  # anúncio novo mais rápido que isso.
  sleep 1200
done

marca "LIMPEZA PARADA"
