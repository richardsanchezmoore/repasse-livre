import municipios from "./data/municipiosBrasil.json" with { type: "json" };

interface Municipio {
  slug: string;
  uf: string;
  latitude: number;
  longitude: number;
}

export interface Coordenadas {
  latitude: number;
  longitude: number;
}

// Mesma normalização usada no painel admin (lib/slug.ts `slugify`) — não
// importável diretamente (apps separados), replicada aqui só pra casar a
// grafia da cidade capturada na OLX contra o nome oficial do IBGE.
function removerAcentos(texto: string): string {
  return texto
    .normalize("NFD")
    .split("")
    .filter((caractere) => {
      const codigo = caractere.charCodeAt(0);
      return codigo < 0x0300 || codigo > 0x036f;
    })
    .join("");
}

function slugify(texto: string): string {
  return removerAcentos(texto)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const indice = new Map<string, Coordenadas>();
for (const municipio of municipios as Municipio[]) {
  indice.set(`${municipio.slug}|${municipio.uf}`, { latitude: municipio.latitude, longitude: municipio.longitude });
}

/** Base de municípios do IBGE (5571 cidades, embutida em data/municipiosBrasil.json) — sem chamada externa. */
export function buscarCoordenadasCidade(cidade: string, estado: string): Coordenadas | null {
  return indice.get(`${slugify(cidade)}|${estado.toUpperCase()}`) ?? null;
}
