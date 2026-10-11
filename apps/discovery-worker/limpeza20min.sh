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

  # ⚠️ 20 min é o teto de vida de um duplicado na vitrine. Mais curto que isso
  # só gastaria leitura do bucket sem ganho visível: o ciclo não entrega
  # anúncio novo mais rápido que isso.
  sleep 1200
done

marca "LIMPEZA PARADA"
