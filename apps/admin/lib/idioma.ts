/**
 * ═══ IDIOMA — espanhol principal, português segundo ═══
 *
 * ★★ O PEDIDO (Gustavo, 10/10/2026): *"precisamos ter em espanhol como
 * principal e português como segunda opção... que pode ficar com 'bandeiras'
 * fixa no topbar para sempre o usuário visualizar com facilidade onde trocar
 * idioma"*.
 *
 * ★★★ A PERGUNTA QUE DECIDIU A ESTRUTURA — *"acho que não poderemos ter em i18n
 * pois a indexação não irá ocorrer certo?"*. A preocupação é certa mas mira o
 * alvo errado: existem DUAS coisas chamadas de i18n, e só uma delas mata o SEO.
 *
 *   ✗ TROCA NO CLIENTE (localStorage / estado React, mesma URL): o Google busca
 *     a página uma vez e vê UM idioma. O outro não existe para ele — não há URL
 *     para indexar, não há hreflang possível, e a página em espanhol e a em
 *     português competem pela mesma URL. É isto que "não indexa".
 *
 *   ✓ UMA URL POR IDIOMA, renderizada no servidor: `/` em espanhol e `/pt/` em
 *     português. Cada versão tem endereço próprio, entra no sitemap, e `hreflang`
 *     amarra as duas. É o que o Google documenta e é o que fazemos aqui.
 *
 * ★ ESPANHOL NA RAIZ, NÃO EM `/es`: o que já está indexado está na raiz. Jogar o
 * espanhol para `/es` obrigaria a redirecionar o site inteiro e recomeçar a
 * autoridade das URLs — custo alto para ganhar simetria de pasta, que o Google
 * não premia. Então raiz = espanhol (`x-default` também), e o português ganha o
 * prefixo.
 *
 * ⚠️⚠️ POR QUE PASTA `app/pt/` E NÃO HEADER NO MIDDLEWARE: a tentação é o
 * middleware reescrever `/pt/x` → `/x` passando o idioma num header, e o
 * componente ler com `headers()`. Isso FUNCIONA e é armadilha: `headers()` e
 * `searchParams` tornam a rota dinâmica, e já derrubamos este app exatamente
 * assim — o `not-found.tsx` chamava `cookies()` e dinamizou a aplicação inteira
 * (incidente de CPU/ISR, memória `project_repasse_livre_vercel_cpu_isr_not_found`).
 * Idioma vindo do CAMINHO é estático por idioma; idioma vindo de header não é.
 *
 * ⚠️ O PAINEL NÃO É TRADUZIDO. `(painel)` e `(pro)` são do Gustavo, ninguém mais
 * entra ali, e traduzir dobraria o trabalho de toda tela nova sem nenhum ganho.
 */

export type Idioma = "es" | "pt";

/** ★ Raiz = espanhol. Ver "ESPANHOL NA RAIZ" no topo. */
export const IDIOMA_PADRAO: Idioma = "es";

export const IDIOMAS: { codigo: Idioma; nome: string; bandeira: string; prefixo: string; htmlLang: string }[] = [
  // ★ Bandeira do PARAGUAI e não da Espanha: é a praça, e o Gustavo foi explícito
  // que *"o Paraguai é um país muito patriota"* ao escolher as cores do logo.
  { codigo: "es", nome: "Español", bandeira: "🇵🇾", prefixo: "", htmlLang: "es-PY" },
  { codigo: "pt", nome: "Português", bandeira: "🇧🇷", prefixo: "/pt", htmlLang: "pt-BR" },
];

export function dadosDoIdioma(idioma: Idioma) {
  return IDIOMAS.find((i) => i.codigo === idioma) ?? IDIOMAS[0];
}

/**
 * Qual idioma este caminho serve.
 *
 * ⚠️ `/pt` e `/pt/...` são português; `/ptbr` ou `/pterodatilo` NÃO são. O teste
 * do caractere seguinte existe por isso.
 */
export function idiomaDoCaminho(caminho: string | null | undefined): Idioma {
  const c = caminho ?? "";
  if (c === "/pt" || c.startsWith("/pt/")) return "pt";
  return "es";
}

/** O mesmo caminho no outro idioma — é o href das bandeiras. */
export function caminhoNoIdioma(caminho: string | null | undefined, idioma: Idioma): string {
  const c = caminho ?? "/";
  const semPrefixo = c === "/pt" ? "/" : c.startsWith("/pt/") ? c.slice(3) : c;
  if (idioma === "es") return semPrefixo || "/";
  return semPrefixo === "/" ? "/pt" : `/pt${semPrefixo}`;
}

/**
 * ★ O dicionário. `ES` é tipado como `typeof PT`, então esquecer de traduzir uma
 * chave é erro de compilação — não texto em português vazando no site paraguaio.
 */
const PT = {
  // ─── preço do anúncio ───
  moedaAnunciada: "Moeda do anúncio",
  em: "Em",
  cambioDe: "câmbio",
  cambioAviso: "referência do dia, não cotação de casa de câmbio",

  // ─── seletor de moeda ───
  escolherMoeda: "Escolher moeda",
  verTambemEm: "Ver também em",
  nenhumaMoedaExtra: "Nenhuma",
  avisoMoeda: "O destaque é sempre a moeda do anúncio. A conversão é referência do dia — para o peso, taxa oficial.",

  // ─── idioma ───
  trocarIdioma: "Trocar idioma",

  // ─── barra do topo ───
  buscarVeiculo: "Buscar veículo...",
  buscar: "Buscar",
  fecharBusca: "Fechar busca",
  todosEstados: "Todos os estados",
  estadoCurto: "UF",
  filtrarPorEstado: "Filtrar por estado",
  paginaInicial: "Ir para a página inicial",
  anunciar: "Anunciar",

  // ─── menu lateral ───
  explorar: "Explorar",
  inicio: "Início",
  oportunidades: "Oportunidades",
  minhaArea: "Minha área",
  favoritos: "Favoritos",
  entrar: "Login",
  criarConta: "Criar Conta",
  blog: "Blog",
  abrirMenu: "Abrir menu",
  fecharMenu: "Fechar menu",

  // ─── KPIs do topo ───
  ofertasMapeadas: "Ofertas mapeadas",
  ofertasAtivas: "Ofertas ativas",
  novos: "Novos",
  ultimas: "últimas",
  dias: "dias",
  kpiMapeadasAjuda: "anúncios varridos",
  kpiAtivasAjuda: "anúncios ativos na base",
  kpiNovosAjuda: "ofertas novas",

  // ─── listagem ───
  oportunidadesEm: "Oportunidades no",
  emPais: "no",
  nomePais: "Paraguai",
  resultados: "resultados",
  de: "de",
  ordenarPor: "Ordenar por",
  ordenar: "Ordenar",
  filtros: "Filtros",
  todas: "Todas",
  maisRecente: "Mais recente",
  menorValor: "Menor valor",
  maiorValor: "Maior valor",
  pertoDeMim: "Perto de mim",
  maiorMargem: "Maior margem",
  ofertasRotulo: "Ofertas",

  // ─── card ───
  via: "Via",
  compartilhar: "Compartilhar",
  hoje: "Hoje",
  hojeAs: "Hoje às",
  anunciadoEm: "Anunciado em",

  // ─── rodapé ───
  rodapeTagline: "Carros à venda no Paraguai, com preço de referência por modelo e ano.",
  navegar: "Navegar",
  legal: "Legal",
  termosDeUso: "Termos de Uso",
  privacidade: "Privacidade",
  exclusaoDeDados: "Exclusão de dados",
} as const;

const ES: { [K in keyof typeof PT]: string } = {
  moedaAnunciada: "Moneda del anuncio",
  em: "En",
  cambioDe: "cambio",
  cambioAviso: "referencia del día, no cotización de casa de cambio",

  escolherMoeda: "Elegir moneda",
  verTambemEm: "Ver también en",
  nenhumaMoedaExtra: "Ninguna",
  avisoMoeda: "El precio destacado es siempre en la moneda del anuncio. La conversión es referencia del día — para el peso, tasa oficial.",

  trocarIdioma: "Cambiar idioma",

  buscarVeiculo: "Buscar vehículo...",
  buscar: "Buscar",
  fecharBusca: "Cerrar búsqueda",
  // ★ Paraguai se divide em DEPARTAMENTOS, não em estados. "Todos los estados"
  // é tradução ao pé da letra de quem nunca esteve lá — entrega o site na hora.
  todosEstados: "Todos los departamentos",
  // ⚠️ "UF" é "Unidade Federativa", sigla BRASILEIRA. No Paraguai é departamento.
  estadoCurto: "Dpto.",
  filtrarPorEstado: "Filtrar por departamento",
  paginaInicial: "Ir a la página principal",
  anunciar: "Publicar",

  explorar: "Explorar",
  inicio: "Inicio",
  oportunidades: "Oportunidades",
  minhaArea: "Mi cuenta",
  favoritos: "Favoritos",
  entrar: "Ingresar",
  criarConta: "Crear cuenta",
  blog: "Blog",
  abrirMenu: "Abrir menú",
  fecharMenu: "Cerrar menú",

  ofertasMapeadas: "Anuncios relevados",
  ofertasAtivas: "Anuncios activos",
  novos: "Nuevos",
  ultimas: "últimas",
  dias: "días",
  kpiMapeadasAjuda: "anuncios recorridos",
  kpiAtivasAjuda: "anuncios activos en la base",
  kpiNovosAjuda: "anuncios nuevos",

  oportunidadesEm: "Oportunidades en",
  emPais: "en",
  nomePais: "Paraguay",
  resultados: "resultados",
  de: "de",
  ordenarPor: "Ordenar por",
  ordenar: "Ordenar",
  filtros: "Filtros",
  todas: "Todas",
  maisRecente: "Más reciente",
  menorValor: "Menor precio",
  maiorValor: "Mayor precio",
  pertoDeMim: "Cerca mío",
  maiorMargem: "Mayor margen",
  ofertasRotulo: "Anuncios",

  via: "Vía",
  compartilhar: "Compartir",
  hoje: "Hoy",
  hojeAs: "Hoy a las",
  anunciadoEm: "Publicado el",

  rodapeTagline: "Autos a la venta en Paraguay, con precio de referencia por modelo y año.",
  navegar: "Navegar",
  legal: "Legal",
  termosDeUso: "Términos de Uso",
  privacidade: "Privacidad",
  exclusaoDeDados: "Eliminación de datos",
};

const TEXTOS: Record<Idioma, { [K in keyof typeof PT]: string }> = { es: ES, pt: PT };

export type ChaveTexto = keyof typeof PT;

/** `t(idioma)` devolve a função de tradução daquele idioma. */
export function t(idioma: Idioma) {
  const d = TEXTOS[idioma] ?? ES;
  return (chave: ChaveTexto): string => d[chave];
}
