"use client";

import { useState, useEffect, useRef } from "react";

// Checkout PIX nativo das Damas Virtuosas — a compradora nunca sai do site.
// Fluxo: form → gera cobrança (/api/pix) → mostra QR + copia-e-cola → faz
// polling do status (/api/pix/status) → quando paga, manda pra /bem-vinda.
// O acesso em si é liberado pelo webhook (app/api/cakto); o polling aqui é só
// pra reagir na hora na tela.

function mascCpf(v) {
  v = v.replace(/\D/g, "").slice(0, 11);
  return v
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function mascTel(v) {
  v = v.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}
function fmtSeg(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ":" + String(r).padStart(2, "0");
}
function fmtReais(v) {
  if (v == null || isNaN(Number(v))) return "";
  return "R$ " + Number(v).toFixed(2).replace(".", ",");
}
function fingerprint() {
  try {
    let f = sessionStorage.getItem("dv_fp");
    if (!f) {
      f = "fp_" + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
      sessionStorage.setItem("dv_fp", f);
    }
    return f;
  } catch {
    return "fp_" + Math.random().toString(36).slice(2);
  }
}

export default function PixCheckout({ valor = "", metadata, onClose }) {
  const [etapa, setEtapa] = useState("form"); // form | pix | pago
  const [form, setForm] = useState({ nome: "", email: "", whatsapp: "", cpf: "" });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [pix, setPix] = useState(null); // { id, qrCode, qrImg, amount, expiraEm }
  const [copiado, setCopiado] = useState(false);
  const [restante, setRestante] = useState(null);
  const pollRef = useRef(null);

  function set(campo, v) {
    setForm((f) => ({ ...f, [campo]: v }));
  }

  async function gerar(e) {
    e?.preventDefault();
    setErro("");
    const cpf = form.cpf.replace(/\D/g, "");
    const tel = form.whatsapp.replace(/\D/g, "");
    if (form.nome.trim().length < 2) return setErro("Digite o seu nome.");
    if (!form.email.includes("@") || form.email.length < 5) return setErro("Digite um e-mail válido.");
    if (cpf.length !== 11) return setErro("Digite o seu CPF completo.");
    if (tel.length < 10) return setErro("Digite o seu WhatsApp com DDD.");

    setCarregando(true);
    try {
      const r = await fetch("/api/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: form.nome.trim(), email: form.email.trim(), cpf, whatsapp: tel, fingerprint: fingerprint(), metadata }),
      });
      const j = await r.json();
      if (!j.ok) {
        setErro(j.erro || "Não foi possível gerar o PIX.");
        setCarregando(false);
        return;
      }
      setPix(j);
      setEtapa("pix");
      try {
        window.fbq && window.fbq("trackCustom", "PixGerado", { currency: "BRL", value: Number(j.amount) || undefined });
      } catch {}
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    }
    setCarregando(false);
  }

  // Polling do status enquanto o PIX está na tela.
  useEffect(() => {
    if (etapa !== "pix" || !pix?.id) return;
    let vivo = true;
    async function checa() {
      try {
        const r = await fetch("/api/pix/status?id=" + encodeURIComponent(pix.id), { cache: "no-store" });
        const j = await r.json();
        if (vivo && j.pago) {
          clearInterval(pollRef.current);
          setEtapa("pago");
          setTimeout(() => {
            window.location.href = "/bem-vinda?email=" + encodeURIComponent(form.email.trim());
          }, 1800);
        }
      } catch {}
    }
    pollRef.current = setInterval(checa, 4000);
    checa();
    return () => {
      vivo = false;
      clearInterval(pollRef.current);
    };
  }, [etapa, pix?.id, form.email]);

  // Contagem regressiva de expiração.
  useEffect(() => {
    if (etapa !== "pix" || !pix?.expiraEm) return;
    const fim = new Date(pix.expiraEm).getTime();
    const tick = () => setRestante(Math.max(0, Math.round((fim - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [etapa, pix?.expiraEm]);

  function copiar() {
    try {
      navigator.clipboard.writeText(pix.qrCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {}
  }

  const precoMostra = fmtReais(pix?.amount) || valor;

  return (
    <div className="pix-overlay" role="dialog" aria-modal="true">
      <div className="pix-card">
        <div className="pix-top">
          <span className="pix-brand">✦ Damas Virtuosas</span>
          {onClose && etapa !== "pago" && (
            <button className="pix-x" onClick={onClose} aria-label="Fechar">×</button>
          )}
        </div>

        {/* ── FORM ─────────────────────────────────────────────── */}
        {etapa === "form" && (
          <form className="pix-form" onSubmit={gerar}>
            <div className="pix-h">Falta pouco para o seu acesso</div>
            <p className="pix-sub">Preencha os seus dados para gerar o PIX. O acesso é liberado <b>na hora</b> do pagamento.</p>

            <input className="pix-in" placeholder="Seu nome completo" value={form.nome} autoComplete="name"
              onChange={(e) => set("nome", e.target.value)} />
            <input className="pix-in" placeholder="Seu melhor e-mail" value={form.email} type="email" autoComplete="email" inputMode="email"
              onChange={(e) => set("email", e.target.value)} />
            <input className="pix-in" placeholder="WhatsApp com DDD" value={form.whatsapp} inputMode="numeric" autoComplete="tel"
              onChange={(e) => set("whatsapp", mascTel(e.target.value))} />
            <input className="pix-in" placeholder="CPF" value={form.cpf} inputMode="numeric"
              onChange={(e) => set("cpf", mascCpf(e.target.value))} />

            {erro && <div className="pix-erro">{erro}</div>}

            <button className="pix-btn" type="submit" disabled={carregando}>
              {carregando ? "Gerando o seu PIX…" : `Gerar PIX${valor ? " · " + valor : ""}`}
            </button>
            <div className="pix-selos">🔒 Ambiente seguro · ✓ Acesso vitalício · ✓ 7 dias de garantia</div>
          </form>
        )}

        {/* ── PIX (QR + copia e cola) ──────────────────────────── */}
        {etapa === "pix" && (
          <div className="pix-pay">
            <div className="pix-h">Pague com PIX para liberar</div>
            <p className="pix-sub">Abra o app do seu banco, escaneie o código ou use o <b>copia e cola</b>.</p>

            {pix?.qrImg ? (
              <img className="pix-qr" src={pix.qrImg} alt="QR Code do PIX" width={230} height={230} />
            ) : (
              <div className="pix-qr pix-qr-vazio">QR indisponível — use o copia e cola abaixo</div>
            )}

            <button className={"pix-copia" + (copiado ? " ok" : "")} onClick={copiar}>
              {copiado ? "✓ Código copiado!" : "📋 Copiar código PIX"}
            </button>
            <div className="pix-code" onClick={copiar} title="Toque para copiar">{pix?.qrCode}</div>

            <div className="pix-espera">
              <span className="pix-dot" /> Aguardando o pagamento…
              {precoMostra ? <b> {precoMostra}</b> : null}
            </div>
            {restante != null && restante > 0 && (
              <div className="pix-timer">Este código expira em {fmtSeg(restante)}</div>
            )}
            <p className="pix-nota">Assim que o pagamento cair, esta tela abre o seu acesso automaticamente.</p>
          </div>
        )}

        {/* ── PAGO ─────────────────────────────────────────────── */}
        {etapa === "pago" && (
          <div className="pix-ok">
            <div className="pix-check">✓</div>
            <div className="pix-h">Pagamento confirmado!</div>
            <p className="pix-sub">Preparando o seu acesso…</p>
          </div>
        )}
      </div>
    </div>
  );
}
