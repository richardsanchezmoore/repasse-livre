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
