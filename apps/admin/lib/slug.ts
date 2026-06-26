import { NOME_POR_UF } from "./estados";
import type { Oportunidade } from "./types";

type DadosSlug = Pick<Oportunidade, "id" | "veiculo" | "versao" | "ano" | "origem_tipo">;
type DadosSlugCidade = Pick<Oportunidade, "cidade" | "estado">;

// Remove os acentos decompondo (NFD) e descartando os marcadores
// combinantes (faixa Unicode 0x0300–0x036f) por código de caractere — evita
// embutir esses caracteres combinantes direto no código-fonte.
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

export function slugify(texto: string): string {
  return removerAcentos(texto)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SEM_LOCALIZACAO = "sem-localizacao";

// Segmento de path /carros/{cidadeUf}/ — cidade vai num path próprio
// (não mais embutida no slug do produto) pra virar categoria indexável,
// com SEO/h1 dedicados por cidade.
export function gerarSlugCidade(oportunidade: DadosSlugCidade): string {
  if (!oportunidade.cidade || !oportunidade.estado) return SEM_LOCALIZACAO;
  return `${slugify(oportunidade.cidade)}-${oportunidade.estado.toLowerCase()}`;
}

// Segmento de path /carros/{estadoSlug}/ — página de estado (sem cidade),
// usa o nome completo (ex.: "pernambuco") em vez da sigla, palavra-chave
// mais forte pra SEO do que duas letras.
export function gerarSlugEstado(estado: string): string {
  return slugify(NOME_POR_UF[estado] ?? estado);
}

const REGEX_UF_NO_FIM = /-([a-z]{2})$/i;

// Reverte um slug "/carros/{cidadeUf}" pro par (cidadeSlug, estado) —
// a UF (2 letras) sempre vem no final, então só falta casar o restante
// contra o `cidade` real de algum registro (ver buscarCidadePorSlug).
export function dividirSlugCidade(cidadeUf: string): { cidadeSlug: string; estado: string } | null {
  const match = cidadeUf.match(REGEX_UF_NO_FIM);
  if (!match || typeof match.index !== "number") return null;
  return { cidadeSlug: cidadeUf.slice(0, match.index), estado: match[1].toUpperCase() };
}

// O id completo vai no final do slug (mesmo padrão que a própria OLX usa —
// ver exemplos de link_origem captados, slug descritivo + id numérico no
// fim). Garante unicidade total sem precisar de coluna/índice extra, e
// permite extrair o id de volta só com regex. Cidade/estado não entram mais
// aqui — já viram o segmento de path anterior (/carros/{cidadeUf}/).
export function gerarSlugOportunidade(oportunidade: DadosSlug): string {
  const titulo =
    oportunidade.origem_tipo === "insercao_direta" && oportunidade.versao
      ? oportunidade.versao
      : oportunidade.veiculo;

  // Título de anúncio captado já costuma trazer o ano embutido (ex.: "Civic
  // SI 2015") — só acrescenta o campo `ano` de novo se ele não aparecer.
  const anoJaNoTitulo = Boolean(oportunidade.ano) && titulo.includes(oportunidade.ano as string);
  const partes = [titulo, anoJaNoTitulo ? null : oportunidade.ano].filter(
    (parte): parte is string => Boolean(parte)
  );

  const base = slugify(partes.join(" "));
  return base ? `${base}-${oportunidade.id}` : oportunidade.id;
}

const REGEX_UUID_NO_FIM = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

// Aceita tanto o slug novo ("honda-civic-si-2015-<uuid>") quanto um link
// antigo que era só o uuid puro, ou o slug com geo embutida criado mais
// cedo hoje — o redirect 301/308 pra forma canônica fica a cargo de quem
// chama esta função.
export function extrairIdDaSlug(slug: string): string | null {
  const match = slug.match(REGEX_UUID_NO_FIM);
  return match ? match[1] : null;
}
