"use client";

/** Comprime a imagem no aparelho (redimensiona + WebP) antes de subir — upload leve
 *  e barato, essencial pro freemium. Retorna um Blob WebP. */
export async function comprimirImagem(file, max = 1280, qualidade = 0.72) {
  const img = await new Promise((res, rej) => {
    const el = new Image();
    el.onload = () => res(el);
    el.onerror = rej;
    el.src = URL.createObjectURL(file);
  });
  const escala = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * escala));
  const h = Math.max(1, Math.round(img.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", qualidade));
  return blob || file;
}
