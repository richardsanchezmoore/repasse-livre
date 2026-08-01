"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { salvarPlanos } from "@/app/admin/assinaturas/actions";

function Campo({ label, val, onChange, ph }) {
  return (
    <>
      <label className="fld-l" style={{ marginTop: 10 }}>{label}</label>
      <input className="fld" value={val ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={ph} />
    </>
  );
}

export default function ConstrutorAssinaturas({ planosIniciais, webhook }) {
  const router = useRouter();
  const [p, setP] = useState({ kit: {}, assinatura: {}, ...planosIniciais });
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const upd = (plano, campo, v) => setP({ ...p, [plano]: { ...p[plano], [campo]: v } });

  async function salvar() {
    setBusy(true); setOk(false);
    try { await salvarPlanos(p); setOk(true); router.refresh(); } finally { setBusy(false); }
  }
  function copiar() { try { navigator.clipboard?.writeText(webhook); } catch {} }

  return (
    <div>
      <section className="card" style={{ marginTop: 4 }}>
        <div className="c-k">📕 Kit da Temporada (vitalício)</div>
        <Campo label="Nome" val={p.kit?.nome} onChange={(v) => upd("kit", "nome", v)} />
        <Campo label="Preço" val={p.kit?.preco} onChange={(v) => upd("kit", "preco", v)} ph="R$ 29,90" />
        <Campo label="Descrição" val={p.kit?.descricao} onChange={(v) => upd("kit", "descricao", v)} />
        <Campo label="Link de compra (Cakto)" val={p.kit?.cakto_url} onChange={(v) => upd("kit", "cakto_url", v)} ph="https://pay.cakto.com.br/…" />
        <Campo label="ID do produto na Cakto (p/ o webhook casar)" val={p.kit?.cakto_produto} onChange={(v) => upd("kit", "cakto_produto", v)} />
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="c-k">✦ A Corte (assinatura)</div>
        <Campo label="Nome" val={p.assinatura?.nome} onChange={(v) => upd("assinatura", "nome", v)} />
        <Campo label="Preço" val={p.assinatura?.preco} onChange={(v) => upd("assinatura", "preco", v)} ph="R$ 19,90/mês" />
        <Campo label="Descrição" val={p.assinatura?.descricao} onChange={(v) => upd("assinatura", "descricao", v)} />
        <Campo label="Link de assinatura (Cakto)" val={p.assinatura?.cakto_url} onChange={(v) => upd("assinatura", "cakto_url", v)} />
        <Campo label="ID do produto na Cakto" val={p.assinatura?.cakto_produto} onChange={(v) => upd("assinatura", "cakto_produto", v)} />
        <Campo label="Dias de teste grátis" val={p.assinatura?.trial_dias} onChange={(v) => upd("assinatura", "trial_dias", v)} ph="7" />
      </section>

      <button type="button" className="pill" onClick={salvar} disabled={busy} style={{ marginTop: 14 }}>
        {busy ? "Salvando…" : ok ? "Salvo ✓" : "Salvar planos"}
      </button>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="c-k">🔗 Webhook da Cakto</div>
        <p className="c-p" style={{ marginBottom: 8 }}>Cole esta URL em <strong>Cakto → Configurações → Webhooks</strong> (eventos de compra aprovada e reembolso). Ela cria/libera o acesso sozinha.</p>
        <div className="wh"><code>{webhook}</code></div>
        <button type="button" className="mini" onClick={copiar} style={{ marginTop: 8 }}>Copiar URL</button>
        <p className="opt" style={{ marginTop: 10 }}>⚠️ Adicione também <code>CORTE_CAKTO_SECRET</code> nas variáveis da Vercel (o mesmo valor do .env.local), senão o webhook responde 401.</p>
      </section>
    </div>
  );
}
