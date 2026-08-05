import Link from "next/link";
import CompartilharWhats from "@/components/CompartilharWhats";

/** O "centro de comando": o dia da usuária cruzando todos os módulos. */
export default function HojeCard({ hoje, familia = null }) {
  const { dia, refeicao, limpeza, placar } = hoje;

  // Texto do dia pra mandar pra família num toque (só monta se tiver algo).
  const linhas = [`☀️ *Hoje, ${String(dia).toLowerCase()}*`];
  if (refeicao?.almoco) linhas.push(`🍽️ Almoço: ${refeicao.almoco}${refeicao.jantar ? ` · Jantar: ${refeicao.jantar}` : ""}`);
  if (limpeza?.foco) linhas.push(`🧹 Faxina: ${limpeza.foco}${limpeza.tarefas?.length ? ` (${limpeza.tarefas.slice(0, 3).join(", ")})` : ""}`);
  const textoHoje = linhas.length > 1 ? linhas.join("\n") : "";

  return (
    <div className="hoje">
      <div className="hoje-h">☀️ Hoje, {String(dia).toLowerCase()}</div>

      <Link href="/cozinha" className="hoje-row">
        <span className="hoje-ic">🍳</span>
        <div className="hoje-body">
          {refeicao ? (
            <>
              <div className="hoje-t">{refeicao.almoco || "Sem almoço definido"}</div>
              <div className="hoje-d">Almoço de hoje{refeicao.jantar ? ` · Jantar: ${refeicao.jantar}` : ""}</div>
            </>
          ) : (
            <>
              <div className="hoje-t">Monte o cardápio da semana</div>
              <div className="hoje-d">e eu te digo o almoço de cada dia</div>
            </>
          )}
        </div>
        <span className="hoje-go">›</span>
      </Link>

      <Link href="/casa" className="hoje-row">
        <span className="hoje-ic">🧹</span>
        <div className="hoje-body">
          {limpeza ? (
            <>
              <div className="hoje-t">Faxina de hoje: {limpeza.foco}</div>
              <div className="hoje-d">{limpeza.tarefas.slice(0, 2).join(" · ") || "toque pra ver as tarefas"}</div>
            </>
          ) : (
            <>
              <div className="hoje-t">Monte a rotina da casa</div>
              <div className="hoje-d">um foco leve por dia, sem se matar</div>
            </>
          )}
        </div>
        <span className="hoje-go">›</span>
      </Link>

      {placar && (
        <Link href="/filhos" className="hoje-row">
          <span className="hoje-ic">🧒</span>
          <div className="hoje-body">
            <div className="hoje-t">Placar da família: ⭐ {placar.estrelas}/{placar.meta}</div>
            <div className="hoje-d">marque os hábitos que os filhos cumpriram</div>
          </div>
          <span className="hoje-go">›</span>
        </Link>
      )}

      {textoHoje && (
        <div style={{ marginTop: 12 }}>
          <CompartilharWhats texto={textoHoje} familia={familia} logado label="Enviar o dia no WhatsApp" />
        </div>
      )}
    </div>
  );
}
