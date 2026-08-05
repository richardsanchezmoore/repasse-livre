"use client";
import { useState } from "react";

/** Contador por clique (− valor +). Zero digitação. */
export function Stepper({ value, onChange, min = 0, max = 20, suffix }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="stepper">
      <button type="button" aria-label="diminuir" onClick={() => set(value - 1)}>−</button>
      <span className="val">{value}{suffix ? ` ${suffix}` : ""}</span>
      <button type="button" aria-label="aumentar" onClick={() => set(value + 1)}>＋</button>
    </div>
  );
}

/**
 * Seleção múltipla por CLIQUE + um chip "Outro" que abre o campo de texto só
 * quando a usuária quiser. Emite a string composta (ex.: "Sem lactose, Frango").
 */
export function ChipsMulti({ opcoes, onChange, outroLabel = "Outro", placeholder = "Escreva aqui…" }) {
  const [sel, setSel] = useState(() => new Set());
  const [outroOn, setOutroOn] = useState(false);
  const [outro, setOutro] = useState("");

  function emit(nsel, nOutroOn, nOutro) {
    const partes = [...nsel];
    if (nOutroOn && nOutro.trim()) partes.push(nOutro.trim());
    onChange(partes.join(", "));
  }
  function toggle(op) {
    const n = new Set(sel);
    n.has(op) ? n.delete(op) : n.add(op);
    setSel(n); emit(n, outroOn, outro);
  }
  function toggleOutro() {
    const v = !outroOn; setOutroOn(v); emit(sel, v, outro);
  }
  function setOutroTxt(t) { setOutro(t); emit(sel, outroOn, t); }

  return (
    <>
      <div className="chips">
        {opcoes.map((op) => (
          <button key={op} type="button" className={"chip" + (sel.has(op) ? " on" : "")} onClick={() => toggle(op)}>{op}</button>
        ))}
        <button type="button" className={"chip" + (outroOn ? " on" : "")} onClick={toggleOutro}>＋ {outroLabel}</button>
      </div>
      {outroOn && (
        <input className="inp" style={{ marginTop: 8 }} value={outro} autoFocus placeholder={placeholder} onChange={(e) => setOutroTxt(e.target.value)} />
      )}
    </>
  );
}
