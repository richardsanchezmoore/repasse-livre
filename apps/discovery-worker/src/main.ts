import "dotenv/config";
import {
  buscarDetalhesDaPaginaAnuncio,
  capturarAnunciosOlx,
  montarUrlPagina,
  resolverChaveFiltroFipe,
} from "./olxService.js";
import { calcularMargemPercentual, classificar, ehElegivel, MARGEM_MINIMA_PADRAO } from "./margin.js";
import { gerarSnapshotDiario } from "./snapshotDiario.js";
import {
  apagarOportunidadeDuplicada,
  avancarCheckpoint,
  buscarDuplicataPorTituloEKm,
  finalizarRegistroVarreduraComErro,
  finalizarRegistroVarreduraComSucesso,
  garantirCoordenadasCidade,
  iniciarRegistroVarredura,
  lerConfig,
  linkOrigemJaExiste,
  obterCheckpoint,
  salvarOportunidade,
} from "./supabaseClient.js";
import type { AnuncioOlx, Oportunidade } from "./types.js";

type ModoVarredura = "inicial" | "incremental" | "intervalo";

interface Config {
  categoriasUrlBase: string[];
  margemMinima: number;
  modo: ModoVarredura;
  janelaInicialDias: number;
  maxPaginas: number;
  janelaIntervaloInicio: Date | null;
  janelaIntervaloFim: Date | null;
}

let config: Config | undefined;

/**
 * Config do worker é editável pelo painel admin (tabela worker_config no
 * Supabase) — lida no início de cada execução, com fallback pro env var/
 * default de hoje quando a chave ainda não foi configurada pelo painel.
 * O processo é short-lived (uma execução por invocação do cron), então não
 * há necessidade de releitura durante a varredura.
 */
async function carregarConfig(): Promise<Config> {
  const olxCategoryUrl =
    (await lerConfig("OLX_CATEGORY_URL")) ??
    process.env.OLX_CATEGORY_URL ??
    "https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios/estado-rs";

  const modoBruto = (await lerConfig("MODO_VARREDURA")) ?? process.env.MODO_VARREDURA;
  const modo: ModoVarredura = modoBruto === "inicial" ? "inicial" : modoBruto === "intervalo" ? "intervalo" : "incremental";

  const janelaIntervaloInicioBruta = (await lerConfig("JANELA_INICIO")) ?? process.env.JANELA_INICIO;
  const janelaIntervaloFimBruta = (await lerConfig("JANELA_FIM")) ?? process.env.JANELA_FIM;

  return {
    categoriasUrlBase: olxCategoryUrl
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean),
    margemMinima: Number((await lerConfig("MARGEM_MINIMA_PERCENTUAL")) ?? process.env.MARGEM_MINIMA_PERCENTUAL ?? MARGEM_MINIMA_PADRAO),
    modo,
    janelaInicialDias: Number((await lerConfig("JANELA_INICIAL_DIAS")) ?? process.env.JANELA_INICIAL_DIAS ?? 30),
    maxPaginas: Number((await lerConfig("MAX_PAGINAS")) ?? process.env.MAX_PAGINAS ?? 50),
    janelaIntervaloInicio: janelaIntervaloInicioBruta ? new Date(janelaIntervaloInicioBruta) : null,
    janelaIntervaloFim: janelaIntervaloFimBruta ? new Date(janelaIntervaloFimBruta) : null,
  };
}

function obterConfig(): Config {
  if (!config) {
    throw new Error("Config ainda não carregada — carregarConfig() precisa rodar antes.");
  }
  return config;
}

interface ResultadoVarredura {
  novos: number;
  elegiveis: number;
  descartados: number;
  semFipe: number;
}

/**
 * O FIPE usado aqui vem direto da página individual do anúncio (a OLX já
 * calcula isso para cada veículo) — não da API externa de FIPE. Por isso
 * todo anúncio novo precisa de uma requisição extra para sua própria
 * página, não só os que pareceriam elegíveis por uma estimativa textual.
 */
async function processarAnuncio(
  anuncio: AnuncioOlx,
  resultado: ResultadoVarredura,
  margemMinima: number
): Promise<void> {
  if (await linkOrigemJaExiste(anuncio.linkOrigem)) {
    return; // já capturado antes (ex.: anúncio "renovado" pela OLX, reaparecendo no topo da listagem)
  }
  resultado.novos++;

  let detalhes;
  try {
    detalhes = await buscarDetalhesDaPaginaAnuncio(anuncio.linkOrigem);
  } catch (erro) {
    console.warn(`[motor-descoberta] Falha ao buscar FIPE na página de "${anuncio.titulo}":`, erro);
    resultado.semFipe++;
    return;
  }

  const { fipe, fotos, atributos, descricao, professionalAd } = detalhes;
  if (!fipe) {
    resultado.semFipe++;
    return;
  }

  // Preço 0 (ou negativo) é anúncio "sob consulta"/sem preço informado na
  // OLX, não uma oportunidade real — calcularMargemPercentual trataria isso
  // como 100% de margem (preço 0 vs. qualquer FIPE), inflando o anúncio pra
  // "top_oportunidade" indevidamente.
  if (anuncio.preco <= 0) {
    resultado.descartados++;
    return;
  }

  // Só substitui a foto principal e usa fotos secundárias quando a página
  // do anúncio realmente trouxe uma galeria (mais de 1 foto). Caso
  // contrário, mantém a foto de capa da listagem e nenhuma secundária —
  // não há link de mais fotos para mostrar, então não preenchemos o
  // slider com nada que possa quebrá-lo.
  const fotoPrincipal = fotos[0] ?? anuncio.fotoPrincipal;
  const fotosSecundarias = fotos.length > 1 ? fotos.slice(1) : [];

  const margemPercentual = calcularMargemPercentual(anuncio.preco, fipe.fipeValor);

  if (!ehElegivel(margemPercentual, margemMinima)) {
    resultado.descartados++;
    return;
  }

  const classificacao = classificar(margemPercentual);
  if (!classificacao) {
    resultado.descartados++;
    return;
  }

  const oportunidade: Oportunidade = {
    fonte: "OLX",
    link_origem: anuncio.linkOrigem,
    veiculo: anuncio.titulo,
    versao: anuncio.modelo,
    ano: anuncio.ano,
    cambio: anuncio.cambio,
    km: anuncio.km,
    cidade: anuncio.cidade,
    estado: anuncio.estado,
    preco: anuncio.preco,
    fipe_valor: fipe.fipeValor,
    fipe_data_referencia: fipe.mesReferencia,
    // OLX: FIPE vem da própria página do anúncio, sem codigo_fipe canônico.
    // O bootstrap/recálculo (via lookup na oficial) preenche depois, dando
    // histórico também aos anúncios OLX.
    fipe_codigo: null,
    margem_percentual: Number(margemPercentual.toFixed(2)),
    classificacao,
    foto_principal: fotoPrincipal,
    fotos_secundarias: fotosSecundarias,
    // A listagem (__NEXT_DATA__) não traz mais `description` por anúncio —
    // só a página individual tem o texto completo (ver olxService.ts).
    descricao: descricao ?? anuncio.descricao,
    origem_tipo: "descoberta",
    status: "descoberta",
    data_publicacao_origem:
      anuncio.dataPublicacao !== null ? new Date(anuncio.dataPublicacao * 1000).toISOString() : null,
    atributos_olx: atributos,
    // Página individual é a fonte mais confiável (ver extrairTipoAnuncianteDoHtml);
    // cai pro valor já presente na listagem só se a página não trouxer nada.
    anunciante_profissional: professionalAd ?? anuncio.professionalAd,
  };

  // Grandes frotistas (Localiza/Movida/Unidas etc.) deixam cada loja da rede
  // republicar o mesmo carro (mesmo título e KM). Sem KM não dá pra comparar
  // com segurança, então só dedupe quando o anúncio trouxe KM.
  if (anuncio.km !== null) {
    const duplicata = await buscarDuplicataPorTituloEKm(anuncio.titulo, anuncio.km);
    if (duplicata) {
      if (anuncio.preco >= duplicata.preco) {
        console.log(
          `[motor-descoberta] Duplicado de rede ("${anuncio.titulo}", ${anuncio.km}km) com preço >= já salvo (R$ ${duplicata.preco}) — descartado.`
        );
        resultado.descartados++;
        return;
      }
      console.log(
        `[motor-descoberta] Duplicado de rede mais barato ("${anuncio.titulo}", ${anuncio.km}km) — substituindo oferta anterior (id ${duplicata.id}, R$ ${duplicata.preco} → R$ ${anuncio.preco}).`
      );
      await apagarOportunidadeDuplicada(duplicata);
    }
  }

  await salvarOportunidade(oportunidade);
  resultado.elegiveis++;

  if (anuncio.cidade && anuncio.estado) {
    await garantirCoordenadasCidade(anuncio.cidade, anuncio.estado);
  }
}

/**
 * Varredura paginada da OLX, ordenada por data (mais recentes primeiro).
 *
 * - Modo "inicial": pagina até encontrar um anúncio mais antigo que
 *   JANELA_INICIAL_DIAS, populando a "prateleira" antes do primeiro envio.
 * - Modo "incremental" (execução recorrente, a cada 6h): pagina até a data
 *   de publicação cair no ou antes do checkpoint da varredura anterior
 *   (não mais "até achar um anúncio já salvo" — a OLX reposiciona no topo
 *   anúncios antigos "renovados" pelo anunciante, com data aparente recente;
 *   parar nesse ponto faria a varredura ignorar anúncios genuinamente novos
 *   posicionados abaixo dele). Anúncios já conhecidos pelo caminho são só
 *   pulados (o upsert por link_origem em salvarOportunidade já evita
 *   duplicar), não interrompem mais a varredura.
 */
async function executarVarredura(categoriaUrlBase: string): Promise<ResultadoVarredura> {
  const {
    modo: MODO,
    margemMinima: MARGEM_MINIMA,
    janelaInicialDias: JANELA_INICIAL_DIAS,
    maxPaginas: MAX_PAGINAS,
    janelaIntervaloInicio: JANELA_INICIO,
    janelaIntervaloFim: JANELA_FIM,
  } = obterConfig();
  const resultado: ResultadoVarredura = { novos: 0, elegiveis: 0, descartados: 0, semFipe: 0 };
  const cutoffEpoch = Math.floor(Date.now() / 1000) - JANELA_INICIAL_DIAS * 24 * 60 * 60;
  const checkpointAnteriorEpoch = MODO === "incremental" ? await obterCheckpoint(categoriaUrlBase) : null;
  let maiorDataVistaEpoch: number | null = null;
  // Contador de páginas consecutivas onde todos os anúncios já existem no banco.
  // OLX pode mudar a ordenação (ex.: filtro FIPE sobrepõe sf=1), então não
  // podemos parar na primeira data < checkpoint — esperamos 3 páginas "secas"
  // antes de concluir que não há mais anúncios novos.
  let paginasSemsNovos = 0;
  const MAX_PAGINAS_SECAS = 3;

  if (MODO === "intervalo" && (!JANELA_INICIO || !JANELA_FIM)) {
    throw new Error(
      "Modo 'intervalo' exige JANELA_INICIO e JANELA_FIM (datas ISO, ex.: 2026-06-18T00:00:00-03:00)."
    );
  }
  const intervaloInicioEpoch = JANELA_INICIO ? Math.floor(JANELA_INICIO.getTime() / 1000) : null;
  const intervaloFimEpoch = JANELA_FIM ? Math.floor(JANELA_FIM.getTime() / 1000) : null;

  const chaveFiltroFipe = await resolverChaveFiltroFipe(categoriaUrlBase);
  const urlComFiltro = new URL(categoriaUrlBase);
  urlComFiltro.searchParams.set(chaveFiltroFipe, "2");

  console.log(
    `[motor-descoberta] Modo: ${MODO} | Categoria: ${urlComFiltro.toString()} (filtro "abaixo da FIPE" via chave "${chaveFiltroFipe}")`
  );

  paginas: for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const url = montarUrlPagina(urlComFiltro.toString(), pagina);
    const anuncios = await capturarAnunciosOlx(url);

    if (anuncios.length === 0) {
      console.log(`[motor-descoberta] Página ${pagina} vazia, fim da listagem.`);
      break;
    }

    // Log de diagnóstico: data do primeiro e último anúncio da página
    const primData = anuncios[0]?.dataPublicacao;
    const ultData = anuncios[anuncios.length - 1]?.dataPublicacao;
    console.log(
      `[motor-descoberta] Página ${pagina}: ${anuncios.length} anúncios.` +
      ` Datas: ${primData ? new Date(primData * 1000).toISOString() : "null"} → ${ultData ? new Date(ultData * 1000).toISOString() : "null"}` +
      (checkpointAnteriorEpoch ? ` | checkpoint: ${new Date(checkpointAnteriorEpoch * 1000).toISOString()}` : "")
    );

    const novosAntesDestaPagina = resultado.novos;

    for (const anuncio of anuncios) {
      if (anuncio.dataPublicacao !== null && (maiorDataVistaEpoch === null || anuncio.dataPublicacao > maiorDataVistaEpoch)) {
        maiorDataVistaEpoch = anuncio.dataPublicacao;
      }

      if (MODO === "inicial" && anuncio.dataPublicacao !== null && anuncio.dataPublicacao < cutoffEpoch) {
        console.log(
          `[motor-descoberta] Anúncio fora da janela de ${JANELA_INICIAL_DIAS} dias, parando varredura inicial.`
        );
        break paginas;
      }

      if (MODO === "intervalo") {
        if (anuncio.dataPublicacao === null) {
          continue; // sem data, não dá pra saber se está na janela — pula sem parar a varredura
        }
        if (anuncio.dataPublicacao > intervaloFimEpoch!) {
          continue; // ainda mais novo que o fim da janela, segue procurando os mais antigos
        }
        if (anuncio.dataPublicacao < intervaloInicioEpoch!) {
          console.log(`[motor-descoberta] Anúncio anterior ao início da janela, parando varredura de intervalo.`);
          break paginas;
        }
      }

      await processarAnuncio(anuncio, resultado, MARGEM_MINIMA);
    }

    // Parada incremental robusta: em vez de parar no primeiro anúncio com data
    // <= checkpoint (frágil quando OLX muda a ordenação), esperamos 3 páginas
    // consecutivas sem nenhum anúncio novo. Isso tolera que o filtro FIPE da
    // OLX ordene por desconto em vez de data — novos aparecem em qualquer posição.
    if (MODO === "incremental" && resultado.novos === novosAntesDestaPagina) {
      paginasSemsNovos++;
      console.log(`[motor-descoberta] Página ${pagina} sem novos (${paginasSemsNovos}/${MAX_PAGINAS_SECAS} páginas secas).`);
      if (paginasSemsNovos >= MAX_PAGINAS_SECAS) {
        console.log(`[motor-descoberta] ${MAX_PAGINAS_SECAS} páginas consecutivas sem novos, parando varredura incremental.`);
        break paginas;
      }
    } else {
      paginasSemsNovos = 0;
    }
  }

  // Atualiza o checkpoint em "inicial" e "incremental" — qualquer varredura
  // recorrente (não "intervalo", que deliberadamente revisita uma janela
  // passada) precisa deixar marcado até onde chegou, senão a próxima
  // execução incremental não tem de onde partir e teria que reprocessar
  // tudo (ou, sem checkpoint nenhum, paginar sem critério de parada).
  if (MODO !== "intervalo" && maiorDataVistaEpoch !== null) {
    await avancarCheckpoint(categoriaUrlBase, maiorDataVistaEpoch);
  }

  console.log(
    `[motor-descoberta] Resultado (${categoriaUrlBase}): ${resultado.novos} novos | ${resultado.elegiveis} elegíveis salvos | ${resultado.descartados} descartados (margem < ${MARGEM_MINIMA}%) | ${resultado.semFipe} sem FIPE na página do anúncio.`
  );

  return resultado;
}

async function executarVarreduraComRegistro(categoriaUrlBase: string, modo: string): Promise<void> {
  const registroId = await iniciarRegistroVarredura(categoriaUrlBase, modo);
  try {
    const resultado = await executarVarredura(categoriaUrlBase);
    await finalizarRegistroVarreduraComSucesso(registroId, resultado);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    await finalizarRegistroVarreduraComErro(registroId, mensagem);
    throw erro;
  }
}

async function executarTodasCategorias(): Promise<void> {
  config = await carregarConfig();
  for (const categoriaUrlBase of config.categoriasUrlBase) {
    await executarVarreduraComRegistro(categoriaUrlBase, config.modo);
  }

  // Roda a cada cron, mas só faz o trabalho de fato na primeira execução do
  // dia (gerarSnapshotDiario já se protege checando se hoje já tem
  // snapshot) — não precisa de um segundo serviço/cron só pra isso. Falha
  // aqui não pode derrubar a varredura, que é o que importa de verdade.
  try {
    await gerarSnapshotDiario();
  } catch (erro) {
    console.warn("[motor-descoberta] Falha ao gerar snapshot diário:", erro);
  }
}

executarTodasCategorias().catch((erro) => {
  console.error("[motor-descoberta] Falha na execução:", erro);
  process.exitCode = 1;
});
