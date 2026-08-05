"use client";
import { useState } from "react";
import { salvarFamilia } from "@/app/comecar/actions";
import { Stepper, ChipsMulti } from "@/components/ui";

// Máscara (11) 99999-9999 enquanto digita.
function fmtTel(v) {
  let d = String(v || "").replace(/\D/g, ""); if (d.startsWith("55") && d.length > 11) d = d.slice(2); d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? "(" + d : "";
  if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
  if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
  return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7, 11);
}

export default function OnboardingForm({ inicial }) {
  const i = inicial || {};
  const [nomeMae, setNomeMae] = useState(i.nome_mae || "");
  const [maridoNome, setMaridoNome] = useState(i.marido_nome || "");
  const [maridoWhats, setMaridoWhats] = useState(i.marido_whatsapp ? fmtTel(i.marido_whatsapp) : "");
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
        marido_nome: maridoNome,
        marido_whatsapp: maridoWhats,
        filhos: filhos.map((f) => ({ nome: f.nome, idade: f.idade === "" ? null : Number(f.idade), whatsapp: f.whatsapp || "" })),
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

        <div className="field" style={{ marginBottom: 0 }}>
          <label>Seu marido <span className="hint">(o WhatsApp me deixa avisar ele num toque)</span></label>
          <div className="row" style={{ alignItems: "center" }}>
            <input className="inp" style={{ flex: 2 }} value={maridoNome} onChange={(e) => setMaridoNome(e.target.value)} placeholder="Nome" />
            <input className="inp" style={{ flex: 2 }} value={maridoWhats} inputMode="tel" maxLength={16}
              onChange={(e) => setMaridoWhats(fmtTel(e.target.value))} placeholder="WhatsApp (opcional)" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="field" style={{ marginBottom: 6 }}>
          <label>Seus filhos <span className="hint">(pra eu pensar nas porções, nas atividades e avisar os maiores)</span></label>
        </div>
        {filhos.map((f, idx) => (
          <div key={idx} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: idx < filhos.length - 1 ? "1px solid var(--line)" : 0 }}>
            <div className="row" style={{ marginBottom: 8, alignItems: "center" }}>
              <input className="inp" style={{ flex: 2 }} value={f.nome} onChange={(e) => setF(idx, "nome", e.target.value)} placeholder="Nome" />
              <input className="inp" style={{ flex: 1 }} type="number" min="0" max="30" value={f.idade} onChange={(e) => setF(idx, "idade", e.target.value)} placeholder="Idade" />
              {filhos.length > 1 && (
                <button type="button" className="chip" onClick={() => delFilho(idx)} style={{ flex: "none" }}>✕</button>
              )}
            </div>
            <input className="inp" value={f.whatsapp || ""} inputMode="tel" maxLength={16}
              onChange={(e) => setF(idx, "whatsapp", fmtTel(e.target.value))} placeholder="WhatsApp do filho (opcional — pros maiores)" />
          </div>
        ))}
        <button type="button" className="chip" onClick={addFilho}>＋ adicionar filho</button>
      </div>

      <div className="card">
        <div className="field">
          <label>Alguma restrição ou alergia na família? <span className="hint">(nunca vou usar esses ingredientes)</span></label>
          <ChipsMulti onChange={setRestricoes} outroLabel="Outra"
            opcoes={["Sem lactose", "Sem glúten", "Vegetariana", "Sem porco", "Diabetes", "Alergia a amendoim"]} />
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
