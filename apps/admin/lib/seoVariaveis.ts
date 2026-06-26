// Parte client-safe de lib/seo.ts — sem nenhum import de supabase. Componentes
// "use client" (ex.: PainelSeo.tsx) devem importar daqui, nunca de "@/lib/seo"
// direto, senão o bundler arrasta o cliente Supabase (com a service key) pro
// navegador e ele quebra: SUPABASE_URL não é uma env var pública, então some
// no bundle do cliente e o módulo lança erro ao avaliar.

export interface ConfigSeoPagina {
  chave: string;
  titulo: string | null;
  descricao: string | null;
}

// Páginas-âncora com SEO editável no painel /seo — cada uma é um modelo
// (não uma página fixa), usado com as variáveis abaixo substituídas em
// runtime (ver substituirVariaveisSeo). Estender esta lista (e o rótulo em
// PainelSeo.tsx) é o suficiente pra cobrir uma nova página — não precisa de
// migration nova, a tabela é chave/valor.
export const CHAVES_SEO_PAGINAS = ["home", "cidade", "estado", "marca", "produto"] as const;
export type ChaveSeoPagina = (typeof CHAVES_SEO_PAGINAS)[number];

// Mapa de variáveis disponíveis pros templates do painel /seo — cada página
// só recebe as que fazem sentido pra ela (ver `variaveis` montado em cada
// generateMetadata). Mantido aqui como referência única, exibido também no
// painel (PainelSeo.tsx).
export const VARIAVEIS_SEO: Array<{ nome: string; descricao: string }> = [
  { nome: "title_ad", descricao: "Título do anúncio (página Individual)" },
  { nome: "description_ad", descricao: "Descrição calculada do anúncio — margem e local (página Individual)" },
  { nome: "tag", descricao: "Marca (página de Marca e Individual)" },
  { nome: "tags", descricao: "As 3 marcas mais frequentes no recorte (página de Cidade e Estado)" },
  { nome: "estado", descricao: "Nome do estado (página de Estado)" },
  { nome: "cidade", descricao: "Cidade + estado (página de Cidade)" },
];

export function substituirVariaveisSeo(texto: string, variaveis: Record<string, string>): string {
  // Ordena do nome mais longo pro mais curto antes de substituir — sem
  // isso, "$tag" é substituído antes de "$tags" ser reconhecido (já que
  // "$tag" é prefixo de "$tags"), corrompendo o resultado.
  const entradasOrdenadas = Object.entries(variaveis).sort((a, b) => b[0].length - a[0].length);
  return entradasOrdenadas.reduce((resultado, [nome, valor]) => resultado.replaceAll(`$${nome}`, valor), texto);
}
