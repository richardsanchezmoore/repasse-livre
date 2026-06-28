"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { urlThumbnailOlx } from "@/lib/imagemOlx";

/**
 * <img> com fallback pro tamanho original quando o thumbnail não existe
 * (fotos de inserção direta enviadas antes do upload passar a gerar o
 * `-thumb.webp` companheiro — ver app/api/fotos/route.ts). O `onError` por
 * si só não é suficiente: como a imagem já começa a carregar a partir do
 * HTML estático (SSR), ela pode falhar antes do React hidratar e conectar
 * o listener, perdendo o evento — por isso o useEffect confere de novo no
 * mount se a imagem já chegou quebrada (`naturalWidth === 0`).
 *
 * Também mostra um spinner enquanto a foto carrega (em vez do ícone de
 * link quebrado do navegador, visível por um instante em rede lenta no
 * mobile) — mesmo princípio do ImagemComCarregamento, mas combinado com a
 * troca de `src` no fallback acima.
 */
export function ImagemThumbnail({
  url,
  alt,
  className,
  prioridade = false,
  onClick,
}: {
  url: string;
  alt: string;
  className?: string;
  prioridade?: boolean;
  onClick?: (evento: React.MouseEvent<HTMLImageElement>) => void;
}) {
  const [src, setSrc] = useState(() => urlThumbnailOlx(url));
  const [carregada, setCarregada] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return;
    if (img.naturalWidth === 0) {
      setSrc(url);
    } else {
      // Mesma race: a foto pode já estar carregada (de verdade) antes do
      // React conectar o onLoad — sem isso o spinner ficava preso pra
      // sempre com a imagem por baixo já pronta.
      setCarregada(true);
    }
  }, [url]);

  return (
    <span className={`imagem-carregamento-wrapper ${className ?? ""}`}>
      {!carregada && (
        <span className="imagem-carregamento-spinner" aria-hidden="true">
          <Loader2 size={20} strokeWidth={2} />
        </span>
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading={prioridade ? "eager" : "lazy"}
        decoding="async"
        className={carregada ? "imagem-carregamento-visivel" : "imagem-carregamento-oculta"}
        onLoad={() => setCarregada(true)}
        onError={() => setSrc(url)}
        onClick={onClick}
      />
    </span>
  );
}
