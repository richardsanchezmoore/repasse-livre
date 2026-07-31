"use client";
import { useState } from "react";

// Curadoria de emojis (nativos = zero dependência) com palavras-chave p/ busca.
const GRUPOS = [
  { nome: "Fé & Igreja", itens: [
    ["⛪","igreja templo"],["✝️","cruz fe"],["🕊️","pomba espirito paz"],["📖","biblia livro palavra"],
    ["🙏","oracao orar reza"],["🕯️","vela luz"],["👑","coroa realeza rei"],["😇","anjo santo"],
    ["📿","terco rosario oracao"],["🛐","adoracao culto"],["✨","brilho gloria"],["🔔","sino"],
  ]},
  { nome: "Amor & Aliança", itens: [
    ["💍","alianca aneis casamento noivado"],["💐","flores buque"],["🌹","rosa amor"],["❤️","coracao amor"],
    ["💌","carta amor bilhete"],["💒","casamento igreja noivos"],["👰","noiva"],["🤵","noivo"],
    ["🥂","brinde taca celebrar"],["💞","coracoes"],["🌷","tulipa flor"],["🎀","laco fita"],
  ]},
  { nome: "Pessoas & Caráter", itens: [
    ["🧑","pessoa"],["👨","homem"],["👩","mulher"],["👪","familia"],["🤝","aperto maos acordo confianca"],
    ["🧠","mente carater discernimento"],["💬","conversa fala"],["👀","olhos observar"],["🫂","abraco cuidado"],
    ["🦁","leao coragem forca"],["🌿","folha fruto carater"],["⚖️","balanca justica"],
  ]},
  { nome: "Vida & Gostos", itens: [
    ["🎵","musica nota"],["🎸","violao rock"],["🎤","microfone louvor"],["⚽","futebol esporte bola"],
    ["🏋️","academia treino forca"],["💼","trabalho emprego negocio"],["📚","livros estudo leitura"],
    ["🍽️","comida jantar"],["☕","cafe"],["🚗","carro"],["🏠","casa lar"],["💰","dinheiro financas"],
    ["✈️","viagem aviao"],["🎬","cinema filme"],["🌅","amanhecer futuro"],["🎯","alvo meta objetivo"],
  ]},
  { nome: "Símbolos", itens: [
    ["❦","floreio ornamento"],["◈","losango simbolo"],["✦","estrela simbolo"],["♛","rainha xadrez"],
    ["♟️","peao xadrez pretendente"],["⭐","estrela"],["🌟","estrela brilho"],["🔥","fogo paixao"],
    ["⚜️","flor de lis realeza"],["🏵️","roseta"],["🎖️","medalha"],["🏆","trofeu"],
  ]},
];
const TODOS = GRUPOS.flatMap((g) => g.itens);

export default function SeletorIcone({ value, onChange }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const q = busca.trim().toLowerCase();
  const filtrados = q ? TODOS.filter(([e, k]) => k.includes(q) || e === q) : null;

  function escolher(e) { onChange(e); setAberto(false); setBusca(""); }

  return (
    <div className="ic-wrap">
      <button type="button" className="ic-btn" onClick={() => setAberto((a) => !a)}>
        <span className="ic-cur">{value || "❦"}</span>
        <span className="ic-lbl">{value ? "trocar" : "escolher"}</span>
      </button>
      {aberto && (
        <div className="ic-pop">
          <input className="fld" placeholder="Buscar (ex.: igreja, coração, música)…" value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus />
          <div className="ic-scroll">
            {filtrados ? (
              <div className="ic-grid">
                {filtrados.map(([e]) => <button key={e} type="button" className="ic-cell" onClick={() => escolher(e)}>{e}</button>)}
                {filtrados.length === 0 && <p className="muted" style={{ padding: 10 }}>Nada encontrado.</p>}
              </div>
            ) : (
              GRUPOS.map((g) => (
                <div key={g.nome}>
                  <div className="ic-cat">{g.nome}</div>
                  <div className="ic-grid">
                    {g.itens.map(([e]) => <button key={e} type="button" className="ic-cell" onClick={() => escolher(e)}>{e}</button>)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
