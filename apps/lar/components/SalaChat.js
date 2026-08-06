"use client";
import { useState, useEffect, useRef } from "react";
import { criarSupabaseBrowser } from "@/lib/supabaseBrowser";
import { enviarMensagem, reagir, denunciar, bloquear } from "@/app/sala/actions";

const REACOES = { curtir: "❤️", amem: "🙌", abraco: "🫂", oro: "🙏" };

export default function SalaChat({ roda, userId, mensagensIniciais = [], bloqueados = [] }) {
  const bloq = useRef(new Set(bloqueados));
  const [msgs, setMsgs] = useState(() => (mensagensIniciais || []).filter((m) => !bloq.current.has(m.user_id)));
  const [texto, setTexto] = useState("");
  const [anonimo, setAnonimo] = useState(false);
  const [respondendo, setRespondendo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [menu, setMenu] = useState(null); // id da msg com menu aberto
  const [reagi, setReagi] = useState({}); // id -> tipo (minha reação local)
  const fimRef = useRef(null);
  const vistos = useRef(new Set(msgs.map((m) => m.id)));

  function rolar() { requestAnimationFrame(() => fimRef.current?.scrollIntoView({ behavior: "smooth" })); }
  useEffect(() => { rolar(); }, []);

  // Realtime: novas mensagens da roda aparecem na hora
  useEffect(() => {
    const sb = criarSupabaseBrowser();
    const canal = sb.channel("sala:" + roda.id)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "lar_sala_mensagens", filter: "roda_id=eq." + roda.id },
        (payload) => {
          const m = payload.new;
          if (!m || m.status !== "ativo") return;
          if (bloq.current.has(m.user_id)) return;
          if (vistos.current.has(m.id)) return;
          vistos.current.add(m.id);
          setMsgs((cur) => [...cur, m]);
          rolar();
        })
      .subscribe();
    return () => { sb.removeChannel(canal); };
  }, [roda.id]);

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setErro(""); setEnviando(true);
    const r = await enviarMensagem({ rodaId: roda.id, texto: t, anonimo, respondeA: respondendo?.id || null });
    setEnviando(false);
    if (r?.erro) { setErro(r.erro); return; }
    // append otimista (o realtime dedupa pelo id)
    if (r.id && !vistos.current.has(r.id)) {
      vistos.current.add(r.id);
      setMsgs((cur) => [...cur, {
        id: r.id, user_id: userId, texto: t, anonimo,
        autor_apelido: anonimo ? null : "Você", autor_avatar: anonimo ? "🌸" : "💛",
        responde_a: respondendo?.id || null, criado_em: r.criado_em || new Date().toISOString(),
      }]);
    }
    setTexto(""); setRespondendo(null); rolar();
  }

  async function tocarReacao(id, tipo) {
    setMenu(null);
    setReagi((r) => ({ ...r, [id]: r[id] === tipo ? null : tipo }));
    await reagir({ mensagemId: id, tipo });
  }
  async function tocarDenunciar(id) {
    setMenu(null);
    if (!confirm("Denunciar esta mensagem pra moderação?")) return;
    await denunciar({ mensagemId: id, motivo: "denúncia da Sala" });
    alert("Obrigada 💛 Nossa equipe vai revisar.");
  }
  async function tocarBloquear(uid) {
    setMenu(null);
    if (!confirm("Bloquear esta pessoa? Você não verá mais as mensagens dela.")) return;
    bloq.current.add(uid);
    setMsgs((cur) => cur.filter((m) => m.user_id !== uid));
    await bloquear({ bloqueadoId: uid });
  }

  const mapa = new Map(msgs.map((m) => [m.id, m]));

  return (
    <div className="sala-chat">
      <div className="sala-stream">
        {msgs.length === 0 && <p className="muted" style={{ textAlign: "center", marginTop: 20 }}>Seja a primeira a puxar conversa nesta roda 💛</p>}
        {msgs.map((m) => {
          const minha = m.user_id === userId;
          const nome = m.autor_apelido || "Uma irmã";
          const resp = m.responde_a ? mapa.get(m.responde_a) : null;
          return (
            <div key={m.id} className={"sala-msg" + (minha ? " minha" : "")}>
              {!minha && <div className="sala-av">{m.autor_avatar || "🌸"}</div>}
              <div className="sala-bolha">
                {!minha && <div className="sala-nome">{nome}{m.anonimo ? " · anônima" : ""}</div>}
                {resp && <div className="sala-resp">↩︎ {resp.autor_apelido || "Uma irmã"}: {String(resp.texto || "").slice(0, 60)}</div>}
                <div className="sala-txt">{m.texto}</div>
                <div className="sala-acoes">
                  <button onClick={() => setMenu(menu === m.id ? null : m.id)} aria-label="ações">⋯</button>
                  <button onClick={() => setRespondendo(m)} aria-label="responder">↩︎</button>
                  <button className={reagi[m.id] ? "on" : ""} onClick={() => tocarReacao(m.id, "oro")} title="Orar por isto">🙏</button>
                  {reagi[m.id] && reagi[m.id] !== "oro" && <span>{REACOES[reagi[m.id]]}</span>}
                </div>
                {menu === m.id && (
                  <div className="sala-menu">
                    {Object.entries(REACOES).map(([k, e]) => <button key={k} onClick={() => tocarReacao(m.id, k)}>{e}</button>)}
                    <button onClick={() => tocarDenunciar(m.id)}>⚠️ Denunciar</button>
                    {!minha && <button onClick={() => tocarBloquear(m.user_id)}>🚫 Bloquear</button>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={fimRef} />
      </div>

      <div className="sala-rodape">
        {respondendo && (
          <div className="sala-respondendo">
            ↩︎ Respondendo {respondendo.autor_apelido || "Uma irmã"}: <span className="muted">{String(respondendo.texto || "").slice(0, 50)}</span>
            <button onClick={() => setRespondendo(null)}>✕</button>
          </div>
        )}
        {erro && <p className="erro" style={{ margin: "0 12px 6px" }}>{erro}</p>}
        <div className="sala-compositor">
          <button type="button" className={"sala-anon" + (anonimo ? " on" : "")} onClick={() => setAnonimo((v) => !v)}
            title="Postar como irmã (anônima)">{anonimo ? "🌸" : "🙂"}</button>
          <input className="inp" value={texto} placeholder={anonimo ? "Como irmã (anônima)…" : "Escreva na roda…"}
            onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") enviar(); }} />
          <button className="sala-enviar" onClick={enviar} disabled={enviando} aria-label="enviar">➤</button>
        </div>
      </div>
    </div>
  );
}
