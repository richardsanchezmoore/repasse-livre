"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  criarEtapa, editarEtapa, excluirEtapa,
  criarCampo, atualizarCampo, excluirCampo, alternarAtivoCampo, reordenarCampos,
} from "@/app/admin/dossie/actions";

// Tipos com nomes comuns (client-safe; espelha lib/dossieDb TIPOS_CAMPO)
const TIPOS = [
  { tipo: "input", nome: "Texto curto", escolha: false },
  { tipo: "textarea", nome: "Texto longo", escolha: false },
  { tipo: "radio", nome: "Escolha única", escolha: true },
  { tipo: "select", nome: "Lista suspensa", escolha: true },
  { tipo: "checkbox", nome: "Múltipla escolha", escolha: true },
  { tipo: "slider", nome: "Escala (0–N)", escolha: false },
];
const usaOpcoes = (t) => !!TIPOS.find((x) => x.tipo === t)?.escolha;
const nomeTipo = (t) => TIPOS.find((x) => x.tipo === t)?.nome || t;

function CampoForm({ etapaId, campo, onDone }) {
  const router = useRouter();
  const cfg = campo?.config || {};
  const [rotulo, setRotulo] = useState(campo?.rotulo || "");
  const [tipo, setTipo] = useState(campo?.tipo || "input");
  const [opcoes, setOpcoes] = useState(cfg.opcoes?.length ? cfg.opcoes : [""]);
  const [min, setMin] = useState(cfg.min ?? 0);
  const [max, setMax] = useState(cfg.max ?? 10);
  const [passo, setPasso] = useState(cfg.passo ?? 1);
  const [placeholder, setPlaceholder] = useState(cfg.placeholder || "");
  const [dica, setDica] = useState(cfg.dica || "");
  const [obrigatorio, setObrigatorio] = useState(!!campo?.obrigatorio);
  const [busy, setBusy] = useState(false);

  async function salvar() {
    if (!rotulo.trim()) return;
    setBusy(true);
    const dados = { rotulo, tipo, opcoes, min, max, passo, placeholder, dica, obrigatorio };
    try {
      if (campo) await atualizarCampo(campo.id, dados);
      else await criarCampo(etapaId, dados);
      router.refresh();
      onDone();
    } finally { setBusy(false); }
  }

  return (
    <div className="cf">
      <label className="fld-l">Pergunta / rótulo</label>
      <input className="fld" value={rotulo} onChange={(e) => setRotulo(e.target.value)} placeholder="Ex.: Quais pregadores ele admira?" autoFocus />

      <label className="fld-l" style={{ marginTop: 10 }}>Tipo de campo</label>
      <select className="fld" value={tipo} onChange={(e) => setTipo(e.target.value)}>
        {TIPOS.map((t) => <option key={t.tipo} value={t.tipo}>{t.nome}</option>)}
      </select>

      {usaOpcoes(tipo) && (
        <div style={{ marginTop: 10 }}>
          <label className="fld-l">Opções {tipo === "checkbox" ? "(múltipla escolha)" : "(escolha única)"}</label>
          {opcoes.map((o, i) => (
            <div key={i} className="opt-row">
              <input className="fld" value={o} onChange={(e) => setOpcoes(opcoes.map((x, j) => j === i ? e.target.value : x))} placeholder={`Opção ${i + 1}`} />
              <button type="button" className="mini danger" onClick={() => setOpcoes(opcoes.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="mini" onClick={() => setOpcoes([...opcoes, ""])}>＋ opção</button>
        </div>
      )}

      {tipo === "slider" && (
        <div className="trio" style={{ marginTop: 10 }}>
          <div><label className="fld-l">Mín</label><input className="fld" type="number" value={min} onChange={(e) => setMin(e.target.value)} /></div>
          <div><label className="fld-l">Máx</label><input className="fld" type="number" value={max} onChange={(e) => setMax(e.target.value)} /></div>
          <div><label className="fld-l">Passo</label><input className="fld" type="number" value={passo} onChange={(e) => setPasso(e.target.value)} /></div>
        </div>
      )}

      {(tipo === "input" || tipo === "textarea") && (
        <>
          <label className="fld-l" style={{ marginTop: 10 }}>Placeholder <span className="opt">(opcional)</span></label>
          <input className="fld" value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} />
        </>
      )}
      <label className="fld-l" style={{ marginTop: 10 }}>Dica <span className="opt">(opcional)</span></label>
      <input className="fld" value={dica} onChange={(e) => setDica(e.target.value)} placeholder="Ex.: separe por vírgula" />

      <label className="chk" style={{ marginTop: 10 }}>
        <input type="checkbox" checked={obrigatorio} onChange={(e) => setObrigatorio(e.target.checked)} /> Obrigatório
      </label>

      <div className="cf-acts">
        <button type="button" className="pill" onClick={salvar} disabled={busy}>{busy ? "Salvando…" : "Salvar campo ✧"}</button>
        <button type="button" className="mini" onClick={onDone}>Cancelar</button>
      </div>
    </div>
  );
}

function NovaEtapa({ onDone }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [icone, setIcone] = useState("");
  const [busy, setBusy] = useState(false);
  async function salvar() {
    if (!titulo.trim()) return;
    setBusy(true);
    try { await criarEtapa({ titulo, icone }); router.refresh(); onDone(); } finally { setBusy(false); }
  }
  return (
    <div className="cf">
      <div className="trio2">
        <div><label className="fld-l">Ícone</label><input className="fld" value={icone} onChange={(e) => setIcone(e.target.value)} placeholder="⛪" /></div>
        <div style={{ flex: 1 }}><label className="fld-l">Nome da etapa</label><input className="fld" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Fé & Igreja" autoFocus /></div>
      </div>
      <div className="cf-acts">
        <button type="button" className="pill" onClick={salvar} disabled={busy}>{busy ? "Salvando…" : "Criar etapa"}</button>
        <button type="button" className="mini" onClick={onDone}>Cancelar</button>
      </div>
    </div>
  );
}

export default function ConstrutorDossie({ esquema }) {
  const router = useRouter();
  const [form, setForm] = useState(null); // { etapaId, campo }
  const [novaEtapa, setNovaEtapa] = useState(false);
  const [arrast, setArrast] = useState(null); // campo id sendo arrastado

  async function soltarEm(etapa, alvoId) {
    if (!arrast || arrast === alvoId) return;
    const ids = etapa.campos.map((c) => c.id);
    const de = ids.indexOf(arrast), para = ids.indexOf(alvoId);
    if (de < 0 || para < 0) return;
    ids.splice(para, 0, ids.splice(de, 1)[0]);
    setArrast(null);
    await reordenarCampos(ids);
    router.refresh();
  }

  async function toggleAtivo(c) { await alternarAtivoCampo(c.id, !c.ativo); router.refresh(); }
  async function apagarCampo(c) { if (confirm(`Excluir "${c.rotulo}"?`)) { await excluirCampo(c.id); router.refresh(); } }
  async function apagarEtapa(e) { if (confirm(`Excluir a etapa "${e.titulo}" e todos os campos dela?`)) { await excluirEtapa(e.id); router.refresh(); } }

  return (
    <div>
      {esquema.map((etapa) => (
        <section key={etapa.id} className="adm-etapa">
          <div className="adm-eh">
            <span className="adm-ei">{etapa.icone || "❦"}</span>
            <h2>{etapa.titulo}</h2>
            <button className="mini danger" onClick={() => apagarEtapa(etapa)} title="Excluir etapa">🗑</button>
          </div>

          <div className="adm-campos">
            {etapa.campos.map((c) => (
              <div
                key={c.id}
                className={"adm-campo" + (c.ativo ? "" : " off") + (arrast === c.id ? " drag" : "")}
                draggable
                onDragStart={() => setArrast(c.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => soltarEm(etapa, c.id)}
              >
                <span className="grip" title="Arraste para reordenar">⠿</span>
                <div className="adm-cbody">
                  <div className="adm-crot">{c.rotulo}</div>
                  <div className="adm-cmeta"><span className="tag">{nomeTipo(c.tipo)}</span>{c.config?.opcoes?.length ? <span className="tag ghost">{c.config.opcoes.length} opções</span> : null}{c.obrigatorio ? <span className="tag ghost">obrigatório</span> : null}</div>
                </div>
                <button className={"mini" + (c.ativo ? "" : " danger")} onClick={() => toggleAtivo(c)} title={c.ativo ? "Ativo (clique p/ ocultar)" : "Oculto (clique p/ ativar)"}>{c.ativo ? "👁" : "🚫"}</button>
                <button className="mini" onClick={() => setForm({ etapaId: etapa.id, campo: c })}>✎</button>
                <button className="mini danger" onClick={() => apagarCampo(c)}>✕</button>
              </div>
            ))}
            {etapa.campos.length === 0 && <p className="muted" style={{ textAlign: "left", padding: "4px 2px" }}>Nenhum campo ainda.</p>}
          </div>

          {form && form.etapaId === etapa.id
            ? <CampoForm etapaId={etapa.id} campo={form.campo} onDone={() => setForm(null)} />
            : <button className="add-campo" onClick={() => setForm({ etapaId: etapa.id, campo: null })}>＋ Novo campo</button>}
        </section>
      ))}

      {novaEtapa
        ? <NovaEtapa onDone={() => setNovaEtapa(false)} />
        : <button className="add-etapa" onClick={() => setNovaEtapa(true)}>＋ Nova etapa</button>}
    </div>
  );
}
