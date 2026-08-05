"use client";
import { useState, useEffect } from "react";
import { falar, pararFala, vozDisponivel } from "@/lib/falar";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export default function CozinhaPlanner() {
  const [tamanho, setTamanho] = useState(4);
  const [restricoes, setRestricoes] = useState("");
  const [ingredientes, setIngredientes] = useState("");
  const [dias, setDias] = useState(["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]);
  const [tempo, setTempo] = useState("rapido");

  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [res, setRes] = useState(null); // { dias, recado, lista }
  const [comprados, setComprados] = useState({});
  const [falando, setFalando] = useState(false);
  const [temVoz, setTemVoz] = useState(false);

  useEffect(() => { setTemVoz(vozDisponivel()); return () => pararFala(); }, []);

  function toggleDia(d) {
    setDias((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  // Monta a fala natural da Marta (recado + a semana em voz alta).
  function montarFala() {
    if (!res) return "";
    const partes = [];
    if (res.recado) partes.push(res.recado);
    partes.push("Aqui está a sua semana.");
    for (const d of res.dias) {
      let t = d.dia + ".";
      if (d.almoco?.nome) t += " No almoço, " + d.almoco.nome + ".";
      if (d.jantar?.nome) t += " No jantar, " + d.jantar.nome + ".";
      partes.push(t);
    }
    partes.push("A lista de compras já está pronta pra você. Bom trabalho, querida.");
    return partes.join(" ");
  }

  function ouvir() {
    if (falando) { pararFala(); setFalando(false); return; }
    falar(montarFala(), { onInicio: () => setFalando(true), onFim: () => setFalando(false) });
  }

  async function montar() {
    setErro(""); setBusy(true); setRes(null);
    try {
      const r = await fetch((process.env.NEXT_PUBLIC_BASE_PATH || "") + "/api/marta/cardapio", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ tamanho, restricoes, ingredientes, dias, tempo }),
      });
      const d = await r.json();
      if (!d.ok) { setErro(d.erro || "Não consegui montar agora. Tente de novo."); return; }
      // reordena os dias na ordem da semana
      d.dias?.sort?.((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia));
      setRes(d); setComprados({});
    } catch {
      setErro("Sem conexão com a Marta agora. Tente novamente.");
    } finally { setBusy(false); }
  }

  // agrupa a lista por seção
  const porSecao = {};
  for (const it of res?.lista || []) (porSecao[it.secao] = porSecao[it.secao] || []).push(it);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!res && !busy && (
        <>
          <div className="marta-hi">
            <div className="av">M</div>
            <div className="msg">Me conta rapidinho e eu monto a semana inteira — com a <b>lista de compras</b> pronta, separada por corredor do mercado.</div>
          </div>

          <div className="card">
            <div className="field">
              <label>Quantas pessoas em casa?</label>
              <div className="row">
                <input className="inp" type="number" min="1" max="15" value={tamanho}
                  onChange={(e) => setTamanho(Math.max(1, Math.min(15, Number(e.target.value) || 1)))} />
              </div>
            </div>

            <div className="field">
              <label>Alguma restrição ou alergia? <span className="hint">(a Marta nunca vai usar esses ingredientes)</span></label>
              <input className="inp" value={restricoes} onChange={(e) => setRestricoes(e.target.value)}
                placeholder="Ex.: sem lactose, alergia a amendoim…" />
            </div>

            <div className="field">
              <label>O que você já tem em casa? <span className="hint">(opcional — eu aproveito)</span></label>
              <textarea className="inp" value={ingredientes} onChange={(e) => setIngredientes(e.target.value)}
                placeholder="Ex.: frango, arroz, ovos, cenoura, batata…" />
            </div>

            <div className="field">
              <label>Quais dias você quer planejar?</label>
              <div className="chips">
                {DIAS.map((d) => (
                  <button key={d} type="button" className={"chip" + (dias.includes(d) ? " on" : "")} onClick={() => toggleDia(d)}>
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="field" style={{ marginBottom: 4 }}>
              <label>Como está a semana?</label>
              <div className="tabs">
                <button className={tempo === "rapido" ? "on" : ""} onClick={() => setTempo("rapido")}>Correria · rápido</button>
                <button className={tempo === "elaborado" ? "on" : ""} onClick={() => setTempo("elaborado")}>Posso caprichar</button>
              </div>
            </div>
          </div>

          <button className="btn" onClick={montar} disabled={busy || !dias.length}>🍳 Montar a minha semana</button>
          {erro && <p className="erro">{erro}</p>}
        </>
      )}

      {busy && (
        <div className="loading">
          <div className="spin" />
          <p className="muted">A Marta está pensando no cardápio da semana e montando a sua lista de compras…</p>
        </div>
      )}

      {res && !busy && (
        <>
          {res.recado && <div className="recado">“{res.recado}” <br /><span className="muted">— Marta</span></div>}

          {temVoz && (
            <button className={"btn" + (falando ? "" : " ghost")} onClick={ouvir}
              style={falando ? {} : { color: "var(--sage-deep)", borderColor: "var(--sage)" }}>
              {falando ? "⏹ Parar a Marta" : "🔊 Ouvir a Marta ler pra você"}
            </button>
          )}

          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>O seu cardápio</div>
            <div className="week">
              {res.dias.map((d, i) => (
                <div key={i} className="day">
                  <div className="dh">{d.dia}</div>
                  {["almoco", "jantar"].map((k) => d[k]?.nome ? (
                    <div key={k} className="meal">
                      <div className="when">{k === "almoco" ? "Almoço" : "Jantar"}</div>
                      <div>
                        <div className="name">{d[k].nome}</div>
                        {Array.isArray(d[k].ingredientes) && d[k].ingredientes.length > 0 && (
                          <div className="ings">{d[k].ingredientes.map((g) => g.item).join(" · ")}</div>
                        )}
                      </div>
                    </div>
                  ) : null)}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>🛒 Lista de compras <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>· separada por corredor</span></div>
            {Object.entries(porSecao).map(([secao, itens]) => (
              <div key={secao} className="sec">
                <div className="sh">{secao}</div>
                {itens.map((it, i) => {
                  const chave = secao + it.item;
                  const done = !!comprados[chave];
                  return (
                    <div key={i} className={"item" + (done ? " done" : "")}
                      onClick={() => setComprados((c) => ({ ...c, [chave]: !c[chave] }))}>
                      <span className="box">{done ? "✓" : ""}</span>
                      <span className="nm">{it.item}</span>
                      {it.qtd && <span className="q">{it.qtd}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <button className="btn ghost" onClick={() => setRes(null)}>↺ Montar outra semana</button>
          <p className="muted" style={{ textAlign: "center" }}>
            Gostou? Em breve você vai poder <b>salvar</b>, receber toda semana e deixar a Marta cuidar da casa inteira. 💛
          </p>
        </>
      )}
    </div>
  );
}
