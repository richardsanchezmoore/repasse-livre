"use client";
import { useState } from "react";
import { salvarReceita, favoritarReceita, apagarReceita } from "@/app/receitas/actions";
import CompartilharWhats from "@/components/CompartilharWhats";

export default function ReceitasBoard({ iniciais = [], familia = null, logado = false }) {
  const [receitas, setReceitas] = useState(iniciais);
  const [abrir, setAbrir] = useState(iniciais.length === 0);
  const [nome, setNome] = useState("");
  const [ingredientes, setIngredientes] = useState("");
  const [preparo, setPreparo] = useState("");
  const [aberta, setAberta] = useState(null); // receita expandida
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    setErro("");
    if (!nome.trim()) { setErro("Dê um nome à receita. 💛"); return; }
    setBusy(true);
    const r = await salvarReceita({ nome: nome.trim(), ingredientes, preparo });
    setBusy(false);
    if (r?.erro) { setErro(r.erro); return; }
    const ings = ingredientes.split("\n").map((s) => s.trim()).filter(Boolean).map((item) => ({ item }));
    setReceitas((c) => [{ id: r.id, nome: nome.trim(), ingredientes: ings, preparo: preparo.trim() || null, favorita: false }, ...c]);
    setNome(""); setIngredientes(""); setPreparo(""); setAbrir(false);
  }
  async function favoritar(rc) {
    setReceitas((c) => c.map((x) => (x.id === rc.id ? { ...x, favorita: !x.favorita } : x)));
    await favoritarReceita({ id: rc.id, favorita: !rc.favorita });
  }
  async function apagar(id) {
    if (!confirm("Apagar esta receita?")) return;
    setReceitas((c) => c.filter((x) => x.id !== id));
    await apagarReceita(id);
  }
  function textoWhats(rc) {
    const ings = (rc.ingredientes || []).map((i) => `• ${i.item}`).join("\n");
    return `🍲 *${rc.nome}*\n${ings}${rc.preparo ? `\n\n_Modo de fazer:_\n${rc.preparo}` : ""}`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!abrir && <button className="btn" onClick={() => setAbrir(true)}>＋ Guardar uma receita</button>}

      {abrir && (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Nome da receita</label>
            <input className="inp" value={nome} placeholder="Ex.: Bolo de fubá da vovó" onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Ingredientes <span className="hint">(um por linha)</span></label>
            <textarea className="inp" rows={4} value={ingredientes} placeholder={"2 xíc. de fubá\n1 xíc. de açúcar\n3 ovos…"} onChange={(e) => setIngredientes(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Modo de fazer <span className="hint">(opcional)</span></label>
            <textarea className="inp" rows={3} value={preparo} placeholder="Misture tudo e asse por 40 min…" onChange={(e) => setPreparo(e.target.value)} />
          </div>
          {erro && <p className="erro">{erro}</p>}
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" style={{ flex: 2 }} onClick={salvar} disabled={busy}>{busy ? "Guardando…" : "💾 Guardar no caderno"}</button>
            {receitas.length > 0 && <button className="btn ghost" style={{ flex: 1 }} onClick={() => setAbrir(false)}>Fechar</button>}
          </div>
        </div>
      )}

      {receitas.length === 0 && !abrir && <p className="muted" style={{ textAlign: "center" }}>Seu caderno está vazio — guarde a primeira receita da família. 💛</p>}

      <div style={{ display: "grid", gap: 8 }}>
        {receitas.map((rc) => (
          <div key={rc.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <button className="fx-comodo" onClick={() => setAberta(aberta === rc.id ? null : rc.id)}>
              <span style={{ fontSize: 20 }}>{rc.favorita ? "⭐" : "🍽️"}</span>
              <span className="fx-comodo-nome">{rc.nome}</span>
              <span className={"devoc-chev" + (aberta === rc.id ? " up" : "")}>⌄</span>
            </button>
            {aberta === rc.id && (
              <div style={{ padding: "0 14px 14px", display: "grid", gap: 10 }}>
                {rc.ingredientes?.length > 0 && (
                  <div>
                    <div className="lista-secao">Ingredientes</div>
                    <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 3 }}>
                      {rc.ingredientes.map((i, k) => <li key={k} style={{ fontSize: 14.5 }}>{i.item}</li>)}
                    </ul>
                  </div>
                )}
                {rc.preparo && <div><div className="lista-secao">Modo de fazer</div><p style={{ fontSize: 14.5, lineHeight: 1.5, whiteSpace: "pre-wrap", margin: 0 }}>{rc.preparo}</p></div>}
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <button className="chip" onClick={() => favoritar(rc)}>{rc.favorita ? "⭐ Favorita" : "☆ Favoritar"}</button>
                  <button className="chip" onClick={() => apagar(rc.id)}>🗑️ Apagar</button>
                </div>
                <CompartilharWhats texto={textoWhats(rc)} familia={familia} logado={logado} label="Enviar a receita no WhatsApp" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
