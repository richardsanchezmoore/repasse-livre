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

export default function ConstrutorAssinaturas({ planosIniciais, webhook, secret, salesUrl }) {
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
        <div className="c-k">✦ Damas Virtuosas (assinatura)</div>
        <Campo label="Nome" val={p.assinatura?.nome} onChange={(v) => upd("assinatura", "nome", v)} />
        <Campo label="Preço" val={p.assinatura?.preco} onChange={(v) => upd("assinatura", "preco", v)} ph="R$ 19,90/mês" />
        <Campo label="Descrição" val={p.assinatura?.descricao} onChange={(v) => upd("assinatura", "descricao", v)} />
        <Campo label="Link de assinatura (Cakto)" val={p.assinatura?.cakto_url} onChange={(v) => upd("assinatura", "cakto_url", v)} />
        <Campo label="ID do produto na Cakto" val={p.assinatura?.cakto_produto} onChange={(v) => upd("assinatura", "cakto_produto", v)} />
        <Campo label="Dias de teste grátis" val={p.assinatura?.trial_dias} onChange={(v) => upd("assinatura", "trial_dias", v)} ph="7" />
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="c-k">🍵 O Salão (grupo das assinantes)</div>
        <p className="c-p" style={{ marginBottom: 4 }}>Grupo <strong>privado</strong>, só liberado a quem assina (na página <code>/salao</code>).</p>
        <Campo label="Link do grupo de WhatsApp" val={p.salao_whatsapp} onChange={(v) => setP({ ...p, salao_whatsapp: v })} ph="https://chat.whatsapp.com/…" />
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="c-k">💬 A Comunidade (grupo dos leads do quiz)</div>
        <p className="c-p" style={{ marginBottom: 4 }}>Grupo <strong>aberto</strong> dos leads do quiz. Se deixar em branco, usa o link do Salão. <strong>Dica:</strong> use um grupo <strong>diferente</strong> do Salão — senão o link do grupo pago fica exposto de graça.</p>
        <Campo label="Link do grupo de WhatsApp" val={p.comunidade_whatsapp} onChange={(v) => setP({ ...p, comunidade_whatsapp: v })} ph="https://chat.whatsapp.com/…" />
        <p className="c-p" style={{ margin: "10px 0 4px" }}>Mostrar o botão "Entrar na comunidade" no fim do quiz? <strong>Desligado</strong> = foco total na landing (Kit); você adiciona os números ao grupo <strong>manualmente</strong> (aba Leads).</p>
        <button type="button" className={"chip" + (p.mostrar_comunidade_veredito ? " on" : "")} style={{ marginTop: 4 }}
          onClick={() => setP({ ...p, mostrar_comunidade_veredito: !p.mostrar_comunidade_veredito })}>
          {p.mostrar_comunidade_veredito ? "🟢 Botão aparece no Veredito" : "⚪ Oculto — foco na landing (recomendado agora)"}
        </button>
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="c-k">💬 Botão de WhatsApp na página de vendas</div>
        <p className="c-p" style={{ marginBottom: 4 }}>O botão flutuante só aparece na landing quando estiver <strong>ativado</strong> — pra não deixar ninguém no vácuo quando não houver quem responda na hora.</p>
        <Campo label="Número (com DDI+DDD, só números)" val={p.whatsapp?.numero} onChange={(v) => setP({ ...p, whatsapp: { ...p.whatsapp, numero: v } })} ph="554899999999" />
        <button type="button" className={"chip" + (p.whatsapp?.ativo ? " on" : "")} style={{ marginTop: 12 }}
          onClick={() => setP({ ...p, whatsapp: { ...p.whatsapp, ativo: !p.whatsapp?.ativo } })}>
          {p.whatsapp?.ativo ? "🟢 Botão ATIVADO — aparece na página" : "⚪ Botão desativado — oculto"}
        </button>
      </section>

      <button type="button" className="pill" onClick={salvar} disabled={busy} style={{ marginTop: 14 }}>
        {busy ? "Salvando…" : ok ? "Salvo ✓" : "Salvar planos"}
      </button>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="c-k">🔗 Ligar na Cakto</div>
        <p className="c-p" style={{ marginBottom: 10 }}>No produto da Cakto → <strong>Webhooks</strong>, marque <strong>Compra aprovada</strong> + <strong>Reembolso</strong>. A mesma URL de webhook serve pros dois produtos.</p>

        <label className="fld-l">Página de vendas <span className="opt">(campo obrigatório da Cakto — use a da assinatura)</span></label>
        <div className="wh"><code>{salesUrl}</code></div>
        <button type="button" className="mini" onClick={() => copiar(salesUrl)} style={{ marginTop: 6 }}>Copiar</button>

        <label className="fld-l" style={{ marginTop: 12 }}>URL do webhook</label>
        <div className="wh"><code>{webhook}</code></div>
        <button type="button" className="mini" onClick={() => copiar(webhook)} style={{ marginTop: 6 }}>Copiar URL</button>

        <label className="fld-l" style={{ marginTop: 12 }}>Chave secreta do webhook</label>
        <div className="wh"><code>{secret}</code></div>
        <button type="button" className="mini" onClick={() => copiar(secret)} style={{ marginTop: 6 }}>Copiar segredo</button>

        <p className="opt" style={{ marginTop: 12 }}>⚠️ Como a Cakto usa um segredo <strong>por produto</strong>, na <strong>Vercel</strong> coloque o segredo do <strong>Kit</strong> em <code>CORTE_CAKTO_SECRET</code> e o da <strong>assinatura</strong> em <code>CORTE_CAKTO_SECRET_ASSINATURA</code> — é pelo segredo que o webhook sabe qual produto liberar (não precisa de ID de produto). Depois, redeploy.</p>
      </section>
    </div>
  );
}
