"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONDICOES, BANDEIRAS } from "@/lib/veredito";
import { criarRegra, atualizarRegra, excluirRegra, salvarFaixas } from "@/app/admin/veredito/actions";

const nomeCond = (id) => CONDICOES.find((c) => c.id === id)?.nome || id;
const rotBand = (id) => BANDEIRAS.find((b) => b.id === id)?.rotulo || id;
const precisaOpcao = (c) => ["igual", "diferente", "contem", "nao_contem"].includes(c);

function resumoValor(regra) {
  if (regra.condicao === "faixa") return `${regra.valor?.min ?? "?"}–${regra.valor?.max ?? "?"}`;
  if (precisaOpcao(regra.condicao)) return `"${regra.valor?.opcao ?? ""}"`;
  return "";
}

function RegraForm({ campos, regra, onDone }) {
  const router = useRouter();
  const [campoId, setCampoId] = useState(regra?.campo_id || campos[0]?.id || "");
  const [condicao, setCondicao] = useState(regra?.condicao || "igual");
  const [opcao, setOpcao] = useState(regra?.valor?.opcao || "");
  const [min, setMin] = useState(regra?.valor?.min ?? 0);
  const [max, setMax] = useState(regra?.valor?.max ?? 3);
  const [pontos, setPontos] = useState(regra?.pontos ?? 0);
  const [bandeira, setBandeira] = useState(regra?.bandeira || "amarelo");
  const [mensagem, setMensagem] = useState(regra?.mensagem || "");
  const [busy, setBusy] = useState(false);

  const campo = campos.find((c) => c.id === campoId);
  const opcoes = campo?.config?.opcoes || [];

  async function salvar() {
    setBusy(true);
    const valor = condicao === "faixa" ? { min, max } : precisaOpcao(condicao) ? { opcao } : null;
    const d = { campo_id: campoId, condicao, valor, pontos, bandeira, mensagem };
    try {
      if (regra) await atualizarRegra(regra.id, d);
      else await criarRegra(d);
      router.refresh();
      onDone();
    } finally { setBusy(false); }
  }

  return (
    <div className="cf">
      <label className="fld-l">Quando o campo…</label>
      <select className="fld" value={campoId} onChange={(e) => setCampoId(e.target.value)}>
        {campos.map((c) => <option key={c.id} value={c.id}>{c.etapaTitulo} · {c.rotulo}</option>)}
      </select>

      <label className="fld-l" style={{ marginTop: 10 }}>…tiver a condição</label>
      <select className="fld" value={condicao} onChange={(e) => setCondicao(e.target.value)}>
        {CONDICOES.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>

      {precisaOpcao(condicao) && (
        <>
          <label className="fld-l" style={{ marginTop: 10 }}>Opção de referência</label>
          {opcoes.length ? (
            <select className="fld" value={opcao} onChange={(e) => setOpcao(e.target.value)}>
              <option value="">—</option>
              {opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input className="fld" value={opcao} onChange={(e) => setOpcao(e.target.value)} placeholder="valor exato da resposta" />
          )}
        </>
      )}
      {condicao === "faixa" && (
        <div className="trio" style={{ marginTop: 10 }}>
          <div><label className="fld-l">Mín</label><input className="fld" type="number" value={min} onChange={(e) => setMin(e.target.value)} /></div>
          <div><label className="fld-l">Máx</label><input className="fld" type="number" value={max} onChange={(e) => setMax(e.target.value)} /></div>
        </div>
      )}

      <div className="trio" style={{ marginTop: 10 }}>
        <div>
          <label className="fld-l">Bandeira</label>
          <select className="fld" value={bandeira} onChange={(e) => setBandeira(e.target.value)}>
            {BANDEIRAS.map((b) => <option key={b.id} value={b.id}>{b.rotulo}</option>)}
          </select>
        </div>
        <div style={{ maxWidth: 90 }}>
          <label className="fld-l">Pontos</label>
          <input className="fld" type="number" value={pontos} onChange={(e) => setPontos(e.target.value)} />
        </div>
      </div>

      <label className="fld-l" style={{ marginTop: 10 }}>Mensagem do Veredito</label>
      <textarea className="fld" rows={2} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder='Ex.: "Pergunte quais pregadores ele admira — diz muito."' />

      <div className="cf-acts">
        <button type="button" className="pill" onClick={salvar} disabled={busy}>{busy ? "Salvando…" : "Salvar regra ✧"}</button>
        <button type="button" className="mini" onClick={onDone}>Cancelar</button>
      </div>
    </div>
  );
}

function FaixasEditor({ faixasIniciais }) {
  const router = useRouter();
  const [faixas, setFaixas] = useState(faixasIniciais.length ? faixasIniciais : [{ ate: 0, rotulo: "", bandeira: "amarelo", mensagem: "" }]);
  const [busy, setBusy] = useState(false);
  const up = (i, k, v) => setFaixas(faixas.map((f, j) => (j === i ? { ...f, [k]: v } : f)));

  async function salvar() {
    setBusy(true);
    try { await salvarFaixas(faixas); router.refresh(); } finally { setBusy(false); }
  }

  return (
    <div className="cf">
      <p className="c-p" style={{ marginBottom: 8 }}>A pontuação total cai na 1ª faixa cujo limite (≤) ela alcança. Ordene do menor pro maior.</p>
      {faixas.map((f, i) => (
        <div key={i} className="faixa-row">
          <input className="fld" style={{ maxWidth: 70 }} type="number" value={f.ate} onChange={(e) => up(i, "ate", e.target.value)} title="até (pontos ≤)" />
          <input className="fld" value={f.rotulo} onChange={(e) => up(i, "rotulo", e.target.value)} placeholder="Rótulo (ex.: Requer discernimento)" />
          <select className="fld" style={{ maxWidth: 120 }} value={f.bandeira} onChange={(e) => up(i, "bandeira", e.target.value)}>
            {BANDEIRAS.map((b) => <option key={b.id} value={b.id}>{b.rotulo}</option>)}
          </select>
          <button type="button" className="mini danger" onClick={() => setFaixas(faixas.filter((_, j) => j !== i))}>✕</button>
          <textarea className="fld" style={{ flexBasis: "100%" }} rows={1} value={f.mensagem} onChange={(e) => up(i, "mensagem", e.target.value)} placeholder="Mensagem do parecer" />
        </div>
      ))}
      <div className="cf-acts">
        <button type="button" className="mini" onClick={() => setFaixas([...faixas, { ate: 0, rotulo: "", bandeira: "amarelo", mensagem: "" }])}>＋ faixa</button>
        <button type="button" className="pill" onClick={salvar} disabled={busy}>{busy ? "Salvando…" : "Salvar faixas"}</button>
      </div>
    </div>
  );
}

export default function ConstrutorVeredito({ campos, regras, faixasIniciais }) {
  const router = useRouter();
  const [form, setForm] = useState(null); // { regra } | { regra: null }
  async function apagar(r) { if (confirm("Excluir esta regra?")) { await excluirRegra(r.id); router.refresh(); } }
  const nomeCampo = (id) => { const c = campos.find((x) => x.id === id); return c ? c.rotulo : "campo removido"; };

  return (
    <div>
      <h2 className="sec-h" style={{ marginTop: 6 }}>Faixas do parecer</h2>
      <FaixasEditor faixasIniciais={faixasIniciais} />

      <h2 className="sec-h">Regras por campo</h2>
      <div className="shelf">
        {regras.length === 0 && <p className="muted" style={{ textAlign: "left" }}>Nenhuma regra ainda.</p>}
        {regras.map((r) => (
          <div key={r.id} className={"regra-card b-" + r.bandeira}>
            <div className="regra-top">
              <span className="tag">{nomeCampo(r.campo_id)}</span>
              <span className="regra-cond">{nomeCond(r.condicao)} {resumoValor(r)}</span>
              <span className="regra-pts">{r.pontos > 0 ? `+${r.pontos}` : r.pontos}</span>
              <button className="mini" onClick={() => setForm({ regra: r })}>✎</button>
              <button className="mini danger" onClick={() => apagar(r)}>✕</button>
            </div>
            <div className="regra-msg">{rotBand(r.bandeira)} — {r.mensagem || <em>sem mensagem</em>}</div>
          </div>
        ))}
      </div>

      {form ? (
        <RegraForm campos={campos} regra={form.regra} onDone={() => setForm(null)} />
      ) : (
        <button className="add-etapa" onClick={() => setForm({ regra: null })}>＋ Nova regra</button>
      )}
    </div>
  );
}
