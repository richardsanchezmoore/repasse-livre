"use client";
import { useState } from "react";
import { salvarContato } from "@/app/comecar/actions";

/** One-tap: manda o texto (cardápio, rotina…) pro WhatsApp.
 *  - Botão principal abre o WhatsApp com o texto e a pessoa escolhe pra quem (zero setup).
 *  - Contatos salvos (marido, filhos) viram atalhos que já abrem a conversa da pessoa.
 *  - Sem API oficial: é só o link wa.me, funciona no celular na hora. */
function soDig(s) { return String(s || "").replace(/\D/g, ""); }
function fmtTel(v) {
  let d = soDig(v); if (d.startsWith("55") && d.length > 11) d = d.slice(2); d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? "(" + d : "";
  if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
  if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
  return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7, 11);
}
const waUrl = (num, texto) => `https://wa.me/${num || ""}?text=${encodeURIComponent(texto)}`;

export default function CompartilharWhats({ texto, familia = null, label = "Enviar no WhatsApp", logado = false }) {
  const [contatos, setContatos] = useState(Array.isArray(familia?.contatos) ? familia.contatos : []);
  const [add, setAdd] = useState(false);
  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  if (!texto) return null;

  function enviar(num) {
    try { window.open(waUrl(num, texto), "_blank", "noopener"); } catch { location.href = waUrl(num, texto); }
  }

  async function adicionar(e) {
    e?.preventDefault?.();
    setErro("");
    if (soDig(whats).length < 10) { setErro("WhatsApp com DDD."); return; }
    setBusy(true);
    try {
      const r = await salvarContato({ nome, whatsapp: whats });
      if (r?.erro) { setErro(r.erro); return; }
      setContatos(r.contatos || []);
      setNome(""); setWhats(""); setAdd(false);
    } finally { setBusy(false); }
  }

  return (
    <div className="wshare">
      <button type="button" className="btn wa" onClick={() => enviar("")}>📲 {label}</button>

      {(contatos.length > 0 || logado) && (
        <div className="wshare-row">
          {contatos.map((c, i) => (
            <button type="button" key={i} className="chip" onClick={() => enviar(c.whatsapp)}
              title={`Enviar pra ${c.nome || "contato"}`}>
              ➤ {(c.nome || "Contato").split(" ")[0]}
            </button>
          ))}
          {logado && (
            <button type="button" className="chip ghost" onClick={() => setAdd((v) => !v)}>
              {add ? "× fechar" : "＋ salvar contato"}
            </button>
          )}
        </div>
      )}

      {add && (
        <form className="wshare-add" onSubmit={adicionar}>
          <input className="inp" placeholder="Nome (ex: João)" value={nome} onChange={(e) => setNome(e.target.value)} />
          <input className="inp" placeholder="WhatsApp com DDD" value={whats} inputMode="tel" maxLength={16}
            onChange={(e) => setWhats(fmtTel(e.target.value))} />
          <button type="submit" className="chip on" disabled={busy}>{busy ? "…" : "Salvar"}</button>
          {erro && <p className="erro" style={{ width: "100%" }}>{erro}</p>}
        </form>
      )}
      {!contatos.length && logado && !add && (
        <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>Dica: salve o marido e os filhos pra enviar num toque. 💛</p>
      )}
    </div>
  );
}
