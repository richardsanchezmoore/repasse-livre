"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function GaleriaFotos({ fotos, alt }: { fotos: string[]; alt: string }) {
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const [visualizadorAberto, setVisualizadorAberto] = useState(false);
  const trilhaRef = useRef<HTMLDivElement>(null);

  const irPara = useCallback((indice: number) => {
    const destino = (indice + fotos.length) % fotos.length;
    setIndiceAtivo(destino);
    trilhaRef.current?.children[destino]?.scrollIntoView({ behavior: "smooth", inline: "start" });
  }, [fotos.length]);

  useEffect(() => {
    if (!visualizadorAberto) return;
    function aoApertarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setVisualizadorAberto(false);
      if (evento.key === "ArrowLeft") irPara(indiceAtivo - 1);
      if (evento.key === "ArrowRight") irPara(indiceAtivo + 1);
    }
    window.addEventListener("keydown", aoApertarTecla);
    return () => window.removeEventListener("keydown", aoApertarTecla);
  }, [visualizadorAberto, indiceAtivo, irPara]);

  if (fotos.length === 0) {
    return <div className="galeria-foto-vazia" />;
  }

  function aoRolar() {
    const trilha = trilhaRef.current;
    if (!trilha) return;
    const indice = Math.round(trilha.scrollLeft / trilha.clientWidth);
    if (indice !== indiceAtivo) setIndiceAtivo(indice);
  }

  function abrirEm(indice: number) {
    setIndiceAtivo(indice);
    setVisualizadorAberto(true);
  }

  const MINIATURAS_NO_MOSAICO = 4;
  const miniaturas = fotos.slice(1, 1 + MINIATURAS_NO_MOSAICO);
  const restantes = fotos.length - 1 - MINIATURAS_NO_MOSAICO;

  return (
    <>
      {/* Slider com arraste por toque — único modelo abaixo de 768px. */}
      <div className="galeria galeria-mobile">
        <div className="galeria-trilha" ref={trilhaRef} onScroll={aoRolar}>
          {fotos.map((url, indice) => (
            <img
              key={url}
              src={url}
              alt={`${alt} — foto ${indice + 1}`}
              className="galeria-foto"
              referrerPolicy="no-referrer"
              onClick={() => setVisualizadorAberto(true)}
            />
          ))}
        </div>

        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => irPara(indiceAtivo - 1)}
              className="galeria-seta galeria-seta-anterior"
              aria-label="Foto anterior"
            >
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => irPara(indiceAtivo + 1)}
              className="galeria-seta galeria-seta-proxima"
              aria-label="Próxima foto"
            >
              <ChevronRight size={22} strokeWidth={2.5} />
            </button>

            <div className="galeria-contador">
              {indiceAtivo + 1} / {fotos.length}
            </div>
            <div className="galeria-pontos">
              {fotos.map((url, indice) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => irPara(indice)}
                  className="galeria-ponto-area"
                  aria-label={`Ver foto ${indice + 1}`}
                >
                  <span className={`galeria-ponto ${indice === indiceAtivo ? "galeria-ponto-ativo" : ""}`} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mosaico (foto principal + grade de miniaturas) — só a partir de
          768px. A foto única em pé (4:3) esticada virava uma faixa alta e
          estreita no desktop; o mosaico usa a largura inteira do container
          numa faixa baixa e larga, como no modelo de referência da OLX. */}
      <div className="galeria-mosaico">
        <button
          type="button"
          className={`galeria-mosaico-principal ${miniaturas.length === 0 ? "galeria-mosaico-principal-unica" : ""}`}
          onClick={() => abrirEm(0)}
          aria-label="Ver foto 1 em tela cheia"
        >
          <img src={fotos[0]} alt={`${alt} — foto 1`} referrerPolicy="no-referrer" />
        </button>

        {miniaturas.length > 0 && (
          <div className="galeria-mosaico-grade">
            {miniaturas.map((url, i) => {
              const indiceReal = i + 1;
              const ehUltima = i === miniaturas.length - 1 && restantes > 0;
              return (
                <button
                  key={url}
                  type="button"
                  className="galeria-mosaico-thumb"
                  onClick={() => abrirEm(indiceReal)}
                  aria-label={`Ver foto ${indiceReal + 1} em tela cheia`}
                >
                  <img src={url} alt={`${alt} — foto ${indiceReal + 1}`} referrerPolicy="no-referrer" />
                  {ehUltima && <span className="galeria-mosaico-mais">+{restantes}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {visualizadorAberto && (
        <div className="visualizador-fotos" onClick={() => setVisualizadorAberto(false)}>
          <button
            type="button"
            className="visualizador-fotos-fechar"
            onClick={() => setVisualizadorAberto(false)}
            aria-label="Fechar"
          >
            <X size={24} strokeWidth={2.5} />
          </button>

          <img
            src={fotos[indiceAtivo]}
            alt={`${alt} — foto ${indiceAtivo + 1}`}
            className="visualizador-fotos-imagem"
            referrerPolicy="no-referrer"
            onClick={(evento) => evento.stopPropagation()}
          />

          {fotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(evento) => {
                  evento.stopPropagation();
                  irPara(indiceAtivo - 1);
                }}
                className="visualizador-fotos-seta visualizador-fotos-seta-anterior"
                aria-label="Foto anterior"
              >
                <ChevronLeft size={28} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={(evento) => {
                  evento.stopPropagation();
                  irPara(indiceAtivo + 1);
                }}
                className="visualizador-fotos-seta visualizador-fotos-seta-proxima"
                aria-label="Próxima foto"
              >
                <ChevronRight size={28} strokeWidth={2.5} />
              </button>
              <div className="visualizador-fotos-contador">
                {indiceAtivo + 1} / {fotos.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
