"use client";
import { useState } from "react";
import CopiarWhatsapps from "@/components/CopiarWhatsapps";

const FAIXA = { green: "🟢 Cavalheiro", amber: "🟡 Alerta", red: "🔴 Fuja" };

/** Gráfico de pico por hora (0–23, horário de Brasília). */
function Histo({ porHora }) {
  const max = Math.max(1, ...porHora);
  const total = porHora.reduce((a, b) => a + b, 0);
  const top = porHora.map((c, h) => ({ c, h })).filter((x) => x.c > 0).sort((a, b) => b.c - a.c).slice(0, 3);
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="c-k">⏰ Horário de pico (Brasília)</div>
      {total === 0 ? (
        <p className="opt" style={{ marginTop: 6 }}>Sem dados ainda — aparece quando começar o tráfego.</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0 10px" }}>
            {top.map((t) => (
              <span key={t.h} className="tag" style={{ background: "var(--wine)", color: "#fdf3dd" }}>
                {String(t.h).padStart(2, "0")}h · {t.c}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 58 }}>
            {porHora.map((c, h) => (
              <div key={h} title={`${h}h: ${c}`} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}>
                <div style={{ width: "100%", height: `${Math.round((c / max) * 100)}%`, minHeight: c ? 3 : 0, borderRadius: "3px 3px 0 0", background: c ? "linear-gradient(180deg,var(--gold-2),var(--gold))" : "transparent" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            {["0h", "6h", "12h", "18h", "23h"].map((l) => <span key={l} className="opt" style={{ fontSize: 9.5 }}>{l}</span>)}
          </div>
        </>
      )}
    </div>
  );
}

function LogLista({ log }) {
  if (!log.length) return <p className="muted" style={{ textAlign: "left" }}>Nenhum registro ainda.</p>;
  return (
    <div className="shelf">
      {log.map((e, i) => (
        <div key={i} className="memb" style={{ padding: "10px 13px" }}>
          <div className="memb-email">🕐 {e.quando}{e.slug ? <span className="opt"> · {e.slug}</span> : null}</div>
        </div>
      ))}
    </div>
  );
}

export default function PainelLeads({ kpi, numeros, leads, visita, conclu, checkout }) {
  const [tab, setTab] = useState("whats");
  const chk = checkout || { total: 0, hoje: 0, compraram: 0, abandonaram: 0, porHora: Array(24).fill(0), cards: [] };

  return (
    <div style={{ marginTop: 16 }}>
      {/* KPIs do funil */}
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div className="c-k">◈ Funil (total · hoje) ◈</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
          {[
            { lbl: "Visitas", v: kpi.visitas, h: kpi.vh, ic: "👀" },
            { lbl: "Concluíram", v: kpi.concluiram, h: kpi.ch, ic: "✅" },
            { lbl: "WhatsApp", v: kpi.leads, h: kpi.lh, ic: "💬" },
          ].map((k) => (
            <div key={k.lbl} style={{ background: "rgba(255,255,255,.05)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 6px" }}>
              <div style={{ fontSize: 18 }}>{k.ic}</div>
              <div style={{ font: "900 24px var(--disp)", color: "var(--gold-2)" }}>{k.v}</div>
              <div className="opt" style={{ fontSize: 11 }}>{k.lbl}</div>
              <div className="opt" style={{ fontSize: 10.5, opacity: .8 }}>hoje: {k.h}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <span className="tag">Concluíram: {kpi.pConcl}% das visitas</span>
          <span className="tag" style={{ background: "var(--wine)", color: "#fdf3dd" }}>WhatsApp: {kpi.pLead}% de quem concluiu</span>
          <span className="tag ghost">Geral: {kpi.pGeral}%</span>
        </div>
      </div>

      {/* Checkout (pré-Cakto) — o que antes ficava às cegas */}
      <div className="card" style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <div className="c-k">🛒 Checkout (pré-Cakto · total · hoje)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
          {[
            { lbl: "Iniciaram", v: chk.total, h: chk.hoje, ic: "🛒" },
            { lbl: "Compraram", v: chk.compraram, ic: "👑" },
            { lbl: "Abandonaram", v: chk.abandonaram, ic: "⏳" },
          ].map((k) => (
            <div key={k.lbl} style={{ background: "rgba(255,255,255,.05)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 6px" }}>
              <div style={{ fontSize: 18 }}>{k.ic}</div>
              <div style={{ font: "900 24px var(--disp)", color: "var(--gold-2)" }}>{k.v}</div>
              <div className="opt" style={{ fontSize: 11 }}>{k.lbl}</div>
              {k.h != null && <div className="opt" style={{ fontSize: 10.5, opacity: .8 }}>hoje: {k.h}</div>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <span className="tag" style={{ background: "#2f6b48", color: "#fff" }}>Conversão: {kpi.pComprou}% do checkout</span>
          {chk.abandonaram > 0 && <span className="tag" style={{ background: "var(--wine)", color: "#fdf3dd" }}>👉 {chk.abandonaram} pra cobrar no Whats</span>}
        </div>
      </div>

      {/* Abas */}
      <div className="seg" style={{ marginTop: 16 }}>
        <button type="button" className={tab === "whats" ? "on" : ""} onClick={() => setTab("whats")}>💬 WhatsApp ({leads.cards.length})</button>
        <button type="button" className={tab === "checkout" ? "on" : ""} onClick={() => setTab("checkout")}>🛒 Checkout ({chk.total})</button>
        <button type="button" className={tab === "visita" ? "on" : ""} onClick={() => setTab("visita")}>👀 Log Visita ({visita.total})</button>
        <button type="button" className={tab === "conclu" ? "on" : ""} onClick={() => setTab("conclu")}>✅ Concluíram ({conclu.total})</button>
      </div>

      {tab === "checkout" && (
        <div style={{ marginTop: 12 }}>
          <Histo porHora={chk.porHora} />
          <p className="opt" style={{ margin: "0 0 10px" }}>Quem preencheu o pop-up e foi pro pagamento. <b style={{ color: "var(--wine)" }}>Sem selo “Comprou” = abandonou</b> — chame no Whats pra fechar.</p>
          <div className="shelf">
            {chk.cards.map((c, i) => {
              const digits = (c.wa || "").replace(/\D/g, "");
              const wa = digits ? (digits.startsWith("55") ? digits : "55" + digits) : "";
              const msg = encodeURIComponent(`Oi${c.nome ? " " + c.nome.split(" ")[0] : ""}! Vi que você começou a garantir o seu Kit de Discernimento 💛 Ficou alguma dúvida? Posso te ajudar a finalizar por aqui.`);
              return (
                <div key={i} className="memb">
                  <div className="memb-top">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="memb-nome">
                        {c.nome || "— sem nome"}
                        {c.membro
                          ? <span className="tag" style={{ marginLeft: 6, background: "#2f6b48", color: "#fff" }}>👑 COMPROU</span>
                          : <span className="tag" style={{ marginLeft: 6, background: "var(--wine)", color: "#fdf3dd" }}>⏳ abandonou</span>}
                      </div>
                      <div className="memb-email">💬 {c.wa || "—"}{c.email ? <span className="opt"> · {c.email}</span> : null}</div>
                    </div>
                    <div className="memb-dos" style={{ fontSize: 12, whiteSpace: "nowrap" }}>🕐 {c.quando}</div>
                  </div>
                  {wa && !c.membro && (
                    <div className="memb-chips">
                      <a className="chip" href={`https://wa.me/${wa}?text=${msg}`} target="_blank" rel="noreferrer" title="Cobrar no WhatsApp">💬 Cobrar no Whats →</a>
                    </div>
                  )}
                </div>
              );
            })}
            {chk.cards.length === 0 && <p className="muted" style={{ textAlign: "left" }}>Nenhum checkout iniciado ainda — aparece quando alguém clicar em comprar na <code>/panfleto</code>. 🛒</p>}
          </div>
        </div>
      )}

      {tab === "whats" && (
        <div style={{ marginTop: 12 }}>
          <Histo porHora={leads.porHora} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <CopiarWhatsapps numeros={numeros} />
            <span className="opt" style={{ fontSize: 11.5 }}>Um por linha (+55…) — cole ao adicionar ao grupo.</span>
          </div>
          <div className="shelf">
            {leads.cards.map((l, i) => {
              const digits = (l.wa || "").replace(/\D/g, "");
              const wa = digits ? (digits.startsWith("55") ? digits : "55" + digits) : "";
              return (
                <div key={i} className="memb">
                  <div className="memb-top">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="memb-nome">
                        {FAIXA[l.faixa] || "— sem veredito"}
                        {l.total != null && <span className="tag" style={{ marginLeft: 6 }}>{l.total} pts</span>}
                        {l.membro && <span className="tag" style={{ marginLeft: 6, background: "#2f6b48", color: "#fff" }}>MEMBRO</span>}
                      </div>
                      <div className="memb-email">💬 {l.wa || "—"}</div>
                    </div>
                    <div className="memb-dos" style={{ fontSize: 12, whiteSpace: "nowrap" }}>🕐 {l.quando}</div>
                  </div>
                  {wa && (
                    <div className="memb-chips">
                      <a className="chip" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" title="Abrir conversa no WhatsApp">💬 Abrir conversa →</a>
                    </div>
                  )}
                </div>
              );
            })}
            {leads.cards.length === 0 && <p className="muted" style={{ textAlign: "left" }}>Nenhum lead ainda — rode um anúncio apontando pro <code>/investigar</code>. 👀</p>}
          </div>
        </div>
      )}

      {tab === "visita" && (
        <div style={{ marginTop: 12 }}>
          <Histo porHora={visita.porHora} />
          <p className="opt" style={{ margin: "0 0 8px" }}>Cada visita à página <code>/investigar</code> (as {visita.total} mais recentes).</p>
          <LogLista log={visita.log} />
        </div>
      )}

      {tab === "conclu" && (
        <div style={{ marginTop: 12 }}>
          <Histo porHora={conclu.porHora} />
          <p className="opt" style={{ margin: "0 0 8px" }}>Quem respondeu tudo e viu o Veredito (as {conclu.total} mais recentes).</p>
          <LogLista log={conclu.log} />
        </div>
      )}
    </div>
  );
}
