"use client";

import { useState, useEffect, useRef } from "react";

// Checkout NATIVO das Damas Virtuosas (PIX + Cartão) — a compradora nunca sai
// do site. PIX: cria cobrança (/api/pix) → QR + copia-e-cola → polling → /bem-vinda.
// Cartão: SDK da Cakto tokeniza + antifraude NO BROWSER (o número do cartão nunca
// toca no nosso servidor) → /api/card finaliza → /bem-vinda. Sem 3DS (painel off).
// O acesso é liberado pelo webhook /api/cakto no pagamento.

const SDK_URL = "https://cakto-sdk.pages.dev/cakto-sdk.min.js";

function mascCpf(v) {
  v = v.replace(/\D/g, "").slice(0, 11);
  return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function mascTel(v) {
  v = v.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}
function mascCartao(v) {
  return v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}
function mascValidade(v) {
  v = v.replace(/\D/g, "").slice(0, 4);
  if (v.length >= 3) return v.slice(0, 2) + "/" + v.slice(2);
  return v;
}
function fmtSeg(s) {
  const m = Math.floor(s / 60);
  return m + ":" + String(s % 60).padStart(2, "0");
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

export default function PixCheckout({ valor = "", parcelas, metadata, onClose }) {
  // Fonte da verdade do preço/parcelas = Cakto (/api/oferta). As props valor/parcelas
  // só entram se vierem explícitas (ex.: uma promo pontual fora da oferta).
  const [oferta, setOferta] = useState({
    valor: valor || "",
    parcelas: Array.isArray(parcelas) && parcelas.length ? parcelas : null,
  });
  const [metodo, setMetodo] = useState("pix"); // pix | cartao
  const [etapa, setEtapa] = useState("form"); // form | pix | processando | pago
  const [form, setForm] = useState({ nome: "", email: "", whatsapp: "", cpf: "" });
  const [card, setCard] = useState({ numero: "", validade: "", cvv: "", installments: 1 });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [pix, setPix] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [restante, setRestante] = useState(null);
  const pollRef = useRef(null);
  const sdkRef = useRef(null);

  const valorMostra = valor || oferta.valor || "";
  const opcoesParcela = (Array.isArray(parcelas) && parcelas.length ? parcelas : oferta.parcelas)
    || [{ n: 1, label: valorMostra ? "1x de " + valorMostra : "À vista" }];

  function set(campo, v) { setForm((f) => ({ ...f, [campo]: v })); }
  function setC(campo, v) { setCard((c) => ({ ...c, [campo]: v })); }

  // Busca preço + parcelas reais da Cakto (a menos que venham por prop).
  useEffect(() => {
    if (valor && Array.isArray(parcelas) && parcelas.length) return;
    let vivo = true;
    fetch("/api/oferta").then((r) => r.json()).then((j) => {
      if (vivo && j.ok) setOferta({ valor: j.valor, parcelas: j.parcelas });
    }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  // Quando as parcelas carregam, default no MÁXIMO (igual à Cakto) — mostra logo a
  // menor parcela, que soa mais acessível.
  useEffect(() => {
    const max = opcoesParcela[opcoesParcela.length - 1]?.n || 1;
    setCard((c) => ({ ...c, installments: max }));
  }, [opcoesParcela.length]);

  // Carrega o SDK da Cakto (tokenização + antifraude) uma vez.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function iniciar() {
      if (sdkRef.current) return;
      try {
        const cid = process.env.NEXT_PUBLIC_CAKTO_SDK_CLIENT_ID;
        if (!cid || !window.Cakto) return;
        const sdk = new window.Cakto.CaktoSDK({ client_id: cid, environment: "production" });
        sdk.initAntifraud().catch(() => {});
        sdkRef.current = sdk;
        window.__caktoSdk = sdk;
      } catch (e) { console.error("[cakto sdk] init", e?.message); }
    }
    if (window.__caktoSdk) { sdkRef.current = window.__caktoSdk; return; }
    if (window.Cakto) { iniciar(); return; }
    let s = document.querySelector("script[data-cakto-sdk]");
    if (!s) {
      s = document.createElement("script");
      s.src = SDK_URL;
      s.async = true;
      s.setAttribute("data-cakto-sdk", "1");
      document.body.appendChild(s);
    }
    s.addEventListener("load", iniciar);
    return () => s.removeEventListener("load", iniciar);
  }, []);

  function validarCliente() {
    const cpf = form.cpf.replace(/\D/g, "");
    const tel = form.whatsapp.replace(/\D/g, "");
    if (form.nome.trim().length < 2) return "Digite o seu nome.";
    if (!form.email.includes("@") || form.email.length < 5) return "Digite um e-mail válido.";
    if (tel.length < 10) return "Digite o seu WhatsApp com DDD.";
    if (cpf.length !== 11) return "Digite o seu CPF completo.";
    return "";
  }

  async function gerarPix() {
    const cpf = form.cpf.replace(/\D/g, "");
    const tel = form.whatsapp.replace(/\D/g, "");
    setCarregando(true);
    try {
      const r = await fetch("/api/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: form.nome.trim(), email: form.email.trim(), cpf, whatsapp: tel, fingerprint: fingerprint(), metadata }),
      });
      const j = await r.json();
      if (!j.ok) { setErro(j.erro || "Não foi possível gerar o PIX."); setCarregando(false); return; }
      setPix(j);
      setEtapa("pix");
      try { window.fbq && window.fbq("trackCustom", "PixGerado", { currency: "BRL", value: Number(j.amount) || undefined }); } catch {}
    } catch { setErro("Falha de conexão. Tente de novo."); }
    setCarregando(false);
  }

  async function pagarCartao() {
    const numero = card.numero.replace(/\D/g, "");
    const [mes, ano] = card.validade.split("/");
    const cvv = card.cvv.replace(/\D/g, "");
    if (numero.length < 13) return setErro("Número do cartão inválido.");
    if (!mes || !ano || Number(mes) < 1 || Number(mes) > 12) return setErro("Validade inválida (MM/AA).");
    if (cvv.length < 3) return setErro("CVV inválido.");
    const sdk = sdkRef.current;
    if (!sdk) return setErro("Pagamento com cartão indisponível no momento. Use o PIX.");

    const cpf = form.cpf.replace(/\D/g, "");
    const tel = form.whatsapp.replace(/\D/g, "");
    setCarregando(true);
    setEtapa("processando");
    try {
      const { cardToken } = await sdk.createToken({
        holderName: form.nome.trim(),
        cardNumber: numero,
        cvv,
        expMonth: mes,
        expYear: ano,
      });
      await sdk.completeAntifraudProfile();
      const antifraudRef = sdk.getAntifraudReference();

      const r = await fetch("/api/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome.trim(), email: form.email.trim(), cpf, whatsapp: tel,
          fingerprint: fingerprint(), cardToken, antifraudRef, installments: card.installments, metadata,
        }),
      });
      const j = await r.json();
      if (j.ok && j.pago) {
        try { window.fbq && window.fbq("trackCustom", "CartaoAprovado", { currency: "BRL" }); } catch {}
        setEtapa("pago");
        setTimeout(() => { window.location.href = "/bem-vinda?email=" + encodeURIComponent(form.email.trim()); }, 1800);
      } else if (j.ok && !j.pago) {
        setErro("Cartão recusado. Tente outro cartão ou pague no PIX.");
        setEtapa("form");
      } else {
        setErro(j.erro || "Não foi possível processar o cartão.");
        setEtapa("form");
      }
    } catch (e) {
      setErro(e?.message?.includes("token") ? "Confira os dados do cartão." : "Não foi possível processar o cartão. Tente o PIX.");
      setEtapa("form");
    }
    setCarregando(false);
  }

  function enviar(e) {
    e?.preventDefault();
    setErro("");
    const err = validarCliente();
    if (err) return setErro(err);
    if (metodo === "pix") gerarPix();
    else pagarCartao();
  }

  // Polling do PIX.
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
          setTimeout(() => { window.location.href = "/bem-vinda?email=" + encodeURIComponent(form.email.trim()); }, 1800);
        }
      } catch {}
    }
    pollRef.current = setInterval(checa, 4000);
    checa();
    return () => { vivo = false; clearInterval(pollRef.current); };
  }, [etapa, pix?.id, form.email]);

  // Contagem regressiva do PIX.
  useEffect(() => {
    if (etapa !== "pix" || !pix?.expiraEm) return;
    const fim = new Date(pix.expiraEm).getTime();
    const tick = () => setRestante(Math.max(0, Math.round((fim - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [etapa, pix]);

  function copiar() {
    try {
      navigator.clipboard.writeText(pix.qrCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {}
  }

  const precoMostra = fmtReais(pix?.amount) || valorMostra;
  const parcelaSel = opcoesParcela.find((p) => p.n === Number(card.installments)) || opcoesParcela[0];

  return (
    <div className="pix-overlay" role="dialog" aria-modal="true">
      <div className="pix-card">
        <div className="pix-top">
          <span className="pix-brand">✦ Damas Virtuosas</span>
          {onClose && etapa === "form" && (
            <button className="pix-x" onClick={onClose} aria-label="Fechar">×</button>
          )}
        </div>

        {/* ── FORM (cliente + método) ───────────────────────────── */}
        {etapa === "form" && (
          <form className="pix-form" onSubmit={enviar}>
            <div className="pix-h">Falta pouco para o seu acesso</div>
            <p className="pix-sub">Preencha os seus dados. O acesso é liberado <b>na hora</b> do pagamento.</p>

            <input className="pix-in" placeholder="Seu nome completo" value={form.nome} autoComplete="name" onChange={(e) => set("nome", e.target.value)} />
            <input className="pix-in" placeholder="Seu melhor e-mail" value={form.email} type="email" autoComplete="email" inputMode="email" onChange={(e) => set("email", e.target.value)} />
            <input className="pix-in" placeholder="WhatsApp com DDD" value={form.whatsapp} inputMode="numeric" autoComplete="tel" onChange={(e) => set("whatsapp", mascTel(e.target.value))} />
            <input className="pix-in" placeholder="CPF" value={form.cpf} inputMode="numeric" onChange={(e) => set("cpf", mascCpf(e.target.value))} />

            <div className="pix-tabs">
              <button type="button" className={"pix-tab" + (metodo === "pix" ? " on" : "")} onClick={() => { setMetodo("pix"); setErro(""); }}>
                <b>PIX</b><span>na hora</span>
              </button>
              <button type="button" className={"pix-tab" + (metodo === "cartao" ? " on" : "")} onClick={() => { setMetodo("cartao"); setErro(""); }}>
                <b>Cartão</b><span>até {opcoesParcela[opcoesParcela.length - 1].n}x</span>
              </button>
            </div>

            {metodo === "cartao" && (
              <div className="pix-cardfields">
                <input className="pix-in" placeholder="Número do cartão" value={card.numero} inputMode="numeric" autoComplete="cc-number" onChange={(e) => setC("numero", mascCartao(e.target.value))} />
                <div className="pix-lin2">
                  <input className="pix-in" placeholder="Validade MM/AA" value={card.validade} inputMode="numeric" autoComplete="cc-exp" onChange={(e) => setC("validade", mascValidade(e.target.value))} />
                  <input className="pix-in" placeholder="CVV" value={card.cvv} inputMode="numeric" autoComplete="cc-csc" onChange={(e) => setC("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))} />
                </div>
                {opcoesParcela.length > 1 && (
                  <select className="pix-in pix-sel" value={card.installments} onChange={(e) => setC("installments", Number(e.target.value))}>
                    {opcoesParcela.map((p) => <option key={p.n} value={p.n}>{p.label}</option>)}
                  </select>
                )}
              </div>
            )}

            {erro && <div className="pix-erro">{erro}</div>}

            <button className="pix-btn" type="submit" disabled={carregando}>
              {carregando ? "Processando…" : metodo === "pix"
                ? `Gerar PIX${valorMostra ? " · " + valorMostra : ""}`
                : `Pagar ${parcelaSel.label}`}
            </button>
            <div className="pix-selos">🔒 Ambiente seguro · ✓ Acesso vitalício · ✓ 7 dias de garantia</div>
          </form>
        )}

        {/* ── PIX (QR + copia e cola) ──────────────────────────── */}
        {etapa === "pix" && (
          <div className="pix-pay">
            <div className="pix-h">Pague com PIX para liberar</div>
            <p className="pix-sub">Abra o app do seu banco, escaneie o código ou use o <b>copia e cola</b>.</p>
            {pix?.qrImg
              ? <img className="pix-qr" src={pix.qrImg} alt="QR Code do PIX" width={230} height={230} />
              : <div className="pix-qr pix-qr-vazio">QR indisponível — use o copia e cola abaixo</div>}
            <button className={"pix-copia" + (copiado ? " ok" : "")} onClick={copiar}>
              {copiado ? "✓ Código copiado!" : "📋 Copiar código PIX"}
            </button>
            <div className="pix-code" onClick={copiar} title="Toque para copiar">{pix?.qrCode}</div>
            <div className="pix-espera"><span className="pix-dot" /> Aguardando o pagamento…{precoMostra ? <b> {precoMostra}</b> : null}</div>
            {restante != null && restante > 0 && <div className="pix-timer">Este código expira em {fmtSeg(restante)}</div>}
            <p className="pix-nota">Assim que o pagamento cair, esta tela abre o seu acesso automaticamente.</p>
          </div>
        )}

        {/* ── PROCESSANDO (cartão) ─────────────────────────────── */}
        {etapa === "processando" && (
          <div className="pix-ok">
            <div className="pix-spin" />
            <div className="pix-h">Processando o seu cartão…</div>
            <p className="pix-sub">Só um instante. Não feche esta tela.</p>
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
