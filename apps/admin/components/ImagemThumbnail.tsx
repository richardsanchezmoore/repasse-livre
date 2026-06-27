"use client";

import { useEffect, useRef, useState } from "react";
import { urlThumbnailOlx } from "@/lib/imagemOlx";

/**
 * <img> com fallback pro tamanho original quando o thumbnail não existe
 * (fotos de inserção direta enviadas antes do upload passar a gerar o
 * `-thumb.webp` companheiro — ver app/api/fotos/route.ts). O `onError` por
 * si só não é suficiente: como a imagem já começa a carregar a partir do
 * HTML estático (SSR), ela pode falhar antes do React hidratar e conectar
 * o listener, perdendo o evento — por isso o useEffect confere de novo no
 * mount se a imagem já chegou quebrada (`naturalWidth === 0`).
 */
export function ImagemThumbnail({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const [src, setSrc] = useState(() => urlThumbnailOlx(url));
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setSrc(url);
    }
  }, [url]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setSrc(url)}
    />
  );
}
