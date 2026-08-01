"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { avaliarVeredito } from "@/lib/veredito";
import { salvarUmaResposta } from "@/app/dossie/actions";

function respondida(v) {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim().length > 0;
}

function Controle({ campo, valor, onChange, onEscolher }) {
  const cfg = campo.config || {};
  const opcoes = cfg.opcoes || [];
  if (campo.tipo === "radio" || campo.tipo === "select") {
    return (
      <div className="fx-opts">
        {opcoes.map((o) => (
          <button type="button" key={o} className={"fx-opt" + (valor === o ? " on" : "")} onClick={() => onEscolher(o)}>{o}</button>
        ))}
      </div>
    );
  }
  if (campo.tipo === "checkbox") {
    const arr = Array.isArray(valor) ? valor : [];
    return (
      <div className="fx-opts">
        {opcoes.map((o) => (
          <button type="button" key={o} className={"fx-opt" + (arr.includes(o) ? " on" : "")}
            onClick={() => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])}>{o}</button>
        ))}
      </div>
    );
  }
  if (campo.tipo === "slider") {
    const min = Number(cfg.min ?? 0), max = Number(cfg.max ?? 10), passo = Number(cfg.passo ?? 1);
    const v = valor === "" || valor == null ? min : Number(valor);
    return (
      <div className="fx-slider">
        <div className="fx-slval">{v}{cfg.unidade ? ` ${cfg.unidade}` : ""}</div>
        <input type="range" min={min} max={max} step={passo} value={v} onChange={(e) => onChange(Number(e.target.value))} />
      </div>
    );
  }
  if (campo.tipo === "textarea") {
    return <textarea className="fld" rows={4} value={valor || ""} onChange={(e) => onChange(e.target.value)} placeholder={cfg.placeholder || "…"} autoFocus />;
  }
  return <input className="fld" value={valor || ""} onChange={(e) => onChange(e.target.value)} placeholder={cfg.placeholder || "…"} autoFocus />;
}

export default function DossieFluxo({ dossie, esquema, valoresIniciais, regras, faixas }) {
  const [valores, setValores] = useState(valoresIniciais || {});
  const [idx, setIdx] = useState(0);
  const [salvo, setSalvo] = useState(false);

  const steps = useMemo(() => {
    const s = [];
    esquema.forEach((etapa, ei) => {
      etapa.campos.forEach((campo) => s.push({ tipo: "campo", etapa, campo, ei }));
      if (etapa.campos.length) s.push({ tipo: "celebracao", etapa, ei });
    });
    s.push({ tipo: "veredito" });
    return s;
  }, [esquema]);

  const totais = useMemo(() => esquema.map((e) => e.campos.length), [esquema]);
  const respondidosPorEtapa = esquema.map((e) => e.campos.filter((c) => respondida(valores[c.id])).length);
  const totalCampos = totais.reduce((a, b) => a + b, 0);
  const totalResp = respondidosPorEtapa.reduce((a, b) => a + b, 0);

  const step = steps[idx];
  const setVal = (id, v) => setValores((o) => ({ ...o, [id]: v }));
  function flash() { setSalvo(true); setTimeout(() => setSalvo(false), 1400); }
  async function salvar(id, v) { await salvarUmaResposta(dossie.id, id, v ?? null); flash(); }
  const avancar = () => setIdx((i) => Math.min(i + 1, steps.length - 1));
  const voltar = () => setIdx((i) => Math.max(i - 1, 0));
  async function continuar(campo) { await salvar(campo.id, valores[campo.id]); avancar(); }
  async function escolher(campo, v) { setVal(campo.id, v); await salvar(campo.id, v); avancar(); }

  const noFim = step.tipo === "veredito";

  return (
    <main className="screen fx">
      {/* topo: pretendente + progresso */}
      <div className="fx-head">
        <Link href="/dossie" className="fx-x" aria-label="fechar">✕</Link>
        {dossie.avatar ? <Avatar id={dossie.avatar} size={34} /> : <span className="fx-emb">{dossie.emblema || "♟"}</span>}
        <span className="fx-nome">{dossie.nome}</span>
        {salvo && <span className="fx-saved">salvo ✓</span>}
      </div>
      {!noFim && (
        <div className="fx-prog">
          {esquema.map((e, i) => (
            <div key={e.id} className={"fx-seg" + (i === step.ei ? " atual" : "")}>
              <span style={{ width: `${totais[i] ? (respondidosPorEtapa[i] / totais[i]) * 100 : 0}%` }} />
            </div>
          ))}
        </div>
      )}

      {/* CAMPO */}
      {step.tipo === "campo" && (
        <div className="fx-body">
          <div className="fx-eyebrow">{step.etapa.icone} {step.etapa.titulo}</div>
          <h1 className="fx-q">{step.campo.rotulo}</h1>
          {step.campo.config?.dica && <p className="fx-dica">{step.campo.config.dica}</p>}
          <Controle
            campo={step.campo}
            valor={valores[step.campo.id]}
            onChange={(v) => setVal(step.campo.id, v)}
            onEscolher={(v) => escolher(step.campo, v)}
          />
          <div className="fx-nav">
            <button type="button" className="mini" onClick={voltar} disabled={idx === 0}>← Voltar</button>
            <button type="button" className="fx-skip" onClick={avancar}>Pular</button>
            {step.campo.tipo !== "radio" && step.campo.tipo !== "select" && (
              <button type="button" className="pill" onClick={() => continuar(step.campo)}>Continuar →</button>
            )}
          </div>
        </div>
      )}

      {/* CELEBRAÇÃO */}
      {step.tipo === "celebracao" && (
        <div className="fx-celebra">
          <div className="fx-selo">{step.etapa.icone}</div>
          <h1 className="h-title" style={{ textAlign: "center" }}>Etapa <em>{step.etapa.titulo}</em> desvendada!</h1>
          <p className="fx-celebra-p">Você reuniu <strong>{respondidosPorEtapa[step.ei]}</strong> de {totais[step.ei]} pistas desta etapa. 🕯️</p>
          <button type="button" className="pill" onClick={avancar} style={{ marginTop: 8 }}>Continuar a investigação →</button>
          <button type="button" className="mini" onClick={voltar} style={{ marginTop: 10 }}>← Voltar</button>
        </div>
      )}

      {/* VEREDITO */}
      {noFim && (() => {
        const v = avaliarVeredito({ valores, regras, faixas });
        const pct = totalCampos ? Math.round((totalResp / totalCampos) * 100) : 0;
        return (
          <div className="fx-body">
            <div className="fx-eyebrow" style={{ textAlign: "center", width: "100%" }}>◈ O Veredito da Lady ◈</div>
            <div className="fx-selo" style={{ margin: "6px auto 4px" }}>🔮</div>
            {v.houveResposta && v.faixa ? (
              <section className={"card vd b-" + v.faixa.bandeira}>
                <div className="c-t" style={{ textAlign: "center" }}>{v.faixa.rotulo}</div>
                <div className="c-p" style={{ textAlign: "center" }}>{v.faixa.mensagem}</div>
                {v.sinais.length > 0 && (
                  <ul className="sinais">
                    {v.sinais.map((s, i) => <li key={i} className={"sinal s-" + s.bandeira}><span className="dot" />{s.mensagem}</li>)}
                  </ul>
                )}
                <p className="vd-nota">Isto é discernimento, não sentença — observe, pergunte e leve ao Senhor em oração.</p>
              </section>
            ) : (
              <p className="fx-dica" style={{ textAlign: "center" }}>Responda algumas perguntas para o Veredito ganhar corpo.</p>
            )}
            <p className="muted">Dossiê {pct}% completo.</p>
            <div className="fx-nav" style={{ justifyContent: "center" }}>
              <button type="button" className="mini" onClick={() => setIdx(0)}>↻ Revisar</button>
              <Link href="/dossie" className="pill">Concluir ✧</Link>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
