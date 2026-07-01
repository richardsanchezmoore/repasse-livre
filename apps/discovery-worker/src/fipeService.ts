import type { ReferenciaFipe } from "./types.js";

// API oficial da FIPE (a mesma que veiculos.fipe.org.br consome). Substituiu o
// parallelum (fipe.parallelum.com.br), cujo plano free (1000 req/dia) dava 429
// e zerava a elegibilidade de ML/Webmotors. A oficial é a fonte de verdade,
// sempre no mês vigente (o mirror fipeX atrasava a virada do mês), sem limite
// aparente e ~0,1-0,4s por chamada. Estrutura idêntica (marcas→modelos→
// anos→valor), então o fuzzy-match abaixo continua igual. A OLX não usa isto
// (o FIPE dela vem da própria página do anúncio). Ver
// project_repasse_livre_fipe_banco_proprio.
const FIPE_BASE_URL = "https://veiculos.fipe.org.br/api/veiculos";
const CODIGO_TIPO_VEICULO_CARRO = 1;

interface FipeItem {
  code: string;
  name: string;
}

/** Item de ano/combustível: `code` no formato "2013-3" (ano-códigoCombustível), `name` = "2013 Diesel". */
type FipeAno = FipeItem;

interface FipeValorResposta {
  Valor: string; // "R$ 72.634,00"
  MesReferencia: string; // "julho de 2026 "
  CodigoFipe: string; // "005329-5"
  SiglaCombustivel: string; // "D" | "G" | "F" ...
}

const MESES_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "julho de 2026 " → { mes: 7, ano: 2026 }. */
function parseMesReferencia(texto: string): { mes: number; ano: number } {
  const t = normalizar(texto);
  const mes = MESES_PT.findIndex((m) => t.includes(normalizar(m))) + 1;
  const anoMatch = t.match(/\d{4}/);
  return { mes: mes || 0, ano: anoMatch ? Number(anoMatch[0]) : 0 };
}

const DIACRITICOS = /[̀-ͯ]/g;

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(DIACRITICOS, "").toLowerCase().trim();
}

function parsePrecoFipe(precoTexto: string): number {
  const numerico = precoTexto
    .replace("R$", "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  return Number.parseFloat(numerico);
}

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const HEADERS_FIPE = {
  "Content-Type": "application/json",
  Referer: "https://veiculos.fipe.org.br/",
  "User-Agent": "Mozilla/5.0",
};

// A FIPE oficial tem throttle por rajada (~4-5 req/s: medido, ~250ms limpo,
// ~150ms começa a dar 429). NÃO é o teto duro de 1000/dia do parallelum — é
// soft, se recupera com pausa. Serializamos TODAS as chamadas com um intervalo
// mínimo pra nunca estourar (300ms = folga sobre o limite).
const INTERVALO_MINIMO_MS = 450;
let ultimaChamadaEpoch = 0;
let filaThrottle: Promise<void> = Promise.resolve();

/** Garante espaçamento mínimo entre chamadas à FIPE, mesmo com concorrência. */
function aguardarVezNoThrottle(): Promise<void> {
  filaThrottle = filaThrottle.then(async () => {
    const espera = INTERVALO_MINIMO_MS - (Date.now() - ultimaChamadaEpoch);
    if (espera > 0) await aguardar(espera);
    ultimaChamadaEpoch = Date.now();
  });
  return filaThrottle;
}

/**
 * POST na API oficial da FIPE, com throttle (espaçamento mínimo) + retentativa
 * em 429/5xx com backoff (sob volume ela estrangula por rajada; pausar resolve).
 */
async function postFipe<T>(endpoint: string, corpo: Record<string, unknown>, tentativa = 1): Promise<T> {
  await aguardarVezNoThrottle();
  const resp = await fetch(`${FIPE_BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: HEADERS_FIPE,
    body: JSON.stringify(corpo),
  });

  if ((resp.status === 429 || resp.status >= 500) && tentativa <= 4) {
    await aguardar(800 * tentativa);
    return postFipe<T>(endpoint, corpo, tentativa + 1);
  }

  if (!resp.ok) {
    throw new Error(`Falha ao consultar FIPE (${resp.status}): ${endpoint}`);
  }
  return resp.json() as Promise<T>;
}

// A tabela de referência (mês), a lista de marcas e a de modelos por marca não
// mudam durante uma execução, então ficam em cache em memória.
let cacheTabelaReferencia: Promise<number> | null = null;
let cacheMarcas: Promise<FipeItem[]> | null = null;
const cacheModelosPorMarca = new Map<string, Promise<FipeItem[]>>();
const cacheAnosPorModelo = new Map<string, Promise<FipeAno[]>>();
const cacheValor = new Map<string, Promise<FipeValorResposta>>();

/** Código da tabela de referência mais recente (= mês vigente publicado pela FIPE). */
function resolverTabelaReferencia(): Promise<number> {
  if (!cacheTabelaReferencia) {
    cacheTabelaReferencia = (async () => {
      const tabelas = await postFipe<{ Codigo: number; Mes: string }[]>("ConsultarTabelaDeReferencia", {});
      const maisRecente = tabelas.reduce((a, b) => (b.Codigo > a.Codigo ? b : a));
      return maisRecente.Codigo;
    })();
  }
  return cacheTabelaReferencia;
}

async function buscarMarcas(): Promise<FipeItem[]> {
  if (!cacheMarcas) {
    cacheMarcas = (async () => {
      const ref = await resolverTabelaReferencia();
      const marcas = await postFipe<{ Label: string; Value: string }[]>("ConsultarMarcas", {
        codigoTabelaReferencia: ref,
        codigoTipoVeiculo: CODIGO_TIPO_VEICULO_CARRO,
      });
      return marcas.map((m) => ({ code: String(m.Value), name: m.Label }));
    })();
  }
  return cacheMarcas;
}

function buscarModelos(marcaCode: string): Promise<FipeItem[]> {
  let promessa = cacheModelosPorMarca.get(marcaCode);
  if (!promessa) {
    promessa = (async () => {
      const ref = await resolverTabelaReferencia();
      const resp = await postFipe<{ Modelos: { Label: string; Value: number | string }[] }>("ConsultarModelos", {
        codigoTabelaReferencia: ref,
        codigoTipoVeiculo: CODIGO_TIPO_VEICULO_CARRO,
        codigoMarca: marcaCode,
      });
      return resp.Modelos.map((m) => ({ code: String(m.Value), name: m.Label }));
    })();
    cacheModelosPorMarca.set(marcaCode, promessa);
  }
  return promessa;
}

function buscarAnos(marcaCode: string, modeloCode: string): Promise<FipeAno[]> {
  const chave = `${marcaCode}|${modeloCode}`;
  let promessa = cacheAnosPorModelo.get(chave);
  if (!promessa) {
    promessa = (async () => {
      const ref = await resolverTabelaReferencia();
      const anos = await postFipe<{ Label: string; Value: string }[]>("ConsultarAnoModelo", {
        codigoTabelaReferencia: ref,
        codigoTipoVeiculo: CODIGO_TIPO_VEICULO_CARRO,
        codigoMarca: marcaCode,
        codigoModelo: modeloCode,
      });
      return anos.map((a) => ({ code: String(a.Value), name: a.Label }));
    })();
    cacheAnosPorModelo.set(chave, promessa);
  }
  return promessa;
}

/** Valor de um (marca, modelo, ano-combustível) — cacheado por veículo idêntico. */
function buscarValor(marcaCode: string, modeloCode: string, anoCode: string): Promise<FipeValorResposta> {
  const chave = `${marcaCode}|${modeloCode}|${anoCode}`;
  let promessa = cacheValor.get(chave);
  if (!promessa) {
    promessa = (async () => {
      const [anoModelo, codigoTipoCombustivel] = anoCode.split("-");
      const ref = await resolverTabelaReferencia();
      return postFipe<FipeValorResposta>("ConsultarValorComTodosParametros", {
        codigoTabelaReferencia: ref,
        codigoTipoVeiculo: CODIGO_TIPO_VEICULO_CARRO,
        codigoMarca: marcaCode,
        codigoModelo: modeloCode,
        anoModelo,
        codigoTipoCombustivel,
        tipoVeiculo: "carro",
        tipoConsulta: "tradicional",
      });
    })();
    cacheValor.set(chave, promessa);
  }
  return promessa;
}

function tokenizar(texto: string): Set<string> {
  return new Set(normalizar(texto).split(/\s+/).filter((palavra) => palavra.length >= 2));
}

/**
 * Pontua por sobreposição de palavras (não exige substring exata), porque o
 * texto livre da OLX nem sempre usa os mesmos termos da FIPE — ex: a FIPE
 * cataloga a Evoque como "Range Rover Evoque", enquanto a OLX usa "Land
 * Rover Evoque" para o mesmo veículo.
 */
function encontrarMelhorCorrespondencia<T extends { name: string }>(
  itens: T[],
  textoBusca: string,
  pontuacaoMinima = 1
): T | null {
  const busca = normalizar(textoBusca);

  const exato = itens.find((item) => normalizar(item.name) === busca);
  if (exato) return exato;

  const tokensBusca = tokenizar(textoBusca);
  if (tokensBusca.size === 0) return null;

  let melhor: T | null = null;
  let melhorPontuacao = 0;

  for (const item of itens) {
    const tokensItem = tokenizar(item.name);
    let pontuacao = 0;
    for (const token of tokensItem) {
      if (tokensBusca.has(token)) pontuacao++;
    }
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhor = item;
    }
  }

  return melhorPontuacao >= pontuacaoMinima ? melhor : null;
}

function pontuarCandidatos<T extends { name: string }>(itens: T[], textoBusca: string): { item: T; pontuacao: number }[] {
  const tokensBusca = tokenizar(textoBusca);
  return itens
    .map((item) => {
      const tokensItem = tokenizar(item.name);
      let pontuacao = 0;
      for (const token of tokensItem) if (tokensBusca.has(token)) pontuacao++;
      return { item, pontuacao };
    })
    .sort((a, b) => b.pontuacao - a.pontuacao);
}

/**
 * O nome do modelo (ex.: "Q3") é "sagrado": todo token dele precisa
 * aparecer no nome do item da FIPE antes de qualquer pontuação por
 * variante. Sem essa restrição, uma variante/trim genérico (ex.: "Prestige
 * Plus") pode arrastar a busca pra outro modelo da mesma marca que também
 * tenha essa variante — ex.: "Q3 P. Plus 1.4 TFSI Flex/P.Plus S-tronic"
 * abrevia "Prestige" pra "P.", então sem esse filtro a palavra "Prestige"
 * escrita por extenso em "A3 Sedan Prestige Plus 1.4 TFSI Flex Tip" pontua
 * mais alto e rouba a correspondência do Q3 certo.
 *
 * Retorna os top-N candidatos por pontuação (não só o melhor): o "melhor
 * texto" pode ser o código FIPE errado pro ano procurado — ex.: a versão
 * abreviada certa ("Renegade Long. T270...") perde em pontuação pra uma
 * versão escrita por extenso ("Renegade Longitude T270...") que só existe
 * num motor/ano diferente (nesse caso, híbrido a partir de 2027). Quem
 * chama decide o desempate real, checando qual candidato tem o ano do
 * anúncio disponível.
 */
function candidatosOrdenadosModeloVariante<T extends { name: string }>(
  itens: T[],
  modelo: string,
  variante: string | null,
  pontuacaoMinima = 1,
  topN = 5
): T[] {
  const tokensModelo = tokenizar(modelo);
  const candidatos = itens.filter((item) => {
    const tokensItem = tokenizar(item.name);
    for (const token of tokensModelo) if (!tokensItem.has(token)) return false;
    return true;
  });

  const baseCandidatos = candidatos.length > 0 ? candidatos : itens;
  const busca = `${modelo} ${variante ?? ""}`.trim();

  const exato = baseCandidatos.find((item) => normalizar(item.name) === normalizar(busca));
  if (exato) return [exato];

  return pontuarCandidatos(baseCandidatos, busca)
    .filter((c) => c.pontuacao >= pontuacaoMinima)
    .slice(0, topN)
    .map((c) => c.item);
}

/**
 * Busca a referência FIPE mais próxima para marca/modelo/ano informados.
 * A correspondência é por aproximação textual (a OLX não usa os mesmos
 * nomes exatos da tabela FIPE), por isso pode não encontrar resultado.
 * `variante` é opcional — quando informada (ex.: motorização/trim vindos
 * separados do nome do modelo, como na Webmotors), ajuda a desambiguar
 * entre versões do mesmo modelo sem arriscar roubar a correspondência de
 * outro modelo da marca (ver candidatosOrdenadosModeloVariante).
 */
export async function buscarReferenciaFipe(
  marca: string,
  modelo: string,
  ano: string,
  variante: string | null = null
): Promise<ReferenciaFipe | null> {
  const marcas = await buscarMarcas();
  const marcaEncontrada = encontrarMelhorCorrespondencia(marcas, marca);
  if (!marcaEncontrada) return null;

  const modelos = await buscarModelos(marcaEncontrada.code);
  const candidatos = candidatosOrdenadosModeloVariante(modelos, modelo, variante, 2);
  if (candidatos.length === 0) return null;

  let modeloEncontrado: FipeItem | null = null;
  let anoEncontrado: FipeAno | null = null;
  for (const candidato of candidatos) {
    const anos = await buscarAnos(marcaEncontrada.code, candidato.code);
    // O Label do ano é tipo "2013 Diesel" — casa pelo prefixo do ano.
    const ref = anos.find((item) => item.name.startsWith(ano)) ?? anos.find((item) => item.name.includes(ano));
    if (ref) {
      modeloEncontrado = candidato;
      anoEncontrado = ref;
      break;
    }
  }
  if (!modeloEncontrado || !anoEncontrado) return null;

  const valor = await buscarValor(marcaEncontrada.code, modeloEncontrado.code, anoEncontrado.code);
  const { mes: mesRef, ano: anoRef } = parseMesReferencia(valor.MesReferencia);

  return {
    marca: marcaEncontrada.name,
    modelo: modeloEncontrado.name,
    ano: anoEncontrado.name,
    valor: parsePrecoFipe(valor.Valor),
    mesReferencia: valor.MesReferencia.trim(),
    codigoFipe: valor.CodigoFipe,
    anoModelo: Number.parseInt(anoEncontrado.name, 10),
    siglaCombustivel: (valor.SiglaCombustivel ?? "").toLowerCase(),
    mesReferenciaNum: mesRef,
    anoReferencia: anoRef,
  };
}
