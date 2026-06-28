"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * <img> com spinner enquanto carrega e sem o ícone de "link quebrado" do
 * navegador em caso de falha (esconde a tag, mantém o fundo cinza do
 * wrapper). Crítico no mobile: a galeria carrega várias fotos de uma vez
 * (slider horizontal) e a rede pode ser lenta — sem isso, cada foto ainda
 * não carregada aparecia com o ícone padrão de imagem quebrada até a foto
 * finalmente chegar. `loading="lazy"` (default, exceto `prioridade`) evita
 * disparar todas as requisições de uma vez só, prioridade pra primeira foto
 * (a única visível antes de qualquer interação).
 *
 * O `useEffect` cobre a mesma race de hidratação já vista em
 * ImagemThumbnail: a foto pode começar (e terminar) de carregar a partir
 * do HTML estático (SSR) antes do React hidratar e conectar o `onLoad` —
 * sem essa checagem extra no mount, o spinner ficava preso pra sempre
 * mesmo com a foto já totalmente carregada por baixo (`complete: true`).
 */
export function ImagemComCarregamento({
  src,
  alt,
  className,
  prioridade = false,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  prioridade?: boolean;
  onClick?: (evento: React.MouseEvent<HTMLImageElement>) => void;
}) {
  const [carregada, setCarregada] = useState(false);
  const [comErro, setComErro] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return;
    if (img.naturalWidth > 0) {
      setCarregada(true);
    } else {
      setComErro(true);
    }
  }, [src]);

  return (
    <span className={`imagem-carregamento-wrapper ${className ?? ""}`}>
      {!carregada && !comErro && (
        <span className="imagem-carregamento-spinner" aria-hidden="true">
          <Loader2 size={20} strokeWidth={2} />
        </span>
      )}
      {!comErro && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          loading={prioridade ? "eager" : "lazy"}
          decoding="async"
          className={carregada ? "imagem-carregamento-visivel" : "imagem-carregamento-oculta"}
          onLoad={() => setCarregada(true)}
          onError={() => setComErro(true)}
          onClick={onClick}
        />
      )}
    </span>
  );
}
