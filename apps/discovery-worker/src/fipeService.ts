import { ProxyAgent } from "undici";
import { supabase } from "./supabaseClient.js";
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

/**
 * Marcas da FIPE com DUAS palavras. O split ingênuo (marca = 1ª palavra,
 * modelo = 2ª) quebra nelas: "Land Rover Discovery Sport…" virava marca="Land",
 * modelo="Rover" — e "Rover" casa "Range Rover", NUNCA "Discovery". Reconhecê-las
 * primeiro conserta a classe inteira (Land Rover, Alfa Romeo, Aston Martin…).
 */
const MARCAS_COMPOSTAS = ["Land Rover", "Alfa Romeo", "Aston Martin", "Great Wall"];

/**
 * Extrai (marca, modelo) do texto livre do veículo. Reconhece as marcas
 * compostas; o resto cai no split simples por espaço. Retorna só o 1º token do
 * modelo — a variante + a âncora de valor desempatam o trim (ex.: "Discovery" vs
 * "Discovery Sport": ambos entram como candidatos, o valor escolhe).
 */
export function separarMarcaModelo(veiculo: string): { marca: string; modelo: string } {
  const norm = normalizar(veiculo.trim());
  for (const marca of MARCAS_COMPOSTAS) {
    if (norm.startsWith(normalizar(marca) + " ")) {
      const nPalavras = marca.split(/\s+/).length; // conta tokens (imune a acento)
      const modelo = veiculo.trim().split(/\s+/).slice(nPalavras)[0] ?? "";
      return { marca, modelo };
    }
  }
  const partes = veiculo.trim().split(/\s+/);
  return { marca: partes[0] ?? "", modelo: partes[1] ?? "" };
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

/**
 * Classe de combustível de um texto (nome do trim / label de ano da FIPE). Serve
 * pra NÃO cruzar Diesel com Flex/Gasolina na resolução — o erro que fez um Jeep
 * Commander 1.3 Flex casar o código do Commander 2.2 Diesel (R$30k a mais) só
 * porque o valor do diesel ficou mais perto do tooltip do ML. "leve" agrupa
 * flex/gasolina/álcool (a FIPE às vezes rotula flex como "Gasolina") — só o
 * diesel (e elétrico/híbrido) é que separa de verdade.
 */
function classeCombustivel(texto: string): "diesel" | "eletrico" | "leve" | null {
  const t = normalizar(texto);
  if (/\bdiesel\b|\btdi?\b|\bbtdi\b|\bcrd\b|\bhdi\b|\bdci\b/.test(t)) return "diesel";
  if (/eletric|\bev\b|hibrid|plug/.test(t)) return "eletrico";
  if (/flex|gasolina|alcool|etanol|\bgnv\b/.test(t)) return "leve";
  return null;
}

/**
 * Cilindrada (motor) de um texto — "1.3", "2.0", "2.2". Discriminador DURO: um
 * "1.3 Overland" não pode casar um "2.0 Black Hurricane" nem um "2.2 Diesel" (foi
 * o que sobrou depois do guard de combustível: o tooltip errado do ML puxava pro
 * trim 2.0 caro). Só o número X.Y (evita pegar "T270", "4x4", anos).
 */
function cilindrada(texto: string): string | null {
  const m = normalizar(texto).match(/(?:^|\s)(\d[.,]\d)(?:\s|$|v|t|l|\b)/);
  return m ? m[1].replace(",", ".") : null;
}

const HEADERS_FIPE = {
  "Content-Type": "application/json",
  Referer: "https://veiculos.fipe.org.br/",
  "User-Agent": "Mozilla/5.0",
};

// A FIPE oficial 403a em IP de datacenter (Railway) — não é rate-limit (o do
// parallelum era), é bloqueio por IP: 403 já na 1ª chamada, e responde 200 do
// residencial. Quando há PROXY_URL (Thordata residencial), roteamos as chamadas
// por ele. Com o local-first (fipe_historico), só os modelos FORA da base
// chegam até aqui, então é pouco tráfego (JSON leve, GB irrisório). Sem
// PROXY_URL (rodando local/residencial), vai direto.
const dispatcherFipe = process.env.PROXY_URL ? new ProxyAgent(process.env.PROXY_URL) : undefined;

// A FIPE oficial tem throttle por rajada (~4-5 req/s: medido, ~250ms limpo,
// ~150ms começa a dar 429). NÃO é o teto duro de 1000/dia do parallelum — é
// soft, se recupera com pausa. Serializamos TODAS as chamadas com um intervalo
// mínimo pra nunca estourar (300ms = folga sobre o limite). Configurável via
// FIPE_INTERVALO_MS: o job local/cron pode afrouxar (ex.: 900ms) sem correria,
// já que ninguém espera o resultado; a captação segue no padrão. O mesmo
// throttle serializa Parallelum + oficial (compartilham a fila).
const INTERVALO_MINIMO_MS = Number(process.env.FIPE_INTERVALO_MS) || 450;
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
  const opcoes: RequestInit & { dispatcher?: ProxyAgent } = {
    method: "POST",
    headers: HEADERS_FIPE,
    body: JSON.stringify(corpo),
  };
  if (dispatcherFipe) opcoes.dispatcher = dispatcherFipe;

  let resp: Response;
  try {
    resp = await fetch(`${FIPE_BASE_URL}/${endpoint}`, opcoes);
  } catch (erro) {
    // "fetch failed" = erro de REDE (o proxy Thordata pisca, TLS, conexão). O
    // fetch ESTOURA sem status, então o retry por status abaixo não pega. Re-tenta
    // com backoff, igual ao 429/5xx (foi o que deixava alguns modelos sem FIPE no ML).
    if (tentativa <= 4) {
      await aguardar(800 * tentativa);
      return postFipe<T>(endpoint, corpo, tentativa + 1);
    }
    throw erro;
  }

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
    })().catch((erro) => {
      // NÃO perpetuar falha transitória: um único 429/blip nessa chamada-raiz
      // envenenaria o cache e faria TODOS os buscarReferenciaFipe do run cair em
      // sem_fipe (foi o que zerou o run Webmotors de 02/07: 328/328 sem FIPE).
      // Limpando o slot, o próximo veículo re-tenta e o run se recupera sozinho.
      cacheTabelaReferencia = null;
      throw erro;
    });
  }
  return cacheTabelaReferencia;
}

// Os DOIS meses mais recentes (vigente + anterior). A âncora de valor da OLX
// precisa dos dois: a OLX atrasa a virada do mês alguns dias, então um anúncio
// captado no começo do mês ainda mostra o FIPE do mês ANTERIOR (confirmado:
// anúncio publicado em 02/07 exibindo o FIPE de junho). Ver
// project_repasse_livre_fipe_ancora_valor_olx. Mesmo tratamento de cache/rejeição.
let cacheTabelasRecentes: Promise<number[]> | null = null;
function resolverTabelasRecentes(): Promise<number[]> {
  if (!cacheTabelasRecentes) {
    cacheTabelasRecentes = (async () => {
      const tabelas = await postFipe<{ Codigo: number; Mes: string }[]>("ConsultarTabelaDeReferencia", {});
      return tabelas.map((t) => t.Codigo).sort((a, b) => b - a).slice(0, 2);
    })().catch((erro) => {
      cacheTabelasRecentes = null;
      throw erro;
    });
  }
  return cacheTabelasRecentes;
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
    })().catch((erro) => {
      cacheMarcas = null; // idem resolverTabelaReferencia: não cachear rejeição
      throw erro;
    });
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
    })().catch((erro) => {
      cacheModelosPorMarca.delete(marcaCode); // não cachear rejeição
      throw erro;
    });
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
    })().catch((erro) => {
      cacheAnosPorModelo.delete(chave); // não cachear rejeição
      throw erro;
    });
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
    })().catch((erro) => {
      cacheValor.delete(chave); // não cachear rejeição
      throw erro;
    });
    cacheValor.set(chave, promessa);
  }
  return promessa;
}

// Valor num mês de referência ESPECÍFICO (não só o vigente) — usado pela âncora
// de valor da OLX pra comparar contra vigente E anterior. Cache separado, com a
// tabela na chave.
const cacheValorEmTabela = new Map<string, Promise<FipeValorResposta>>();
function buscarValorEmTabela(marcaCode: string, modeloCode: string, anoCode: string, tabela: number): Promise<FipeValorResposta> {
  const chave = `${tabela}|${marcaCode}|${modeloCode}|${anoCode}`;
  let promessa = cacheValorEmTabela.get(chave);
  if (!promessa) {
    promessa = (async () => {
      const [anoModelo, codigoTipoCombustivel] = anoCode.split("-");
      return postFipe<FipeValorResposta>("ConsultarValorComTodosParametros", {
        codigoTabelaReferencia: tabela,
        codigoTipoVeiculo: CODIGO_TIPO_VEICULO_CARRO,
        codigoMarca: marcaCode,
        codigoModelo: modeloCode,
        anoModelo,
        codigoTipoCombustivel,
        tipoVeiculo: "carro",
        tipoConsulta: "tradicional",
      });
    })().catch((erro) => {
      cacheValorEmTabela.delete(chave);
      throw erro;
    });
    cacheValorEmTabela.set(chave, promessa);
  }
  return promessa;
}

function tokenizar(texto: string): Set<string> {
  return new Set(
    normalizar(texto)
      .split(/\s+/)
      // Tira pontuação FINAL: a FIPE abrevia com ponto ("Comfort.", "Aut.",
      // "Long."). Só o final — pra não quebrar "1.0"/"2.0" (motor).
      .map((palavra) => palavra.replace(/[.\-/,]+$/, ""))
      .filter((palavra) => palavra.length >= 2)
  );
}

/**
 * Dois tokens "casam" se são IGUAIS ou se um é PREFIXO do outro com ≥4 letras.
 * A FIPE abrevia trims ("Comfort." → Comfortline, "Highl." → Highline, "Long."
 * → Longitude); match exato perdia isso e dava empate entre trims → escolhia o
 * errado (ex.: Polo "Comfortline" casava Highline pelo mesmo score). O piso de 4
 * letras evita ruído ("gl"≠"gli"; "com" não casa "compass"). A âncora de valor
 * (ML via tooltip_fipe, OLX via página) valida por cima — afrouxamento seguro.
 */
function tokensCasam(t1: string, t2: string): boolean {
  if (t1 === t2) return true;
  const [curto, longo] = t1.length <= t2.length ? [t1, t2] : [t2, t1];
  return curto.length >= 4 && longo.startsWith(curto);
}

/** Quantos tokens do item casam (exato ou prefixo) com algum token da busca. */
function contarTokensCasados(tokensItem: Set<string>, tokensBusca: Set<string>): number {
  let pontuacao = 0;
  for (const ti of tokensItem) {
    for (const tb of tokensBusca) {
      if (tokensCasam(ti, tb)) {
        pontuacao++;
        break;
      }
    }
  }
  return pontuacao;
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
    const pontuacao = contarTokensCasados(tokenizar(item.name), tokensBusca);
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhor = item;
    }
  }

  return melhorPontuacao >= pontuacaoMinima ? melhor : null;
}

/**
 * TODAS as marcas que casam com o texto buscado, não só a melhor — a mesma marca
 * pode estar catalogada na FIPE sob nomes diferentes por ano/modelo. A Chery, por
 * ex., aparece como "Caoa Chery" E "Caoa Chery/Chery" (a CAOA assumiu a marca no
 * Brasil): um modelo pode existir só numa das duas. Retorna todas as de pontuação
 * MÁXIMA (empatadas no topo), pra o resolvedor varrer o modelo em cada uma. É
 * seguro alargar assim porque a âncora de VALOR valida por cima — procurar numa
 * marca a mais nunca gera código errado (modelo errado não encaixa no valor), só
 * acha o certo que estava na variante "errada". Match exato do nome vence e
 * retorna só ele (mais específico). Ver o print da FIPE (Caoa Chery / Caoa Chery/Chery).
 */
function marcasCandidatas<T extends { name: string }>(itens: T[], textoBusca: string, pontuacaoMinima = 1): T[] {
  const busca = normalizar(textoBusca);
  const exato = itens.find((item) => normalizar(item.name) === busca);
  if (exato) return [exato];

  const tokensBusca = tokenizar(textoBusca);
  if (tokensBusca.size === 0) return [];

  const pontuadas = itens.map((item) => ({ item, p: contarTokensCasados(tokenizar(item.name), tokensBusca) }));
  const maxP = Math.max(0, ...pontuadas.map((x) => x.p));
  if (maxP < pontuacaoMinima) return [];
  return pontuadas.filter((x) => x.p === maxP).map((x) => x.item);
}

function pontuarCandidatos<T extends { name: string }>(itens: T[], textoBusca: string): { item: T; pontuacao: number }[] {
  const tokensBusca = tokenizar(textoBusca);
  return itens
    .map((item) => ({ item, pontuacao: contarTokensCasados(tokenizar(item.name), tokensBusca) }))
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
    // Todo token do modelo precisa casar (exato ou prefixo) com algum do item.
    for (const tModelo of tokensModelo) {
      let achou = false;
      for (const ti of tokensItem) {
        if (tokensCasam(tModelo, ti)) {
          achou = true;
          break;
        }
      }
      if (!achou) return false;
    }
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

// ───────────────────────────────────────────────────────────────────────────
// CONSULTA LOCAL (nossa base). O fipe_historico já tem os códigos que
// resolvemos, com nome oficial (nome_marca/nome_modelo), ano e valor mais
// recente. Bater aqui PRIMEIRO evita a API oficial da FIPE, que passou a dar
// 403 no IP de datacenter da Railway (o cron do ML ficava com 0 elegíveis
// porque TODA consulta caía em 403 na ConsultarTabelaDeReferencia). Fuzzy
// idêntico ao da oficial, só que sobre o subconjunto que já conhecemos — e os
// modelos comuns (Onix/HB20/Renegade/Creta…) já estão na base.
// ───────────────────────────────────────────────────────────────────────────
interface AnoLocal {
  valor: number;
  mesRef: number;
  anoRef: number;
  sigla: string;
  ordem: number; // ano_ref*12 + mes_ref, pra achar o mais recente
}
interface EntradaLocal {
  codigoFipe: string;
  nomeMarca: string;
  nomeModelo: string;
  anos: Map<number, AnoLocal>;
}

let cacheIndiceLocal: Promise<EntradaLocal[]> | null = null;
function carregarIndiceLocal(): Promise<EntradaLocal[]> {
  if (!cacheIndiceLocal) {
    cacheIndiceLocal = (async () => {
      const porCodigo = new Map<string, EntradaLocal>();
      for (let de = 0; ; de += 1000) {
        const { data, error } = await supabase
          .from("fipe_historico")
          .select("codigo_fipe,nome_marca,nome_modelo,ano_modelo,valor_centavos,mes_referencia,ano_referencia,sigla_combustivel")
          .range(de, de + 999);
        if (error) throw new Error(`Falha ao carregar fipe_historico: ${error.message}`);
        for (const r of data ?? []) {
          let e = porCodigo.get(r.codigo_fipe);
          if (!e) {
            e = { codigoFipe: r.codigo_fipe, nomeMarca: r.nome_marca ?? "", nomeModelo: r.nome_modelo ?? "", anos: new Map() };
            porCodigo.set(r.codigo_fipe, e);
          }
          const ordem = r.ano_referencia * 12 + r.mes_referencia;
          const atual = e.anos.get(r.ano_modelo);
          if (!atual || ordem > atual.ordem) {
            e.anos.set(r.ano_modelo, {
              valor: r.valor_centavos / 100,
              mesRef: r.mes_referencia,
              anoRef: r.ano_referencia,
              sigla: r.sigla_combustivel ?? "-",
              ordem,
            });
          }
        }
        if (!data || data.length < 1000) break;
      }
      return [...porCodigo.values()];
    })().catch((erro) => {
      cacheIndiceLocal = null; // não perpetua falha
      throw erro;
    });
  }
  return cacheIndiceLocal;
}

/**
 * Resolve a ReferenciaFipe pela NOSSA base (fipe_historico), sem tocar na API
 * oficial. Mesmo fuzzy da oficial (marca → modelo/variante → ano), mas sobre os
 * códigos que já conhecemos. Retorna null se não estiver na base (aí o chamador
 * cai na oficial). O valor é o mais recente que temos pro (código, ano).
 */
export async function buscarReferenciaFipeLocal(
  marca: string,
  modelo: string,
  ano: string,
  variante: string | null = null
): Promise<ReferenciaFipe | null> {
  const indice = await carregarIndiceLocal();
  if (indice.length === 0) return null;
  const anoNum = Number.parseInt(ano, 10);
  if (!Number.isFinite(anoNum)) return null;

  const marcasDistintas = [...new Set(indice.map((e) => e.nomeMarca))].map((name) => ({ name }));
  const marcaEnc = encontrarMelhorCorrespondencia(marcasDistintas, marca);
  if (!marcaEnc) return null;

  const daMarca = indice.filter((e) => e.nomeMarca === marcaEnc.name).map((e) => ({ name: e.nomeModelo, entrada: e }));
  const candidatos = candidatosOrdenadosModeloVariante(daMarca, modelo, variante, 1, 25);

  for (const c of candidatos) {
    const dados = c.entrada.anos.get(anoNum);
    if (dados) {
      return {
        marca: c.entrada.nomeMarca,
        modelo: c.entrada.nomeModelo,
        ano: String(anoNum),
        valor: dados.valor,
        mesReferencia: `${MESES_PT[dados.mesRef - 1]} de ${dados.anoRef}`,
        codigoFipe: c.entrada.codigoFipe,
        anoModelo: anoNum,
        siglaCombustivel: (dados.sigla ?? "").toLowerCase(),
        mesReferenciaNum: dados.mesRef,
        anoReferencia: dados.anoRef,
      };
    }
  }
  return null;
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
  // NOSSA BASE PRIMEIRO: evita a oficial (403 no IP da Railway) pros modelos
  // que já conhecemos. Só cai na oficial nos genuinamente novos.
  const local = await buscarReferenciaFipeLocal(marca, modelo, ano, variante).catch(() => null);
  if (local) return local;

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
    // O Label do ano é tipo "2013 Diesel" ou "32000 Gasolina" (32000 = 0km).
    // Casa pelo ANO como NÚMERO inteiro do prefixo — NÃO por substring: o antigo
    // .includes("2000") batia dentro de "3(2000)" (0km) e um Corolla 2000 pegava
    // o valor de um Altis Híbrido zero-km (R$205 mil, +88% de "margem" falsa).
    const anoAlvo = Number.parseInt(ano, 10);
    const ref = Number.isFinite(anoAlvo)
      ? anos.find((item) => Number.parseInt(item.name, 10) === anoAlvo)
      : anos.find((item) => item.name.startsWith(ano));
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

// Folga só de arredondamento de centavos ao comparar o valor da página com o da
// oficial. NÃO é tolerância de versão: o encaixe é EXATO (o valor da FIPE na
// página da OLX existe idêntico na oficial — só o texto do anúncio "bagunça").
const EPSILON_ENCAIXE_REAIS = 1;

/**
 * Resolve a ReferenciaFipe usando o VALOR da página como âncora de verdade.
 * Portais grandes (OLX) puxam o FIPE direto da fonte oficial quando o vendedor
 * escolhe marca/modelo/versão/ano nos dropdowns — então o VALOR exibido é
 * exato, mesmo quando o texto livre do anúncio está bagunçado. Marca e ano vêm
 * corretos; o que precisa acertar é modelo-versão.
 *
 * Em vez de confiar no melhor texto (que cai em versões vizinhas ~2-4% off — foi
 * o que gerava falsos "abaixo da margem" e código errado no gráfico), iteramos
 * os candidatos batendo na oficial e devolvemos aquele cujo valor ENCAIXA EXATO
 * no valor da página. Se nenhum encaixa, retorna null — melhor ficar sem código
 * (mantendo a margem da página, re-tentando no próximo run) do que gravar um
 * código errado. Ver project_repasse_livre_fipe_ancora_valor_olx.
 */
export async function resolverReferenciaFipePorValor(
  marca: string,
  modelo: string,
  ano: string,
  variante: string | null,
  valorPagina: number
): Promise<ReferenciaFipe | null> {
  if (!(valorPagina > 0)) return null;

  const marcas = await buscarMarcas();
  // Varre TODAS as marcas que casam (ex.: "Caoa Chery" + "Caoa Chery/Chery") — o
  // modelo pode estar só numa das variantes. Seguro: a âncora de valor exato
  // valida por cima, então marca extra nunca gera código errado.
  const marcasEnc = marcasCandidatas(marcas, marca);
  if (marcasEnc.length === 0) return null;

  try {
    const tabelas = await resolverTabelasRecentes();
    const tabelaAtual = tabelas[0];
    const tabelaAnterior = tabelas[1]; // undefined se a FIPE só tiver uma tabela

    for (const marcaEncontrada of marcasEnc) {
      const modelos = await buscarModelos(marcaEncontrada.code);
      // O código certo quase sempre está entre os melhores por TEXTO — quem desempata
      // é o valor. topN moderado (8) equilibra: cobre a versão certa vs. a vizinha
      // (que é o caso que a âncora resolve) sem estourar a FIPE em chamadas (cada
      // candidato custa buscarAnos+buscarValor; grupo-3 iteraria todos à toa).
      const candidatos = candidatosOrdenadosModeloVariante(modelos, modelo, variante, 1, 8);

      for (const candidato of candidatos) {
        const anos = await buscarAnos(marcaEncontrada.code, candidato.code);
        const refAno = anos.find((item) => item.name.startsWith(ano)) ?? anos.find((item) => item.name.includes(ano));
        if (!refAno) continue;

        // Encaixe EXATO contra o mês vigente e, se não bater, o anterior (OLX
        // atrasa a virada). Igualdade de verdade — a folga é só de centavos.
        const valorAtual = await buscarValorEmTabela(marcaEncontrada.code, candidato.code, refAno.code, tabelaAtual);
        let encaixou = Math.abs(parsePrecoFipe(valorAtual.Valor) - valorPagina) <= EPSILON_ENCAIXE_REAIS;

        if (!encaixou && tabelaAnterior !== undefined) {
          const valorAnterior = await buscarValorEmTabela(marcaEncontrada.code, candidato.code, refAno.code, tabelaAnterior);
          encaixou = Math.abs(parsePrecoFipe(valorAnterior.Valor) - valorPagina) <= EPSILON_ENCAIXE_REAIS;
        }

        if (encaixou) {
          // Achou o código certo (bateu no vigente OU no anterior). Retornamos
          // SEMPRE a referência do mês VIGENTE (código é estável; valor/mês
          // atuais) — o codigo_fipe é o que importa aqui; a margem da OLX segue
          // vindo do valor da página.
          const { mes: mesRef, ano: anoRef } = parseMesReferencia(valorAtual.MesReferencia);
          return {
            marca: marcaEncontrada.name,
            modelo: candidato.name,
            ano: refAno.name,
            valor: parsePrecoFipe(valorAtual.Valor),
            mesReferencia: valorAtual.MesReferencia.trim(),
            codigoFipe: valorAtual.CodigoFipe,
            anoModelo: Number.parseInt(refAno.name, 10),
            siglaCombustivel: (valorAtual.SiglaCombustivel ?? "").toLowerCase(),
            mesReferenciaNum: mesRef,
            anoReferencia: anoRef,
          };
        }
      }
    }
  } catch {
    // FIPE estrangulou (429 após os retries do postFipe) no meio da varredura de
    // candidatos: aborta a resolução deste veículo (fica sem código, re-tenta no
    // próximo run) em vez de martelar mais a API ou derrubar o processo.
    return null;
  }
  return null; // nenhum candidato encaixou exato
}

// Tolerância relativa da âncora POR PROXIMIDADE (ML): a FIPE que o ML mostra é
// aproximada (~0,5% do real), mas trims vizinhos diferem ~10%+. 8% separa o trim
// certo do vizinho com folga.
const TOLERANCIA_PROXIMIDADE = 0.08;

/**
 * Como resolverReferenciaFipePorValor, mas escolhe o candidato cujo valor oficial
 * é o MAIS PRÓXIMO de `valorAlvo` (não exige encaixe exato). Pro Mercado Livre: a
 * FIPE do `tooltip_fipe` da página é aproximada, então não dá pra exigir
 * igualdade — mas é boa o bastante pra desempatar o TRIM (Comfort vs Highline
 * diferem ~R$8k). Retorna null se o mais próximo ainda ficar fora da tolerância
 * (~8%) — aí não confiamos, e o chamador decide.
 */
export async function resolverReferenciaFipeProximaDoValor(
  marca: string,
  modelo: string,
  ano: string,
  variante: string | null,
  valorAlvo: number
): Promise<ReferenciaFipe | null> {
  if (!(valorAlvo > 0)) return null;

  const marcas = await buscarMarcas();
  // Varre TODAS as marcas que casam (ex.: "Caoa Chery" + "Caoa Chery/Chery"). A
  // proximidade (≤8%) já filtra o trim errado; alargar a marca só amplia a busca.
  const marcasEnc = marcasCandidatas(marcas, marca);
  if (marcasEnc.length === 0) return null;

  // Combustível E cilindrada declarados no anúncio — discriminadores DUROS pra NÃO
  // casar Diesel com Flex nem "1.3" com "2.0"/"2.2" (o tooltip errado do ML puxava
  // pro trim mais caro). Idealmente vêm dos atributos reais do ML (ver enriquecimento
  // em corrigirFipeComAncora), com o título como reforço.
  const fuelAlvo = classeCombustivel(`${variante ?? ""} ${modelo}`);
  const cilAlvo = cilindrada(`${variante ?? ""} ${modelo}`);
  let melhor: { valor: FipeValorResposta; refAno: FipeAno; nome: string; marcaNome: string; v: number; dist: number } | null = null;
  try {
    for (const marcaEncontrada of marcasEnc) {
      const modelos = await buscarModelos(marcaEncontrada.code);
      const candidatos = candidatosOrdenadosModeloVariante(modelos, modelo, variante, 1, 12);
      for (const candidato of candidatos) {
        // Combustível/cilindrada do candidato. Se o anúncio declara um e o
        // candidato é OUTRO → pula (não cruza Diesel×Flex nem 1.3×2.0).
        const fuelCand = classeCombustivel(candidato.name);
        if (fuelAlvo && fuelCand && fuelAlvo !== fuelCand) continue;
        const cilCand = cilindrada(candidato.name);
        if (cilAlvo && cilCand && cilAlvo !== cilCand) continue;
        const anos = await buscarAnos(marcaEncontrada.code, candidato.code);
        const refAno = anos.find((item) => item.name.startsWith(ano)) ?? anos.find((item) => item.name.includes(ano));
        if (!refAno) continue;
        const fuelAno = classeCombustivel(refAno.name);
        if (fuelAlvo && fuelAno && fuelAlvo !== fuelAno) continue; // ex.: anúncio Flex vs "2025 Diesel"
        const valor = await buscarValor(marcaEncontrada.code, candidato.code, refAno.code);
        const v = parsePrecoFipe(valor.Valor);
        const dist = Math.abs(v - valorAlvo) / valorAlvo;
        if (!melhor || dist < melhor.dist) {
          melhor = { valor, refAno, nome: candidato.name, marcaNome: marcaEncontrada.name, v, dist };
        }
      }
    }
  } catch {
    return null; // FIPE estrangulou — deixa o chamador seguir com o que já tinha
  }

  if (!melhor || melhor.dist > TOLERANCIA_PROXIMIDADE) return null;

  const { mes: mesRef, ano: anoRef } = parseMesReferencia(melhor.valor.MesReferencia);
  return {
    marca: melhor.marcaNome,
    modelo: melhor.nome,
    ano: melhor.refAno.name,
    valor: melhor.v,
    mesReferencia: melhor.valor.MesReferencia.trim(),
    codigoFipe: melhor.valor.CodigoFipe,
    anoModelo: Number.parseInt(melhor.refAno.name, 10),
    siglaCombustivel: (melhor.valor.SiglaCombustivel ?? "").toLowerCase(),
    mesReferenciaNum: mesRef,
    anoReferencia: anoRef,
  };
}

/**
 * Resolve por TEXTO (sem valor de âncora), respeitando os guards de combustível e
 * cilindrada. Retorna o PRIMEIRO candidato (melhor texto) que casa combustível +
 * cilindrada + ano — pro backfill de anúncios com FIPE errada (ML antigos não têm
 * o tooltip guardado, então não dá pra ancorar por valor). Nunca cruza motor/combustível.
 */
export async function resolverReferenciaFipePorTexto(
  marca: string,
  modelo: string,
  ano: string,
  variante: string | null
): Promise<ReferenciaFipe | null> {
  const marcas = await buscarMarcas();
  const marcasEnc = marcasCandidatas(marcas, marca);
  if (marcasEnc.length === 0) return null;
  const fuelAlvo = classeCombustivel(`${variante ?? ""} ${modelo}`);
  const cilAlvo = cilindrada(`${variante ?? ""} ${modelo}`);
  try {
    for (const marcaEncontrada of marcasEnc) {
      const modelos = await buscarModelos(marcaEncontrada.code);
      const candidatos = candidatosOrdenadosModeloVariante(modelos, modelo, variante, 1, 12);
      for (const candidato of candidatos) {
        const fuelCand = classeCombustivel(candidato.name);
        if (fuelAlvo && fuelCand && fuelAlvo !== fuelCand) continue;
        const cilCand = cilindrada(candidato.name);
        if (cilAlvo && cilCand && cilAlvo !== cilCand) continue;
        const anos = await buscarAnos(marcaEncontrada.code, candidato.code);
        const refAno = anos.find((item) => item.name.startsWith(ano)) ?? anos.find((item) => item.name.includes(ano));
        if (!refAno) continue;
        const fuelAno = classeCombustivel(refAno.name);
        if (fuelAlvo && fuelAno && fuelAlvo !== fuelAno) continue;
        const valor = await buscarValor(marcaEncontrada.code, candidato.code, refAno.code);
        const { mes, ano: anoRef } = parseMesReferencia(valor.MesReferencia);
        return {
          marca: marcaEncontrada.name,
          modelo: candidato.name,
          ano: refAno.name,
          valor: parsePrecoFipe(valor.Valor),
          mesReferencia: valor.MesReferencia.trim(),
          codigoFipe: valor.CodigoFipe,
          anoModelo: Number.parseInt(refAno.name, 10),
          siglaCombustivel: (valor.SiglaCombustivel ?? "").toLowerCase(),
          mesReferenciaNum: mes,
          anoReferencia: anoRef,
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Resolvedor FB-ESPECÍFICO: texto livre do vendedor, SEM âncora de valor (o FB não
 * dá o FIPE na página como OLX/ML). Aplica as MESMAS guardas duras (combustível +
 * cilindrada) do resolvedor por valor — conserta o bug do Sandero "1.0" que casava
 * o "Stepway 1.6" — E resolve a ambiguidade de VERSÃO com a regra do usuário:
 * quando o anunciante NÃO especifica a versão (só o motor — ~70% do FB, "Sandero
 * 1.0 básico"), a versão é a de ENTRADA. Operacionalização: entre os candidatos que
 * EMPATAM no melhor score de texto (sem versão → todos empatam), pega o de MENOR
 * VALOR (= trim base, ex.: Sandero Authentique 1.0 R$23.211, não o Expression mais
 * caro). Se a versão VEM no texto, o score a favorece e o "menor valor" desempata só
 * dentro dela. Escolha conservadora: nunca infla a FIPE → margem honesta. Ano casado
 * por INTEIRO (não substring — mesmo cuidado do 32000⊃2000).
 */
export async function resolverReferenciaFipeEntrada(
  marca: string,
  modelo: string,
  ano: string,
  variante: string | null
): Promise<ReferenciaFipe | null> {
  const marcas = await buscarMarcas();
  const marcasEnc = marcasCandidatas(marcas, marca);
  if (marcasEnc.length === 0) return null;
  const fuelAlvo = classeCombustivel(`${variante ?? ""} ${modelo}`);
  const cilAlvo = cilindrada(`${variante ?? ""} ${modelo}`);
  const anoNum = Number.parseInt(ano, 10);
  const busca = `${modelo} ${variante ?? ""}`.trim();
  type Cand = { valor: FipeValorResposta; refAno: FipeAno; nome: string; marcaNome: string; v: number; score: number };
  const passa: Cand[] = [];
  try {
    for (const marcaEncontrada of marcasEnc) {
      const modelos = await buscarModelos(marcaEncontrada.code);
      const candidatos = candidatosOrdenadosModeloVariante(modelos, modelo, variante, 1, 30);
      for (const { item: candidato, pontuacao } of pontuarCandidatos(candidatos, busca)) {
        const fuelCand = classeCombustivel(candidato.name);
        if (fuelAlvo && fuelCand && fuelAlvo !== fuelCand) continue;
        const cilCand = cilindrada(candidato.name);
        if (cilAlvo && cilCand && cilAlvo !== cilCand) continue; // 1.0 ≠ 1.6: guarda dura
        const anos = await buscarAnos(marcaEncontrada.code, candidato.code);
        const refAno = Number.isFinite(anoNum)
          ? anos.find((i) => Number.parseInt(i.name, 10) === anoNum)
          : anos.find((i) => i.name.startsWith(ano));
        if (!refAno) continue;
        const fuelAno = classeCombustivel(refAno.name);
        if (fuelAlvo && fuelAno && fuelAlvo !== fuelAno) continue;
        const valor = await buscarValor(marcaEncontrada.code, candidato.code, refAno.code);
        passa.push({ valor, refAno, nome: candidato.name, marcaNome: marcaEncontrada.name, v: parsePrecoFipe(valor.Valor), score: pontuacao });
      }
    }
  } catch {
    return null; // FIPE estrangulou — chamador segue com o que tinha
  }
  if (passa.length === 0) return null;
  const maxScore = Math.max(...passa.map((c) => c.score));
  const escolhido = passa.filter((c) => c.score === maxScore).reduce((a, b) => (b.v < a.v ? b : a));
  const { mes, ano: anoRef } = parseMesReferencia(escolhido.valor.MesReferencia);
  return {
    marca: escolhido.marcaNome,
    modelo: escolhido.nome,
    ano: escolhido.refAno.name,
    valor: escolhido.v,
    mesReferencia: escolhido.valor.MesReferencia.trim(),
    codigoFipe: escolhido.valor.CodigoFipe,
    anoModelo: Number.parseInt(escolhido.refAno.name, 10),
    siglaCombustivel: (escolhido.valor.SiglaCombustivel ?? "").toLowerCase(),
    mesReferenciaNum: mes,
    anoReferencia: anoRef,
  };
}

// ==========================================================================
// PARALLELUM v2 — fonte PRIMÁRIA de resolução por valor.
// ==========================================================================
// A oficial (veiculos.fipe.org.br) 403a em datacenter (Railway) e 429a por
// rajada até no residencial: trims novos ficavam SEM código na captação (o
// resolvedor só grava quando encaixa exato, e sob 403/429 ele aborta). O
// Parallelum v2 (fipe.parallelum.com.br) usa os MESMOS códigos/nomes da FIPE,
// devolve codeFipe+price+referenceMonth (tudo que a âncora precisa) e, com a
// FIPE_API_KEY (plano ~1000/dia), respondeu 200 limpo onde a oficial dava 429.
// Por isso vira o primário; a oficial fica de fallback (cobre o mês ANTERIOR —
// OLX congela o FIPE na inserção — e é a rede quando o teto diário estoura).
// Ver project_repasse_livre_fipe_ancora_valor_olx / _fipe_oficial_403_railway.
const PARALLELUM_BASE = "https://fipe.parallelum.com.br/api/v2";
const PARALLELUM_KEY = process.env.FIPE_API_KEY ?? "";

/** Falha de FONTE (403/429/rede/teto), distinta de "nenhum candidato encaixou". */
export class FipeIndisponivelError extends Error {}

interface ParallelumValor {
  price: string; // "R$ 96.832,00"
  brand: string;
  model: string;
  modelYear: number;
  codeFipe: string; // "004516-0"
  referenceMonth: string; // "julho de 2026"
  fuelAcronym: string; // "F"
}

// A v2 devolve arrays diretos ([{code,name}]) — mas normalizamos por segurança.
function normalizarLista(dado: unknown): FipeItem[] {
  const arr = Array.isArray(dado) ? dado : Array.isArray((dado as any)?.models) ? (dado as any).models : [];
  return (arr as { code: number | string; name: string }[]).map((x) => ({ code: String(x.code), name: x.name }));
}

/** GET no Parallelum v2, com o MESMO throttle serial da oficial + retry em 429/5xx/rede. */
async function getParallelum<T>(path: string, tentativa = 1): Promise<T> {
  await aguardarVezNoThrottle();
  // Manda os dois cabeçalhos de auth aceitos (subscription token e Bearer): a
  // chave é a mesma e servidores diferentes leem de um ou de outro.
  const headers: Record<string, string> = PARALLELUM_KEY
    ? { "X-Subscription-Token": PARALLELUM_KEY, Authorization: `Bearer ${PARALLELUM_KEY}` }
    : {};
  let resp: Response;
  try {
    resp = await fetch(`${PARALLELUM_BASE}${path}`, { headers });
  } catch {
    if (tentativa <= 4) {
      await aguardar(800 * tentativa);
      return getParallelum<T>(path, tentativa + 1);
    }
    throw new FipeIndisponivelError(`rede em ${path}`);
  }
  if ((resp.status === 429 || resp.status >= 500) && tentativa <= 4) {
    await aguardar(800 * tentativa);
    return getParallelum<T>(path, tentativa + 1);
  }
  if (!resp.ok) throw new FipeIndisponivelError(`HTTP ${resp.status} em ${path}`);
  return resp.json() as Promise<T>;
}

// Marcas e modelos-por-marca não mudam durante a execução → cache em memória
// (mesma estratégia da oficial). Rejeição NÃO é cacheada.
let cacheMarcasPar: Promise<FipeItem[]> | null = null;
const cacheModelosPar = new Map<string, Promise<FipeItem[]>>();
const cacheAnosPar = new Map<string, Promise<FipeItem[]>>();

function buscarMarcasParallelum(): Promise<FipeItem[]> {
  if (!cacheMarcasPar) {
    cacheMarcasPar = getParallelum<unknown>("/cars/brands")
      .then(normalizarLista)
      .catch((erro) => {
        cacheMarcasPar = null;
        throw erro;
      });
  }
  return cacheMarcasPar;
}

function buscarModelosParallelum(marcaCode: string): Promise<FipeItem[]> {
  let p = cacheModelosPar.get(marcaCode);
  if (!p) {
    p = getParallelum<unknown>(`/cars/brands/${marcaCode}/models`)
      .then(normalizarLista)
      .catch((erro) => {
        cacheModelosPar.delete(marcaCode);
        throw erro;
      });
    cacheModelosPar.set(marcaCode, p);
  }
  return p;
}

function buscarAnosParallelum(marcaCode: string, modeloCode: string): Promise<FipeItem[]> {
  const chave = `${marcaCode}|${modeloCode}`;
  let p = cacheAnosPar.get(chave);
  if (!p) {
    p = getParallelum<unknown>(`/cars/brands/${marcaCode}/models/${modeloCode}/years`)
      .then(normalizarLista)
      .catch((erro) => {
        cacheAnosPar.delete(chave);
        throw erro;
      });
    cacheAnosPar.set(chave, p);
  }
  return p;
}

function buscarValorParallelum(marcaCode: string, modeloCode: string, anoCode: string): Promise<ParallelumValor> {
  return getParallelum<ParallelumValor>(`/cars/brands/${marcaCode}/models/${modeloCode}/years/${anoCode}`);
}

/**
 * Como resolverReferenciaFipePorValor, mas contra o Parallelum v2. Só o MÊS
 * VIGENTE (o que a v2 devolve por padrão) — o caso "mês anterior" (OLX que
 * congelou o FIPE) fica pro fallback oficial, que checa vigente+anterior.
 * Propaga FipeIndisponivelError (fonte fora do ar/teto) pra o híbrido decidir;
 * retorna null quando a fonte respondeu mas nenhum candidato encaixou exato.
 */
export async function resolverReferenciaFipePorValorParallelum(
  marca: string,
  modelo: string,
  ano: string,
  variante: string | null,
  valorPagina: number
): Promise<ReferenciaFipe | null> {
  if (!(valorPagina > 0)) return null;

  const marcas = await buscarMarcasParallelum();
  // Varre TODAS as marcas que casam (ex.: "Caoa Chery" + "Caoa Chery/Chery") — o
  // modelo pode estar só numa das variantes. Seguro pela âncora de valor exato.
  const marcasEnc = marcasCandidatas(marcas, marca);
  if (marcasEnc.length === 0) return null;

  for (const marcaEncontrada of marcasEnc) {
    const modelos = await buscarModelosParallelum(marcaEncontrada.code);
    const candidatos = candidatosOrdenadosModeloVariante(modelos, modelo, variante, 1, 8);

    for (const candidato of candidatos) {
      const anos = await buscarAnosParallelum(marcaEncontrada.code, candidato.code);
      const refAno = anos.find((item) => item.name.startsWith(ano)) ?? anos.find((item) => item.name.includes(ano));
      if (!refAno) continue;

      const valor = await buscarValorParallelum(marcaEncontrada.code, candidato.code, refAno.code);
      if (Math.abs(parsePrecoFipe(valor.price) - valorPagina) <= EPSILON_ENCAIXE_REAIS) {
        const { mes, ano: anoRef } = parseMesReferencia(valor.referenceMonth);
        return {
          marca: valor.brand,
          modelo: valor.model,
          ano: refAno.name,
          valor: parsePrecoFipe(valor.price),
          mesReferencia: valor.referenceMonth.trim(),
          codigoFipe: valor.codeFipe,
          anoModelo: Number.parseInt(refAno.name, 10),
          siglaCombustivel: (valor.fuelAcronym ?? "").toLowerCase(),
          mesReferenciaNum: mes,
          anoReferencia: anoRef,
        };
      }
    }
  }
  return null;
}

/**
 * Resolvedor HÍBRIDO por valor (o que a captação e o rematch usam): Parallelum
 * v2 primeiro (confiável, sem 429, funciona na Railway) e, se ele falhar/estourar
 * o teto OU não achar match no mês vigente, cai pra oficial (que cobre o mês
 * ANTERIOR e é a rede de segurança). Nunca chuta: só retorna quando algum dos
 * dois encaixa EXATO no valor da página.
 */
export async function resolverReferenciaFipePorValorHibrido(
  marca: string,
  modelo: string,
  ano: string,
  variante: string | null,
  valorPagina: number
): Promise<ReferenciaFipe | null> {
  try {
    const viaParallelum = await resolverReferenciaFipePorValorParallelum(marca, modelo, ano, variante, valorPagina);
    if (viaParallelum) return viaParallelum;
    // Parallelum respondeu mas não encaixou no mês vigente → tenta a oficial
    // (vigente + anterior). Se a oficial cair (403/429), seu catch interno
    // devolve null — aí o anúncio fica sem código e o cron re-tenta.
  } catch {
    // Parallelum fora do ar / teto diário estourado → oficial assume.
  }
  return resolverReferenciaFipePorValor(marca, modelo, ano, variante, valorPagina);
}
