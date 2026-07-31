"use client";
import { useState } from "react";

function Slider({ campo, valor }) {
  const cfg = campo.config || {};
  const min = Number(cfg.min ?? 0), max = Number(cfg.max ?? 10), passo = Number(cfg.passo ?? 1);
  const [v, setV] = useState(valor ?? min);
  return (
    <div className="sld">
      <input type="range" name={`c_${campo.id}`} min={min} max={max} step={passo}
        defaultValue={valor ?? min} onInput={(e) => setV(e.target.value)} />
      <output>{v}{cfg.unidade ? ` ${cfg.unidade}` : ""}</output>
    </div>
  );
}

function Campo({ campo, valor }) {
  const cfg = campo.config || {};
  const name = `c_${campo.id}`;
  const opcoes = cfg.opcoes || [];

  let controle;
  if (campo.tipo === "textarea") {
    controle = <textarea className="fld" name={name} rows={3} defaultValue={valor || ""} placeholder={cfg.placeholder || "…"} />;
  } else if (campo.tipo === "select") {
    controle = (
      <select className="fld" name={name} defaultValue={valor || ""}>
        <option value="">—</option>
        {opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (campo.tipo === "radio") {
    controle = (
      <div className="opts">
        {opcoes.map((o) => (
          <label key={o} className="opt-chip">
            <input type="radio" name={name} value={o} defaultChecked={valor === o} /> <span>{o}</span>
          </label>
        ))}
      </div>
    );
  } else if (campo.tipo === "checkbox") {
    const arr = Array.isArray(valor) ? valor : [];
    controle = (
      <div className="opts">
        {opcoes.map((o) => (
          <label key={o} className="opt-chip">
            <input type="checkbox" name={name} value={o} defaultChecked={arr.includes(o)} /> <span>{o}</span>
          </label>
        ))}
      </div>
    );
  } else if (campo.tipo === "slider") {
    controle = <Slider campo={campo} valor={valor} />;
  } else {
    controle = <input className="fld" name={name} defaultValue={valor || ""} placeholder={cfg.placeholder || "…"} />;
  }

  return (
    <div className="fgrp">
      <label className="fld-l">{campo.rotulo}{cfg.dica ? <span className="opt"> ({cfg.dica})</span> : null}</label>
      {controle}
    </div>
  );
}

export default function CamposDossie({ esquema, valores }) {
  return (
    <>
      {esquema.map((etapa) => (
        <section key={etapa.id} className="cap">
          <h2 className="cap-h"><span>{etapa.icone || "❦"}</span> {etapa.titulo}</h2>
          {etapa.campos.map((c) => <Campo key={c.id} campo={c} valor={valores[c.id]} />)}
        </section>
      ))}
    </>
  );
}
