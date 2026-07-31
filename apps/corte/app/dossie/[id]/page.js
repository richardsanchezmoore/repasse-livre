import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { usuariaAtual } from "@/lib/auth";
import { CAPITULOS, TOTAL_CAMPOS, nivel, respondida, ehMissao } from "@/lib/dossie";
import { salvarRespostas } from "../actions";

export const dynamic = "force-dynamic";

export default async function FichaDossie({ params }) {
  const user = await usuariaAtual();
  if (!user) redirect(`/entrar?redirect=/dossie/${params.id}`);

  const sb = await criarSupabaseServer();
  const { data: dossie } = await sb
    .from("corte_dossies")
    .select("id, nome, igreja, emblema")
    .eq("id", params.id)
    .maybeSingle();
  if (!dossie) notFound();

  const { data: respostas } = await sb
    .from("corte_respostas")
    .select("capitulo, campo, valor")
    .eq("dossie_id", params.id);

  const mapa = {};
  for (const r of respostas || []) mapa[`${r.capitulo}__${r.campo}`] = r.valor;

  const respondidos = CAPITULOS.reduce(
    (n, c) => n + c.campos.filter((f) => respondida(mapa[`${c.id}__${f.id}`])).length,
    0
  );
  const n = nivel(respondidos);

  // Missões: campos vazios ou "Não sei"
  const missoes = [];
  for (const c of CAPITULOS) {
    for (const f of c.campos) {
      if (ehMissao(mapa[`${c.id}__${f.id}`])) missoes.push(f.label);
    }
  }

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

      {/* Nível de Conhecimento */}
      <section className="card dark" style={{ marginTop: 16 }}>
        <div className="c-k">Nível de Conhecimento · {n.selo}</div>
        <div className="bar big" style={{ margin: "10px 0 8px" }}><span style={{ width: `${n.pct}%` }} /></div>
        <div className="c-p" style={{ color: "#e9ddc2" }}>{n.pct}% · {n.msg}</div>
      </section>

      {missoes.length > 0 && (
        <section className="card" style={{ marginTop: 14 }}>
          <div className="c-k">Missões da vida real</div>
          <p className="c-p" style={{ marginBottom: 8 }}>Descubra — observando e conversando — para completar o dossiê:</p>
          <ul className="miss">
            {missoes.slice(0, 5).map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </section>
      )}

      <form action={salvar}>
        {CAPITULOS.map((c) => (
          <section key={c.id} className="cap">
            <h2 className="cap-h"><span>{c.icone}</span> {c.titulo}</h2>
            {c.campos.map((f) => {
              const val = mapa[`${c.id}__${f.id}`] ?? "";
              const nome = `resp__${c.id}__${f.id}`;
              return (
                <div key={f.id} className="fgrp">
                  <label className="fld-l">{f.label}{f.dica ? <span className="opt"> ({f.dica})</span> : null}</label>
                  {f.tipo === "opcao" ? (
                    <select className="fld" name={nome} defaultValue={val}>
                      <option value="">—</option>
                      {f.opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="fld" name={nome} defaultValue={val} placeholder="…" />
                  )}
                </div>
              );
            })}
          </section>
        ))}

        <button className="pill" type="submit" style={{ width: "100%", justifyContent: "center", margin: "6px 0 4px" }}>
          Salvar o dossiê ✧
        </button>
      </form>

      <p className="muted">{respondidos} de {TOTAL_CAMPOS} pistas reunidas.</p>
    </main>
  );
}
