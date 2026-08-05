"use client";
import { useState } from "react";
import { salvarFamilia } from "@/app/comecar/actions";

export default function OnboardingForm({ inicial }) {
  const i = inicial || {};
  const [nomeMae, setNomeMae] = useState(i.nome_mae || "");
  const [filhos, setFilhos] = useState(Array.isArray(i.filhos) && i.filhos.length ? i.filhos : [{ nome: "", idade: "" }]);
  const [trabalhaFora, setTrabalhaFora] = useState(!!i.trabalha_fora);
  const [restricoes, setRestricoes] = useState(i.restricoes || "");
  const [comodos, setComodos] = useState(i.comodos || "");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const setF = (idx, campo, v) => setFilhos((c) => c.map((f, j) => (j === idx ? { ...f, [campo]: v } : f)));
  const addFilho = () => setFilhos((c) => [...c, { nome: "", idade: "" }]);
  const delFilho = (idx) => setFilhos((c) => c.filter((_, j) => j !== idx));

  async function enviar(e) {
    e.preventDefault();
    setErro(""); setBusy(true);
    try {
      const r = await salvarFamilia({
        nome_mae: nomeMae,
        filhos: filhos.map((f) => ({ nome: f.nome, idade: f.idade === "" ? null : Number(f.idade) })),
        trabalha_fora: trabalhaFora,
        restricoes, comodos: comodos === "" ? null : Number(comodos),
      });
      if (r?.erro) setErro(r.erro); // sucesso redireciona no servidor
    } catch { setErro("Não consegui salvar agora. Tente de novo."); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card">
        <div className="field">
          <label>Como você quer que eu te chame?</label>
          <input className="inp" value={nomeMae} onChange={(e) => setNomeMae(e.target.value)} placeholder="Seu nome ou apelido" />
        </div>

        <div className="field" style={{ marginBottom: 6 }}>
          <label>Seus filhos <span className="hint">(pra eu pensar nas porções e nas atividades)</span></label>
        </div>
        {filhos.map((f, idx) => (
          <div key={idx} className="row" style={{ marginBottom: 8, alignItems: "center" }}>
            <input className="inp" style={{ flex: 2 }} value={f.nome} onChange={(e) => setF(idx, "nome", e.target.value)} placeholder="Nome" />
            <input className="inp" style={{ flex: 1 }} type="number" min="0" max="30" value={f.idade} onChange={(e) => setF(idx, "idade", e.target.value)} placeholder="Idade" />
            {filhos.length > 1 && (
              <button type="button" className="chip" onClick={() => delFilho(idx)} style={{ flex: "none" }}>✕</button>
            )}
          </div>
        ))}
        <button type="button" className="chip" onClick={addFilho}>＋ adicionar filho</button>
      </div>

      <div className="card">
        <div className="field">
          <label>Alguma restrição ou alergia na família? <span className="hint">(nunca vou usar esses ingredientes)</span></label>
          <input className="inp" value={restricoes} onChange={(e) => setRestricoes(e.target.value)} placeholder="Ex.: sem lactose, alergia a amendoim…" />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Você trabalha fora?</label>
          <div className="chips">
            <button type="button" className={"chip" + (trabalhaFora ? " on" : "")} onClick={() => setTrabalhaFora(true)}>Sim</button>
            <button type="button" className={"chip" + (!trabalhaFora ? " on" : "")} onClick={() => setTrabalhaFora(false)}>Não / cuido do lar</button>
          </div>
        </div>
      </div>

      {erro && <p className="erro">{erro}</p>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Guardando…" : "Pronto, é isso 💛"}</button>
    </form>
  );
}
