// Heurística simples: o título de anúncio (próprio ou captado) sempre
// começa com a marca ("Honda Civic...", "Fiat Mobi...") — primeira palavra
// já resolve sem precisar de uma lista fixa de marcas pra manter.
export function extrairMarca(titulo: string): string | null {
  const primeiraPalavra = titulo.trim().split(/\s+/)[0];
  return primeiraPalavra || null;
}

// Mesma heurística, estendida pra segunda palavra (modelo) — usado pra achar
// "ofertas relacionadas" pelo par marca+modelo (ver OfertasRelacionadas.tsx),
// chave mais específica do que só a marca.
export function extrairMarcaModelo(titulo: string): { marca: string; modelo: string } | null {
  const [marca, modelo] = titulo.trim().split(/\s+/);
  if (!marca || !modelo) return null;
  return { marca, modelo };
}

// Marcas de 2 palavras — a extração do modelo (2º termo) é ambígua nelas
// ("Land Rover Range Rover"), então ficam FORA do v1 da página de modelo.
const MARCAS_COMPOSTAS = ["Land Rover", "Alfa Romeo", "Aston Martin", "Great Wall"];

// Prefixos que formam modelo de 2 palavras (o 1-palavra os truncaria):
// "Grand Siena/Cherokee/C4". (Range só existe em Land Rover, que está fora do v1.)
const PREFIXOS_MODELO_COMPOSTO = ["grand", "gran"];

function ehTokenTecnico(token: string): boolean {
  // ano (19xx/20xx), motor (1.0/2.0) ou cilindrada (16v) marcam o fim do modelo.
  return /^(19|20)\d{2}$/.test(token) || /^\d\.\d/.test(token) || /^\d{1,2}v$/i.test(token);
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extrai o MODELO do título (ex.: "Chevrolet Onix 2020 1.0 LT" → "Onix"), pra
 * a página SEO de modelo. Heurística validada contra dados reais (~99% limpo na
 * amostra): remove a marca (1ª palavra) e pega a 1ª palavra útil (para no 1º token
 * técnico — ano/motor), +2 palavras nos prefixos compostos (Grand). Marcas de 2
 * palavras (Land Rover...) → null (fora do v1). A CAIXA canônica NÃO sai daqui —
 * vem da grafia mais frequente nos dados (ver buscarModeloPorSlug), igual à marca.
 * Ver project_repasse_livre_seo_pagina_modelo.
 */
export function extrairModeloSeo(veiculo: string): string | null {
  const v = (veiculo ?? "").trim();
  if (!v) return null;
  if (MARCAS_COMPOSTAS.some((m) => v.toLowerCase().startsWith(m.toLowerCase()))) return null;
  const marca = v.split(/\s+/)[0] ?? "";
  const resto = v.replace(new RegExp(`^${escaparRegex(marca)}\\s+`, "i"), "");
  const tokens = resto.split(/\s+/).filter((t) => t && !ehTokenTecnico(t));
  if (tokens.length === 0) return null;
  const nPalavras = PREFIXOS_MODELO_COMPOSTO.includes(tokens[0].toLowerCase()) ? 2 : 1;
  return tokens.slice(0, nPalavras).join(" ") || null;
}
