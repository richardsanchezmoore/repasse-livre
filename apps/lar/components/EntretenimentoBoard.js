"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { falar, pararFala, vozDisponivel } from "@/lib/falar";
import CompartilharWhats from "@/components/CompartilharWhats";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const TEMAS = ["Geral", "Antigo Testamento", "Novo Testamento", "Mulheres da Bíblia", "Provérbios e sabedoria", "Milagres de Jesus", "Histórias para crianças"];
const NIVEIS = [{ k: "facil", t: "Fácil" }, { k: "medio", t: "Médio" }, { k: "dificil", t: "Difícil" }];
const FAIXAS = [{ k: "criancas", t: "Crianças" }, { k: "familia", t: "Família toda" }, { k: "adultos", t: "Adultos" }];

function tier(acertos, total) {
  const p = total ? acertos / total : 0;
  if (p === 1) return { emoji: "👑", t: "Mestre da Palavra!" };
  if (p >= 0.7) return { emoji: "🌟", t: "Muito bem!" };
  if (p >= 0.4) return { emoji: "💛", t: "Tá no caminho!" };
  return { emoji: "🌱", t: "Bora aprender mais!" };
}

export default function EntretenimentoBoard({ logado = false, familia = null }) {
  const [aba, setAba] = useState("quiz");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="tabs">
        <button className={aba === "quiz" ? "on" : ""} onClick={() => setAba("quiz")}>🎯 Quiz Bíblico</button>
        <button className={aba === "brinca" ? "on" : ""} onClick={() => setAba("brinca")}>🎲 Brincadeira</button>
      </div>
      {aba === "quiz" ? <Quiz logado={logado} familia={familia} /> : <Brincadeira logado={logado} familia={familia} />}
    </div>
  );
}

// ─── QUIZ BÍBLICO ────────────────────────────────────────────────────────────
function Quiz({ logado, familia }) {
  const [tema, setTema] = useState("Geral");
  const [nivel, setNivel] = useState("medio");
  const [faixa, setFaixa] = useState("familia");
  const [fase, setFase] = useState("setup"); // setup | jogando | fim
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [perguntas, setPerguntas] = useState([]);
  const [recado, setRecado] = useState("");
  const [idx, setIdx] = useState(0);
  const [escolha, setEscolha] = useState(null);
  const [acertos, setAcertos] = useState(0);

  async function comecar() {
    setErro(""); setBusy(true);
    try {
      const r = await fetch(BASE + "/api/marta/jogo", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ tema, nivel, faixa, n: 5 }),
      });
      const d = await r.json();
      if (!d.ok) { setErro(d.erro || "Não consegui criar o quiz agora."); return; }
      setPerguntas(d.perguntas); setRecado(d.recado || "");
      setIdx(0); setEscolha(null); setAcertos(0); setFase("jogando");
    } catch { setErro("Sem conexão com a Marta agora."); }
    finally { setBusy(false); }
  }

  function responder(i) {
    if (escolha != null) return;
    setEscolha(i);
    if (i === perguntas[idx].correta) setAcertos((a) => a + 1);
  }
  function proxima() {
    if (idx < perguntas.length - 1) { setIdx(idx + 1); setEscolha(null); }
    else setFase("fim");
  }
  function reiniciar() { setFase("setup"); setPerguntas([]); setEscolha(null); setIdx(0); setAcertos(0); }

  if (fase === "setup") {
    return (
      <>
        <div className="marta-hi">
          <div className="av">M</div>
          <div className="msg">Bora brincar e aprender juntas? 💛 Eu preparo um <b>quiz bíblico</b> na hora — escolha o tema e pra quem é.</div>
        </div>
        <div className="card">
          <div className="field">
            <label>Tema</label>
            <div className="chips">
              {TEMAS.map((t) => (
                <button key={t} type="button" className={"chip" + (tema === t ? " on" : "")} onClick={() => setTema(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Nível</label>
            <div className="tabs">
              {NIVEIS.map((n) => <button key={n.k} className={nivel === n.k ? "on" : ""} onClick={() => setNivel(n.k)}>{n.t}</button>)}
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Pra quem?</label>
            <div className="tabs">
              {FAIXAS.map((f) => <button key={f.k} className={faixa === f.k ? "on" : ""} onClick={() => setFaixa(f.k)}>{f.t}</button>)}
            </div>
          </div>
        </div>
        <button className="btn" onClick={comecar} disabled={busy}>🎯 Começar o quiz</button>
        {busy && <div className="loading"><div className="spin" /><p className="muted">A Marta está preparando as perguntas…</p></div>}
        {erro && <p className="erro">{erro}</p>}
      </>
    );
  }

  if (fase === "jogando") {
    const q = perguntas[idx];
    const revelado = escolha != null;
    return (
      <>
        <div className="qz-top">
          <span className="qz-passo">Pergunta {idx + 1} de {perguntas.length}</span>
          <span className="qz-placar">✔ {acertos}</span>
        </div>
        <div className="qz-bar"><span style={{ width: `${((idx + (revelado ? 1 : 0)) / perguntas.length) * 100}%` }} /></div>

        <div className="card" style={{ marginTop: 4 }}>
          <div className="c-t" style={{ fontSize: 18, marginBottom: 12 }}>{q.pergunta}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {q.opcoes.map((o, i) => {
              let cls = "qz-opt";
              if (revelado) {
                if (i === q.correta) cls += " certo";
                else if (i === escolha) cls += " errado";
                else cls += " off";
              }
              return (
                <button key={i} type="button" className={cls} onClick={() => responder(i)} disabled={revelado}>
                  <span className="qz-letra">{String.fromCharCode(65 + i)}</span>
                  <span className="qz-txt">{o}</span>
                  {revelado && i === q.correta && <span className="qz-mark">✓</span>}
                  {revelado && i === escolha && i !== q.correta && <span className="qz-mark">✕</span>}
                </button>
              );
            })}
          </div>
          {revelado && q.explica && (
            <div className="qz-explica">{escolha === q.correta ? "🎉 Isso! " : "💡 "}{q.explica}</div>
          )}
        </div>

        {revelado && (
          <button className="btn" onClick={proxima}>{idx < perguntas.length - 1 ? "Próxima →" : "Ver o resultado 🏁"}</button>
        )}
      </>
    );
  }

  // fim
  const t = tier(acertos, perguntas.length);
  const textoWhats = `🎯 Joguei o *Quiz Bíblico* da Marta (${tema}) e acertei ${acertos} de ${perguntas.length}! ${t.emoji}\nConsegue me superar? 😄`;
  return (
    <>
      <div className="qz-fim">
        <div className="qz-fim-emoji">{t.emoji}</div>
        <div className="qz-fim-score">{acertos}<span> / {perguntas.length}</span></div>
        <div className="qz-fim-tier">{t.t}</div>
        {recado && <p className="muted" style={{ marginTop: 6 }}>“{recado}” — Marta</p>}
      </div>
      <CompartilharWhats texto={textoWhats} familia={familia} logado={logado} label="Desafiar a família no WhatsApp" />
      <button className="btn" onClick={comecar} disabled={busy}>{busy ? "Preparando…" : "🔁 Jogar de novo (novas perguntas)"}</button>
      <button className="btn ghost" onClick={reiniciar}>⚙️ Trocar tema/nível</button>
      <Link href="/" prefetch className="btn ghost" style={{ textDecoration: "none" }}>🏠 Voltar pro início</Link>
    </>
  );
}

// ─── BRINCADEIRA EM FAMÍLIA ──────────────────────────────────────────────────
function Brincadeira({ logado, familia }) {
  const [tempo, setTempo] = useState("normal");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [res, setRes] = useState(null);
  const [falando, setFalando] = useState(false);
  const [temVoz, setTemVoz] = useState(false);
  useEffect(() => { setTemVoz(vozDisponivel()); return () => pararFala(); }, []);

  async function sugerir() {
    setErro(""); setBusy(true); setRes(null); pararFala(); setFalando(false);
    try {
      const r = await fetch(BASE + "/api/marta/brincadeira", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ tempo }),
      });
      const d = await r.json();
      if (!d.ok) { setErro(d.erro || "Não consegui sugerir agora."); return; }
      setRes(d);
    } catch { setErro("Sem conexão com a Marta agora."); }
    finally { setBusy(false); }
  }

  function ouvir() {
    if (!res) return;
    if (falando) { pararFala(); setFalando(false); return; }
    const t = [res.titulo + ".", ...res.comoJogar].join(" ");
    falar(t, { onInicio: () => setFalando(true), onFim: () => setFalando(false) });
  }

  const textoWhats = res
    ? `🎲 *${res.titulo}*${res.duracao ? ` (${res.duracao})` : ""}\nNossa brincadeira em família de hoje — pela Marta:\n${res.comoJogar.map((p, i) => `${i + 1}. ${p}`).join("\n")}${res.referencia ? `\n💛 ${res.valor ? res.valor + " · " : ""}${res.referencia}` : ""}`
    : "";

  if (!res) {
    return (
      <>
        <div className="marta-hi">
          <div className="av">M</div>
          <div className="msg">Que tal <b>desligar as telas</b> e brincar juntos? 💛 Eu penso numa brincadeira cristã pra fazerem <b>hoje</b>, com o que já tem em casa.</div>
        </div>
        <div className="card">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Quanto tempo vocês têm?</label>
            <div className="tabs">
              <button className={tempo === "rapido" ? "on" : ""} onClick={() => setTempo("rapido")}>Rapidinha</button>
              <button className={tempo === "normal" ? "on" : ""} onClick={() => setTempo("normal")}>Uma boa brincadeira</button>
            </div>
          </div>
        </div>
        <button className="btn" onClick={sugerir} disabled={busy}>🎲 Sugerir uma brincadeira</button>
        {busy && <div className="loading"><div className="spin" /><p className="muted">A Marta está pensando numa brincadeira boa…</p></div>}
        {erro && <p className="erro">{erro}</p>}
      </>
    );
  }

  return (
    <>
      <div className="card">
        <div className="c-k">🎲 Brincadeira de hoje{res.duracao ? ` · ${res.duracao}` : ""}</div>
        <div className="c-t" style={{ marginTop: 4 }}>{res.titulo}</div>
        {res.materiais?.length > 0 && (
          <div className="chips" style={{ marginTop: 8 }}>
            {res.materiais.map((m, i) => <span key={i} className="chip" style={{ pointerEvents: "none" }}>🧺 {m}</span>)}
          </div>
        )}
        <div className="eyebrow" style={{ margin: "16px 0 8px" }}>Como brincar</div>
        <ol className="qz-passos">
          {res.comoJogar.map((p, i) => <li key={i}>{p}</li>)}
        </ol>
        {res.referencia && (
          <div className="recado" style={{ marginTop: 14 }}>
            {res.valor ? <b>{res.valor}</b> : null}{res.valor ? " · " : ""}📖 {res.referencia}
            {res.recado && <><br /><span className="muted">“{res.recado}” — Marta</span></>}
          </div>
        )}
      </div>

      {temVoz && (
        <button className={"btn" + (falando ? "" : " ghost")} onClick={ouvir}
          style={falando ? {} : { color: "var(--sage-deep)", borderColor: "var(--sage)" }}>
          {falando ? "⏹ Parar a Marta" : "🔊 Ouvir as regras"}
        </button>
      )}
      <CompartilharWhats texto={textoWhats} familia={familia} logado={logado} label="Chamar a família no WhatsApp" />
      <button className="btn ghost" onClick={sugerir} disabled={busy}>{busy ? "Pensando…" : "↺ Outra brincadeira"}</button>
      <Link href="/" prefetch className="btn ghost" style={{ textDecoration: "none" }}>🏠 Voltar pro início</Link>
    </>
  );
}
