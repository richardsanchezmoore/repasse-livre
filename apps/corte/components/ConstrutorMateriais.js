"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import SeletorIcone from "@/components/SeletorIcone";
import { criarMaterial, atualizarMaterial, alternarAtivoMaterial, excluirMaterial } from "@/app/admin/materiais/actions";

const TIPOS = [{ v: "ebook", n: "E-book" }, { v: "bonus", n: "Bônus" }, { v: "devocional", n: "Devocional" }];
const ACESSOS = [{ v: "kit", n: "Kit (comprador)" }, { v: "assinatura", n: "Assinatura" }, { v: "livre", n: "Livre" }];

function MaterialForm({ material, onDone }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(material?.titulo || "");
  const [subtitulo, setSubtitulo] = useState(material?.subtitulo || "");
  const [tipo, setTipo] = useState(material?.tipo || "bonus");
  const [icone, setIcone] = useState(material?.icone || "");
  const [acesso, setAcesso] = useState(material?.acesso || "kit");
  const [corpo, setCorpo] = useState(material?.corpo || "");
  const [busy, setBusy] = useState(false);

  async function salvar() {
    if (!titulo.trim()) return;
    setBusy(true);
    const d = { titulo, subtitulo, tipo, icone, acesso, corpo, chave: material?.chave };
    try {
      if (material) await atualizarMaterial(material.id, d);
      else await criarMaterial(d);
      router.refresh();
      onDone();
    } finally { setBusy(false); }
  }

  return (
    <div className="cf">
      <label className="fld-l">Ícone</label>
      <SeletorIcone value={icone} onChange={setIcone} />

      <label className="fld-l" style={{ marginTop: 10 }}>Título</label>
      <input className="fld" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: O Panfleto Secreto do Altar" autoFocus />

      <label className="fld-l" style={{ marginTop: 10 }}>Subtítulo</label>
      <input className="fld" value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} placeholder="Ex.: Os 12 perfis a evitar" />

      <div className="trio" style={{ marginTop: 10 }}>
        <div>
          <label className="fld-l">Tipo</label>
          <select className="fld" value={tipo} onChange={(e) => setTipo(e.target.value)}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.n}</option>)}</select>
        </div>
        <div>
          <label className="fld-l">Acesso</label>
          <select className="fld" value={acesso} onChange={(e) => setAcesso(e.target.value)}>{ACESSOS.map((a) => <option key={a.v} value={a.v}>{a.n}</option>)}</select>
        </div>
      </div>

      <label className="fld-l" style={{ marginTop: 10 }}>Conteúdo <span className="opt">(markdown: ## título · **negrito** · *itálico* · &gt; citação · --- linha)</span></label>
      <textarea className="fld mono" rows={12} value={corpo} onChange={(e) => setCorpo(e.target.value)} placeholder="## Introdução&#10;&#10;Querida leitora…" />

      <div className="cf-acts">
        <button type="button" className="pill" onClick={salvar} disabled={busy}>{busy ? "Salvando…" : "Salvar material ✧"}</button>
        <button type="button" className="mini" onClick={onDone}>Cancelar</button>
      </div>
    </div>
  );
}

export default function ConstrutorMateriais({ materiais }) {
  const router = useRouter();
  const [form, setForm] = useState(null); // { material } | { material: null }
  async function toggle(m) { await alternarAtivoMaterial(m.id, !m.ativo); router.refresh(); }
  async function apagar(m) { if (confirm(`Excluir "${m.titulo}"?`)) { await excluirMaterial(m.id); router.refresh(); } }

  return (
    <div>
      <div className="shelf">
        {materiais.map((m) => (
          <div key={m.id} className={"adm-campo" + (m.ativo ? "" : " off")}>
            <span className="ld-ic" style={{ fontSize: 24 }}>{m.icone || "📖"}</span>
            <div className="adm-cbody">
              <div className="adm-crot">{m.titulo}</div>
              <div className="adm-cmeta">
                <span className="tag">{m.tipo}</span>
                <span className="tag ghost">{m.acesso}</span>
                <span className="tag ghost">{(m.corpo || "").length} chars</span>
              </div>
            </div>
            <button className={"mini" + (m.ativo ? "" : " danger")} onClick={() => toggle(m)} title={m.ativo ? "Visível" : "Oculto"}>{m.ativo ? "👁" : "🚫"}</button>
            <button className="mini" onClick={() => setForm({ material: m })}>✎</button>
            <button className="mini danger" onClick={() => apagar(m)}>✕</button>
          </div>
        ))}
        {materiais.length === 0 && <p className="muted" style={{ textAlign: "left" }}>Nenhum material ainda.</p>}
      </div>

      {form ? (
        <MaterialForm material={form.material} onDone={() => setForm(null)} />
      ) : (
        <button className="add-etapa" onClick={() => setForm({ material: null })}>＋ Novo material</button>
      )}
    </div>
  );
}
