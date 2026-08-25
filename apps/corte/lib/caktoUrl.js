// Client-safe (função pura, sem dependências) — extrai o offer id da URL de
// checkout da Cakto. Usada no servidor (offerIdAtivo) e no painel (exibição).
// Ex.: https://pay.cakto.com.br/33bnix4_1061873 → 33bnix4
//      https://pay.cakto.com.br/33bnix4         → 33bnix4
export function offerIdDaUrl(url) {
  if (!url) return "";
  try {
    const slug = String(url).split(/[?#]/)[0].replace(/\/+$/, "").split("/").pop() || "";
    return slug.split("_")[0].trim();
  } catch {
    return "";
  }
}
