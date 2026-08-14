"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  PreCheckout — pop-box que capta contato ANTES de abrir a Cakto (porta do
//  padrão de /panfleto/index.html para React). Faz 3 coisas de máquina:
//   1) salva o lead (/api/checkout) → dá pra recuperar quem não concluiu;
//   2) abre a Cakto JÁ PREENCHIDA (name/email/confirmEmail/cpf/phone) + sck
//      (auto-login) + slug por domínio;
//   3) dispara InitiateCheckout no Pixel (feito por quem abre este modal).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";

// Produto Cakto por domínio (o "retorno" precisa voltar ao MESMO domínio p/ o
// auto-login). Adicionar domínio = 1 linha. Espelha /panfleto.
const CAKTO_SLUG = { "damasvirtuosas.com": "3fowby7" };
const PADRAO = "39wc86g_1010439";

const soDig = (s) => String(s || "").replace(/\D/g, "");
const DDDS = "11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99".split(" ");
function validaTel(t) { let d = soDig(t); if (d.length > 11 && d.indexOf("55") === 0) d = d.slice(2); if (d.length !== 11) return false; if (DDDS.indexOf(d.slice(0, 2)) < 0) return false; return d[2] === "9"; }
function validaCPF(c) { const d = soDig(c); if (d.length !== 11) return false; if (/^(\d)\1{10}$/.test(d)) return false; let s = 0, i, r; for (i = 0; i < 9; i++) s += (+d[i]) * (10 - i); r = (s * 10) % 11; if (r === 10) r = 0; if (r !== +d[9]) return false; s = 0; for (i = 0; i < 10; i++) s += (+d[i]) * (11 - i); r = (s * 10) % 11; if (r === 10) r = 0; return r === +d[10]; }
function fmtCPF(v) { const d = soDig(v).slice(0, 11); if (d.length <= 3) return d; if (d.length <= 6) return d.slice(0, 3) + "." + d.slice(3); if (d.length <= 9) return d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6); return d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6, 9) + "-" + d.slice(9); }
function fmtTel(v) { let d = soDig(v); if (d.indexOf("55") === 0 && d.length > 11) d = d.slice(2); d = d.slice(0, 11); if (d.length <= 2) return d.length ? "(" + d : ""; if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2); if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6); return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7, 11); }

function idLocal(chave) {
  try {
    let v = localStorage.getItem(chave);
    if (!v) { v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2); localStorage.setItem(chave, v); }
    return v;
  } catch { return null; }
}

export default function PreCheckout({ url, onClose }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [whats, setWhats] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const nomeRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => { try { nomeRef.current?.focus(); } catch {} }, 90);
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  function enviar(e) {
    e.preventDefault();
    setErro("");
    const cpfD = soDig(cpf), dig = soDig(whats);
    if (nome.trim().length < 2) return setErro("Digite o seu nome completo.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErro("Confira o seu e-mail.");
    if (!validaCPF(cpfD)) return setErro("CPF inválido — confira os números.");
    if (!validaTel(dig)) return setErro("Informe um celular válido com DDD (ex: (11) 99999-9999).");
    setEnviando(true);

    // monta a Cakto: slug por domínio + sck (auto-login) + prefill
    const sck = "claim_" + (idLocal("corte_claim") || "");
    const vid = idLocal("dv_vid");
    const host = location.hostname.replace(/^www\./, "");
    const slug = CAKTO_SLUG[host] || PADRAO;
    const fone = dig.indexOf("55") === 0 ? dig : "55" + dig;
    let alvo = url;
    try {
      const u = new URL(url, location.href);
      u.pathname = "/" + slug;
      u.searchParams.set("sck", sck);
      u.searchParams.set("name", nome.trim());
      u.searchParams.set("email", email.trim());
      u.searchParams.set("confirmEmail", email.trim());
      u.searchParams.set("cpf", cpfD);
      u.searchParams.set("phone", fone);
      // preserva a atribuição do anúncio (utm/fbclid/…) até a Cakto
      try {
        const entrada = new URLSearchParams(location.search);
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "ttclid", "src"].forEach((k) => { const v = entrada.get(k); if (v) u.searchParams.set(k, v); });
      } catch {}
      alvo = u.toString();
    } catch {}

    let seguiu = false;
    const go = () => { if (seguiu) return; seguiu = true; window.location.href = alvo; };
    try {
      fetch("/api/checkout", {
        method: "POST", keepalive: true, headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), email: email.trim(), whatsapp: dig, vid }),
      }).then(go).catch(go);
    } catch { go(); }
    setTimeout(go, 1500);
  }

  return (
    <div className="pc-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pc-box">
        <button type="button" className="pc-x" onClick={onClose} aria-label="Fechar">×</button>
        <div className="pc-h">Falta só um passo</div>
        <p className="pc-sub">Preencha para liberar o seu acesso na hora.</p>
        <form onSubmit={enviar}>
          <input ref={nomeRef} className="pc-in" type="text" autoComplete="name" placeholder="Seu nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required />
          <input className="pc-in" type="email" autoComplete="email" inputMode="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="pc-in" type="tel" inputMode="numeric" placeholder="000.000.000-00" maxLength={14} value={cpf} onChange={(e) => setCpf(fmtCPF(e.target.value))} required />
          <input className="pc-in" type="tel" autoComplete="tel" inputMode="tel" placeholder="(11) 99999-9999" maxLength={16} value={whats} onChange={(e) => setWhats(fmtTel(e.target.value))} required />
          {erro && <p className="pc-err">{erro}</p>}
          <button type="submit" className="pc-go" disabled={enviando}>{enviando ? "Abrindo o pagamento…" : "Continuar para o pagamento →"}</button>
          <p className="pc-safe">🛡️ Pagamento no checkout seguro da Cakto · 7 dias de garantia.</p>
        </form>
      </div>
    </div>
  );
}
