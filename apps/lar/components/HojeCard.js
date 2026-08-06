import Link from "next/link";
import CompartilharWhats from "@/components/CompartilharWhats";

/** O "centro de comando": o dia da usuária cruzando todos os módulos. */
export default function HojeCard({ hoje, familia = null }) {
  const { dia, refeicao, limpeza, placar, agenda, lembretes } = hoje;

  // Texto do dia pra mandar pra família num toque (só monta se tiver algo).
  const linhas = [`☀️ *Hoje, ${String(dia).toLowerCase()}*`];
  if (agenda?.length) linhas.push(...agenda.map((e) => `📅 ${e.hora ? e.hora + " " : ""}${e.titulo}${e.quem ? ` — ${e.quem}` : ""}`));
  if (lembretes?.length) linhas.push(...lembretes.map((t) => `🔔 ${t}`));
  if (refeicao?.almoco) linhas.push(`🍽️ Almoço: ${refeicao.almoco}${refeicao.jantar ? ` · Jantar: ${refeicao.jantar}` : ""}`);
  if (limpeza?.foco) linhas.push(`🧹 Faxina: ${limpeza.foco}${limpeza.tarefas?.length ? ` (${limpeza.tarefas.slice(0, 3).join(", ")})` : ""}`);
  const textoHoje = linhas.length > 1 ? linhas.join("\n") : "";

  return (
    <div className="hoje">
      <div className="hoje-h">☀️ Hoje, {String(dia).toLowerCase()}</div>

      {agenda?.length > 0 && (
        <Link href="/agenda" className="hoje-row">
          <span className="hoje-ic">📅</span>
          <div className="hoje-body">
            <div className="hoje-t">{agenda[0].hora ? agenda[0].hora + " · " : ""}{agenda[0].titulo}</div>
            <div className="hoje-d">{agenda[0].quem ? agenda[0].quem : "compromisso de hoje"}{agenda.length > 1 ? ` · +${agenda.length - 1}` : ""}</div>
          </div>
          <span className="hoje-go">›</span>
        </Link>
      )}

      {lembretes?.length > 0 && (
        <Link href="/listas" className="hoje-row">
          <span className="hoje-ic">🔔</span>
          <div className="hoje-body">
            <div className="hoje-t">{lembretes[0]}</div>
            <div className="hoje-d">Não esquecer{lembretes.length > 1 ? ` · +${lembretes.length - 1}` : ""}</div>
          </div>
          <span className="hoje-go">›</span>
        </Link>
      )}

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
