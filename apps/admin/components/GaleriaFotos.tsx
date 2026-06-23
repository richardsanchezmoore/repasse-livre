"use client";

import { useRef, useState } from "react";

export function GaleriaFotos({ fotos, alt }: { fotos: string[]; alt: string }) {
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const trilhaRef = useRef<HTMLDivElement>(null);

  if (fotos.length === 0) {
    return <div className="galeria-foto-vazia" />;
  }

  function irPara(indice: number) {
    setIndiceAtivo(indice);
    trilhaRef.current?.children[indice]?.scrollIntoView({ behavior: "smooth", inline: "start" });
  }

  function aoRolar() {
    const trilha = trilhaRef.current;
    if (!trilha) return;
    const indice = Math.round(trilha.scrollLeft / trilha.clientWidth);
    if (indice !== indiceAtivo) setIndiceAtivo(indice);
  }

  return (
    <div className="galeria">
      <div className="galeria-trilha" ref={trilhaRef} onScroll={aoRolar}>
        {fotos.map((url, indice) => (
          <img key={url} src={url} alt={`${alt} — foto ${indice + 1}`} className="galeria-foto" referrerPolicy="no-referrer" />
        ))}
      </div>

      {fotos.length > 1 && (
        <>
          <div className="galeria-contador">
            {indiceAtivo + 1} / {fotos.length}
          </div>
          <div className="galeria-pontos">
            {fotos.map((url, indice) => (
              <button
                key={url}
                type="button"
                onClick={() => irPara(indice)}
                className={`galeria-ponto ${indice === indiceAtivo ? "galeria-ponto-ativo" : ""}`}
                aria-label={`Ver foto ${indice + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
