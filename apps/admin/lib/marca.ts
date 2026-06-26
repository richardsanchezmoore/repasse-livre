// Heurística simples: o título de anúncio (próprio ou captado) sempre
// começa com a marca ("Honda Civic...", "Fiat Mobi...") — primeira palavra
// já resolve sem precisar de uma lista fixa de marcas pra manter.
export function extrairMarca(titulo: string): string | null {
  const primeiraPalavra = titulo.trim().split(/\s+/)[0];
  return primeiraPalavra || null;
}
