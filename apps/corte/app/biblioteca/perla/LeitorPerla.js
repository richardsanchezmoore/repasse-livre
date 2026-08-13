"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  LeitorPerla — a EXPERIÊNCIA (o design; o conteúdo vem de lib/perlaConteudo).
//
//  Coração: o método PERLA é DESCOBERTO, não anunciado. O rastreador nasce
//  mascarado ( ? ? ? ? ? ) e cada letra só acende quando a leitora chega à sua
//  "peça". A descoberta persiste (localStorage), como um workbook que lembra
//  de onde você parou. A montagem final (P·E·R·L·A → PERLA) é o clímax.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { PERLA, LETRAS } from "@/lib/perlaConteudo";

const K_LETRAS = "perla:letras";
const K_MISSOES = "perla:missoes";

// ── blocos de leitura ────────────────────────────────────────────────────────
function Corpo({ itens }) {
  return itens.map((it, i) => {
    if (typeof it === "string") return <p key={i} className="perla-p">{it}</p>;
    if (it.q) return <p key={i} className="perla-q">{it.q}</p>;
    if (it.mini) return <p key={i} className="perla-mini">{it.mini}</p>;
    if (it.fala)
      return (
        <blockquote key={i} className="perla-fala">
          <p>{it.fala}</p>
          {it.quem && <cite>— {it.quem}</cite>}
        </blockquote>
      );
    return null;
  });
}

function Municoes({ itens }) {
  if (!itens || !itens.length) return null;
  return (
    <div className="perla-mun">
      <div className="perla-mun-h">🔥 Munições da Lady</div>
      <ul>
        {itens.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

function Missao({ id, texto, feito, onToggle }) {
  return (
    <div className={"perla-mis" + (feito ? " ok" : "")}>
      <div className="perla-mis-h">✦ Sua missão</div>
      <p>{texto}</p>
      <button type="button" className="perla-mis-chk" onClick={() => onToggle(id)}>
        <span className="box" aria-hidden>{feito ? "✓" : ""}</span>
        {feito ? "Missão cumprida" : "Marcar como cumprida"}
      </button>
    </div>
  );
}

export default function LeitorPerla() {
  const [descobertas, setDescobertas] = useState(() => new Set());
  const [missoes, setMissoes] = useState(() => new Set());
  const [finalOn, setFinalOn] = useState(false);
  const rootRef = useRef(null);

  // Restaura progresso salvo.
  useEffect(() => {
    try {
      const l = JSON.parse(localStorage.getItem(K_LETRAS) || "[]");
      const m = JSON.parse(localStorage.getItem(K_MISSOES) || "[]");
      if (l.length) setDescobertas(new Set(l));
      if (m.length) setMissoes(new Set(m));
    } catch {}
  }, []);

  // Observa as "peças": ao chegar em cada uma, a letra é descoberta (e fica).
  useEffect(() => {
    const alvos = rootRef.current?.querySelectorAll("[data-letra]");
    if (!alvos?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        let mudou = false;
        const nova = new Set();
        for (const e of entries) {
          if (e.isIntersecting) {
            const L = e.target.getAttribute("data-letra");
            if (L) nova.add(L);
            if (e.target.hasAttribute("data-final")) setFinalOn(true);
          }
        }
        if (nova.size) {
          setDescobertas((prev) => {
            const next = new Set(prev);
            for (const L of nova) if (!next.has(L)) { next.add(L); mudou = true; }
            if (mudou) { try { localStorage.setItem(K_LETRAS, JSON.stringify([...next])); } catch {} }
            return mudou ? next : prev;
          });
        }
      },
      // Faixa central da tela: dispara quando a peça (mesmo mais alta que a
      // viewport) cruza o meio — threshold alto nunca fecharia em seção grande.
      { rootMargin: "-38% 0px -38% 0px", threshold: 0 }
    );
    alvos.forEach((a) => io.observe(a));
    return () => io.disconnect();
  }, []);

  function toggleMissao(id) {
    setMissoes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem(K_MISSOES, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  const completo = descobertas.size >= LETRAS.length;

  return (
    <div className="perla" ref={rootRef}>
      {/* ── CAPA ───────────────────────────────────────────────────────────── */}
      <header className="perla-capa" style={{ backgroundImage: `url(${PERLA.capa.img})` }}>
        <div className="perla-capa-v">
          <div className="perla-eyebrow">Damas Virtuosas</div>
          <h1 className="perla-titulo">{PERLA.capa.titulo}</h1>
          <p className="perla-capa-sub">{PERLA.capa.subtitulo}</p>
          <div className="perla-autora">{PERLA.capa.autora}</div>
          <div className="perla-scroll" aria-hidden>⌄</div>
        </div>
      </header>

      {/* ── CARTA DE ABERTURA ─────────────────────────────────────────────── */}
      <section className="perla-carta">
        <div className="perla-rotulo">{PERLA.cartaAbertura.rotulo}</div>
        <Corpo itens={PERLA.cartaAbertura.corpo} />
        <div className="perla-assina">{PERLA.cartaAbertura.assinatura}</div>
      </section>

      {/* ── EXISTE UMA CHAVE ──────────────────────────────────────────────── */}
      <section className="perla-chave" style={{ backgroundImage: `url(${PERLA.chave.img})` }}>
        <div className="perla-chave-v">
          <div className="perla-eyebrow ouro">{PERLA.chave.rotulo}</div>
          <Corpo itens={PERLA.chave.corpo} />
        </div>
      </section>

      {/* ── MOVIMENTOS ────────────────────────────────────────────────────── */}
      {PERLA.movimentos.map((mov, mi) => (
        <div key={mov.n} className="perla-movimento">
          {/* capa do movimento */}
          <section className="perla-mov-capa" style={{ backgroundImage: `url(${mov.img})` }}>
            <div className="perla-mov-v">
              <div className="perla-mov-n">{mov.n}</div>
              <h2 className="perla-mov-nome">{mov.nome}</h2>
              <p className="perla-mov-frase">{mov.frase}</p>
              <div className="perla-mov-cont">A jornada continua</div>
            </div>
          </section>

          {/* encontros */}
          {mov.encontros.map((enc, ei) => {
            const mid = `${mi}-${ei}`;
            return (
              <section key={ei} className="perla-enc">
                {enc.img && <img className="perla-enc-img" src={enc.img} alt="" loading="lazy" />}
                <h3 className="perla-enc-t">{enc.titulo}</h3>
                {enc.kicker && <p className="perla-enc-k">{enc.kicker}</p>}
                <Corpo itens={enc.corpo} />
                <Municoes itens={enc.municoes} />
                {enc.missao && (
                  <Missao id={mid} texto={enc.missao} feito={missoes.has(mid)} onToggle={toggleMissao} />
                )}
                {enc.selo && <p className="perla-selo">{enc.selo}</p>}
              </section>
            );
          })}

          {/* interlúdio (respiro) */}
          {mov.interludio && (
            <section className="perla-interludio" style={{ backgroundImage: `url(${mov.interludio.img})` }}>
              <div className="perla-interludio-v">
                {mov.interludio.linhas.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </div>
            </section>
          )}

          {/* a peça — descoberta da letra (revela via estado; persiste) */}
          <section
            className={"perla-peca" + (descobertas.has(mov.peca.letra) ? " revelada" : "")}
            data-letra={mov.peca.letra}
          >
            <div className="perla-peca-tag">{mov.peca.pergunta}</div>
            {mov.peca.conector && <p className="perla-peca-con">{mov.peca.conector}</p>}
            <div className="perla-peca-letra">{mov.peca.letra}</div>
            <div className="perla-peca-cmd">{mov.peca.comando}</div>
            <p className="perla-peca-frase">“{mov.peca.frase}”</p>
            {mov.peca.nota && <p className="perla-peca-nota">{mov.peca.nota}</p>}
          </section>
        </div>
      ))}

      {/* ── REVELAÇÃO / MONTAGEM ──────────────────────────────────────────── */}
      <section className="perla-revela" data-final>
        {PERLA.revelacao.antes.map((l, i) => (
          <p key={i} className="perla-revela-antes">{l}</p>
        ))}
        <div className="perla-revela-chamada">{PERLA.revelacao.chamada}</div>
        <div className={"perla-montagem" + (finalOn ? " on" : "")}>
          {PERLA.perla.significados.map((s, i) => (
            <span key={s.letra} style={{ "--i": i }}>{s.letra}</span>
          ))}
        </div>
        <p className="perla-revela-depois">{PERLA.revelacao.depois}</p>
      </section>

      {/* ── PERLA (o nome, enfim) ─────────────────────────────────────────── */}
      <section className="perla-nome">
        <h2 className="perla-nome-palavra">{PERLA.perla.palavra}</h2>
        <div className="perla-signi">
          {PERLA.perla.significados.map((s) => (
            <div key={s.letra} className="perla-signi-row">
              <span className="perla-signi-l">{s.letra}</span>
              <div>
                <div className="perla-signi-t">{s.titulo}</div>
                <div className="perla-signi-d">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="perla-seq">
          <div className="perla-seq-t">{PERLA.perla.sequencia.titulo}</div>
          {PERLA.perla.sequencia.linhas.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
          <p className="perla-q perla-seq-fecho">{PERLA.perla.sequencia.fecho}</p>
        </div>
        <div className="perla-manto">{PERLA.perla.manto}</div>
      </section>

      {/* ── CARTA FINAL ───────────────────────────────────────────────────── */}
      <section className="perla-carta perla-carta-fim">
        <div className="perla-rotulo">{PERLA.cartaFinal.rotulo}</div>
        <Corpo itens={PERLA.cartaFinal.corpo} />
        <div className="perla-assina">{PERLA.cartaFinal.assinatura}</div>
      </section>

      {/* ── ENCERRAMENTO ──────────────────────────────────────────────────── */}
      <section className="perla-fim">
        <p className="perla-fim-linha">{PERLA.encerramento.linha}</p>
        <p className="perla-fim-rodape">{PERLA.encerramento.rodape}</p>
      </section>

      {/* ── RASTREADOR DE DESCOBERTA (flutuante) ──────────────────────────── */}
      <div className={"perla-track" + (completo ? " completo" : "")} role="status" aria-label="Sua descoberta">
        <span className="perla-track-lbl">{completo ? "PERLA" : "Sua descoberta"}</span>
        <div className="perla-track-dots">
          {LETRAS.map((L) => {
            const on = descobertas.has(L);
            return (
              <span key={L} className={"perla-dot" + (on ? " on" : "")}>
                {on ? L : "?"}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
