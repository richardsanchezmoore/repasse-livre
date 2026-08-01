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

export default function ConstrutorAssinaturas({ planosIniciais, webhook, secret }) {
  const router = useRouter();
  const [p, setP] = useState({ kit: {}, assinatura: {}, ...planosIniciais });
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const upd = (plano, campo, v) => setP({ ...p, [plano]: { ...p[plano], [campo]: v } });

  async function salvar() {
    setBusy(true); setOk(false);
    try { await salvarPlanos(p); setOk(true); router.refresh(); } finally { setBusy(false); }
  }
  function copiar(txt) { try { navigator.clipboard?.writeText(txt); } catch {} }

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
        <p className="c-p" style={{ marginBottom: 10 }}>Na Cakto, no produto → <strong>Webhooks</strong>, marque <strong>Compra aprovada</strong> + <strong>Reembolso</strong> e preencha os dois campos abaixo. A mesma URL serve pro Kit e pra assinatura.</p>

        <label className="fld-l">URL do webhook</label>
        <div className="wh"><code>{webhook}</code></div>
        <button type="button" className="mini" onClick={() => copiar(webhook)} style={{ marginTop: 6 }}>Copiar URL</button>

        <label className="fld-l" style={{ marginTop: 12 }}>Chave secreta do webhook</label>
        <div className="wh"><code>{secret}</code></div>
        <button type="button" className="mini" onClick={() => copiar(secret)} style={{ marginTop: 6 }}>Copiar segredo</button>

        <p className="opt" style={{ marginTop: 12 }}>⚠️ Adicione <code>CORTE_CAKTO_SECRET</code> (este segredo) nas variáveis da <strong>Vercel</strong> e faça redeploy, senão o webhook responde 401.</p>
      </section>
    </div>
  );
}
