"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { novoQuiz, salvarQuiz, excluirQuiz, alternarAtivoQuiz, definirQuizRaiz } from "@/app/admin/quizzes/actions";

const FAIXA_CLS = [
  { v: "green", t: "🟢 Bom (Cavalheiro)" },
  { v: "amber", t: "🟡 Atenção" },
  { v: "red", t: "🔴 Alerta (Fuja)" },
];

export default function ConstrutorQuizzes({ quizzes, baseUrl }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState("");
  const [raizMsg, setRaizMsg] = useState("");

  async function acao(fn) { setBusy(true); try { const r = await fn(); if (r?.erro) alert(r.erro); router.refresh(); return r; } finally { setBusy(false); } }

  function abrir(q) {
    const d = q.dados || {};
    setForm({
      id: q.id, slug: q.slug, titulo: q.titulo,
      lead: d.lead || "",
      questoes: (d.questoes || []).map((x) => ({ t: x.t || "", opcoes: (x.opcoes || []).map((o) => ({ t: o.t || "", p: o.p ?? 0 })) })),
      faixas: (d.faixas || []).map((f) => ({ min: f.min ?? 0, cls: f.cls || "amber", titulo: f.titulo || "", texto: f.texto || "" })),
    });
    setEditId(q.id); setMsg("");
  }

  // ── editor (mutadores imutáveis) ──
  const upd = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setQ = (i, patch) => setForm((f) => ({ ...f, questoes: f.questoes.map((q, j) => j === i ? { ...q, ...patch } : q) }));
  const setOpc = (qi, oi, patch) => setForm((f) => ({ ...f, questoes: f.questoes.map((q, j) => j === qi ? { ...q, opcoes: q.opcoes.map((o, k) => k === oi ? { ...o, ...patch } : o) } : q) }));
  const addQ = () => setForm((f) => ({ ...f, questoes: [...f.questoes, { t: "", opcoes: [{ t: "", p: 3 }, { t: "", p: 1 }, { t: "", p: 0 }] }] }));
  const delQ = (i) => setForm((f) => ({ ...f, questoes: f.questoes.filter((_, j) => j !== i) }));
  const addOpc = (qi) => setForm((f) => ({ ...f, questoes: f.questoes.map((q, j) => j === qi ? { ...q, opcoes: [...q.opcoes, { t: "", p: 0 }] } : q) }));
  const delOpc = (qi, oi) => setForm((f) => ({ ...f, questoes: f.questoes.map((q, j) => j === qi ? { ...q, opcoes: q.opcoes.filter((_, k) => k !== oi) } : q) }));
  const setFx = (i, patch) => setForm((f) => ({ ...f, faixas: f.faixas.map((x, j) => j === i ? { ...x, ...patch } : x) }));
  const addFx = () => setForm((f) => ({ ...f, faixas: [...f.faixas, { min: 0, cls: "amber", titulo: "", texto: "" }] }));
  const delFx = (i) => setForm((f) => ({ ...f, faixas: f.faixas.filter((_, j) => j !== i) }));

  async function salvar() {
    setMsg(""); setBusy(true);
    try {
      const r = await salvarQuiz(form.id, { slug: form.slug, titulo: form.titulo, dados: { lead: form.lead, questoes: form.questoes, faixas: form.faixas } });
      if (r?.erro) { setMsg(r.erro); return; }
      setEditId(null); setForm(null); router.refresh();
    } finally { setBusy(false); }
  }

  // ── EDITOR ────────────────────────────────────────────────────────────────
  if (editId && form) {
    return (
      <div>
        <div className="adm-eh"><h2>Editar quiz</h2>
          <button type="button" className="chip" onClick={() => { setEditId(null); setForm(null); }}>← Voltar</button></div>

        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div>
            <label className="fld-l">Título</label>
            <input className="fld" value={form.titulo} onChange={(e) => upd({ titulo: e.target.value })} placeholder="Ex.: Ele é um Cavalheiro ou um Libertino?" />
          </div>
          <div>
            <label className="fld-l">Slug (URL do anúncio: <code>/investigar?q=…</code>)</label>
            <input className="fld" value={form.slug} onChange={(e) => upd({ slug: e.target.value })} placeholder="cavalheiro-ou-libertino" />
          </div>
          <div>
            <label className="fld-l">Frase de abertura (opcional)</label>
            <textarea className="fld" rows={2} value={form.lead} onChange={(e) => upd({ lead: e.target.value })} />
          </div>
        </div>

        <h3 style={{ margin: "20px 0 8px", font: "700 16px var(--disp)", color: "var(--wine)" }}>Perguntas</h3>
        {form.questoes.map((q, qi) => (
          <div key={qi} className="card" style={{ marginBottom: 12 }}>
            <div className="adm-eh"><h2 style={{ fontSize: 15 }}>Pergunta {qi + 1}</h2>
              <button type="button" className="chip chip-del" onClick={() => delQ(qi)}>🗑️</button></div>
            <textarea className="fld" rows={2} value={q.t} onChange={(e) => setQ(qi, { t: e.target.value })} placeholder="Enunciado da pergunta" />
            <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
              {q.opcoes.map((o, oi) => (
                <div key={oi} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input className="fld" style={{ flex: 1 }} value={o.t} onChange={(e) => setOpc(qi, oi, { t: e.target.value })} placeholder="Texto da opção" />
                  <input className="fld" style={{ width: 62 }} type="number" value={o.p} onChange={(e) => setOpc(qi, oi, { p: Number(e.target.value) })} title="pontos" />
                  <button type="button" className="chip chip-del" onClick={() => delOpc(qi, oi)}>✕</button>
                </div>
              ))}
              <button type="button" className="chip" onClick={() => addOpc(qi)}>＋ opção</button>
            </div>
          </div>
        ))}
        <button type="button" className="chip" onClick={addQ}>＋ nova pergunta</button>

        <h3 style={{ margin: "22px 0 8px", font: "700 16px var(--disp)", color: "var(--wine)" }}>Vereditos (faixas por pontuação)</h3>
        <p className="muted" style={{ textAlign: "left", margin: "0 0 8px" }}>Cada faixa vale do <b>mín</b> de pontos pra cima (a de maior mín que a pessoa alcançar vence).</p>
        {form.faixas.map((f, i) => (
          <div key={i} className="card" style={{ marginBottom: 10, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input className="fld" style={{ width: 90 }} type="number" value={f.min} onChange={(e) => setFx(i, { min: Number(e.target.value) })} title="pontos mín." placeholder="mín" />
              <select className="fld" style={{ flex: 1 }} value={f.cls} onChange={(e) => setFx(i, { cls: e.target.value })}>
                {FAIXA_CLS.map((c) => <option key={c.v} value={c.v}>{c.t}</option>)}
              </select>
              <button type="button" className="chip chip-del" onClick={() => delFx(i)}>🗑️</button>
            </div>
            <input className="fld" value={f.titulo} onChange={(e) => setFx(i, { titulo: e.target.value })} placeholder="Título do veredito (ex.: Fuja para as Colinas!)" />
            <textarea className="fld" rows={2} value={f.texto} onChange={(e) => setFx(i, { texto: e.target.value })} placeholder="Texto do veredito" />
          </div>
        ))}
        <button type="button" className="chip" onClick={addFx}>＋ faixa</button>

        {msg && <p className="fld-err">{msg}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button type="button" className="pill" onClick={salvar} disabled={busy} style={{ flex: 1, justifyContent: "center", marginTop: 0 }}>{busy ? "Salvando…" : "Salvar quiz"}</button>
          <button type="button" className="chip" onClick={() => { setEditId(null); setForm(null); }}>Cancelar</button>
        </div>
      </div>
    );
  }

  // ── LISTA ─────────────────────────────────────────────────────────────────
  const raizId = quizzes.find((q) => q.raiz)?.id || "";
  return (
    <div>
      <div className="card" style={{ marginBottom: 14, display: "grid", gap: 6 }}>
        <label className="fld-l">★ Quiz padrão na raiz <code>/investigar</code> (sem <code>?q=</code>)
          {raizMsg && <span style={{ marginLeft: 8, color: "#7fd6a0", fontWeight: 700 }}>{raizMsg}</span>}</label>
        <select className="fld" value={raizId} disabled={busy}
          onChange={async (e) => { setRaizMsg(""); await acao(() => definirQuizRaiz(e.target.value)); setRaizMsg("✓ Salvo automaticamente"); }}>
          <option value="">— nenhum (usa o ativo mais recente) —</option>
          {quizzes.map((q) => <option key={q.id} value={q.id}>{q.titulo}{q.ativo ? "" : " (inativo)"}</option>)}
        </select>
        <p className="opt">Salva sozinho ao escolher (sem botão) — é o quiz que abre quando o anúncio aponta pro <code>/investigar</code> puro.</p>
      </div>

      <button type="button" className="chip" disabled={busy} onClick={() => acao(novoQuiz)}>＋ Novo quiz</button>
      <div className="shelf" style={{ marginTop: 12 }}>
        {quizzes.map((q) => {
          const nQ = (q.dados?.questoes || []).length;
          const url = `${baseUrl}/investigar?q=${q.slug}`;
          return (
            <div key={q.id} className="memb">
              <div className="memb-top">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="memb-nome">{q.titulo}
                    {q.raiz && <span className="tag" style={{ marginLeft: 6, background: "var(--gold)", color: "#2a1710" }}>★ RAIZ</span>}
                    {q.ativo && <span className="tag" style={{ marginLeft: 6, background: "#2f6b48", color: "#fff" }}>ATIVO</span>}</div>
                  <div className="memb-email">{nQ} pergunta(s) · <code>{q.slug}</code></div>
                </div>
              </div>
              <div className="memb-chips">
                <button type="button" className={"chip" + (q.ativo ? " on" : "")} disabled={busy} onClick={() => acao(() => alternarAtivoQuiz(q.id, !q.ativo))}>{q.ativo ? "✓ Ativo" : "Ativar"}</button>
                <button type="button" className="chip" onClick={() => abrir(q)}>✏️ Editar</button>
                <button type="button" className="chip" onClick={() => { navigator.clipboard?.writeText(url); alert("Link copiado:\n" + url); }}>🔗 Link</button>
                <button type="button" className="chip chip-del" disabled={busy}
                  onClick={() => { if (confirm(`Excluir o quiz "${q.titulo}"?`)) acao(() => excluirQuiz(q.id)); }}>🗑️ Excluir</button>
              </div>
            </div>
          );
        })}
        {quizzes.length === 0 && <p className="muted" style={{ textAlign: "left" }}>Nenhum quiz ainda. Clique em <b>＋ Novo quiz</b> (já vem com o "Cavalheiro ou Libertino" de base pra editar).</p>}
      </div>
    </div>
  );
}
