import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { usuariaAtual } from "@/lib/auth";
import { carregarEsquema, totalCampos, nivel, respondida, ehMissao } from "@/lib/dossieDb";
import { avaliarVeredito } from "@/lib/veredito";
import CamposDossie from "@/components/CamposDossie";
import { salvarRespostas } from "../actions";

export const dynamic = "force-dynamic";

export default async function FichaDossie({ params }) {
  const user = await usuariaAtual();
  if (!user) redirect(`/entrar?redirect=/dossie/${params.id}`);

  const sb = await criarSupabaseServer();
  const [{ data: dossie }, esquema, regrasRes, cfgRes] = await Promise.all([
    sb.from("corte_dossies").select("id, nome, igreja, emblema").eq("id", params.id).maybeSingle(),
    carregarEsquema(sb),
    sb.from("corte_regras").select("*").eq("ativo", true).order("ordem"),
    sb.from("corte_config").select("valor").eq("chave", "veredito_faixas").maybeSingle(),
  ]);
  if (!dossie) notFound();

  const { data: respostas } = await sb
    .from("corte_respostas")
    .select("campo_id, valor")
    .eq("dossie_id", params.id)
    .not("campo_id", "is", null);

  const valores = {};
  for (const r of respostas || []) valores[r.campo_id] = r.valor;

  const total = totalCampos(esquema);
  let respondidos = 0;
  const missoes = [];
  for (const etapa of esquema) {
    for (const campo of etapa.campos) {
      const v = valores[campo.id];
      if (respondida(v)) respondidos++;
      if (ehMissao(v)) missoes.push(campo.rotulo);
    }
  }
  const n = nivel(respondidos, total);
  const faixas = Array.isArray(cfgRes.data?.valor) ? cfgRes.data.valor : [];
  const veredito = avaliarVeredito({ valores, regras: regrasRes.data || [], faixas });
  const salvar = salvarRespostas.bind(null, params.id);

  return (
    <main className="screen">
      <Link href="/dossie" className="muted" style={{ display: "block", textAlign: "left", padding: 0, marginBottom: 8 }}>← dossiês</Link>

      <div className="dz-head">
        <div className="dz-emb">{dossie.emblema || "♟"}</div>
        <div>
          <h1 className="h-title" style={{ fontSize: 26 }}>{dossie.nome}</h1>
          <p className="h-sub" style={{ marginTop: 2 }}>{dossie.igreja || "igreja não informada"}</p>
        </div>
      </div>

      <section className="card dark" style={{ marginTop: 16 }}>
        <div className="c-k">Nível de Conhecimento · {n.selo}</div>
        <div className="bar big" style={{ margin: "10px 0 8px" }}><span style={{ width: `${n.pct}%` }} /></div>
        <div className="c-p" style={{ color: "#e9ddc2" }}>{n.pct}% · {n.msg}</div>
      </section>

      {veredito.houveResposta && veredito.faixa && (
        <section className={"card vd b-" + veredito.faixa.bandeira} style={{ marginTop: 14 }}>
          <div className="c-k">O Veredito da Lady</div>
          <div className="c-t">{veredito.faixa.rotulo}</div>
          <div className="c-p">{veredito.faixa.mensagem}</div>
          {veredito.sinais.length > 0 && (
            <ul className="sinais">
              {veredito.sinais.map((s, i) => (
                <li key={i} className={"sinal s-" + s.bandeira}><span className="dot" />{s.mensagem}</li>
              ))}
            </ul>
          )}
          <p className="vd-nota">Isto é discernimento, não sentença — observe, pergunte e leve ao Senhor em oração.</p>
        </section>
      )}

      {missoes.length > 0 && (
        <section className="card" style={{ marginTop: 14 }}>
          <div className="c-k">Missões da vida real</div>
          <p className="c-p" style={{ marginBottom: 8 }}>Descubra — observando e conversando — para completar o dossiê:</p>
          <ul className="miss">{missoes.slice(0, 5).map((m, i) => <li key={i}>{m}</li>)}</ul>
        </section>
      )}

      <form action={salvar}>
        <CamposDossie esquema={esquema} valores={valores} />
        <button className="pill" type="submit" style={{ width: "100%", justifyContent: "center", margin: "6px 0 4px" }}>
          Salvar o dossiê ✧
        </button>
      </form>

      <p className="muted">{respondidos} de {total} pistas reunidas.</p>
    </main>
  );
}
