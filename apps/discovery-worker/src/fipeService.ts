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
  const marcaEncontrada = encontrarMelhorCorrespondencia(marcas, marca);
  if (!marcaEncontrada) return null;

  const modelos = await buscarModelos(marcaEncontrada.code);
  // O código certo quase sempre está entre os melhores por TEXTO — quem desempata
  // é o valor. topN moderado (8) equilibra: cobre a versão certa vs. a vizinha
  // (que é o caso que a âncora resolve) sem estourar a FIPE em chamadas (cada
  // candidato custa buscarAnos+buscarValor; grupo-3 iteraria todos à toa).
  const candidatos = candidatosOrdenadosModeloVariante(modelos, modelo, variante, 1, 8);
  if (candidatos.length === 0) return null;

  try {
    const tabelas = await resolverTabelasRecentes();
    const tabelaAtual = tabelas[0];
    const tabelaAnterior = tabelas[1]; // undefined se a FIPE só tiver uma tabela

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
  } catch {
    // FIPE estrangulou (429 após os retries do postFipe) no meio da varredura de
    // candidatos: aborta a resolução deste veículo (fica sem código, re-tenta no
    // próximo run) em vez de martelar mais a API ou derrubar o processo.
    return null;
  }
  return null; // nenhum candidato encaixou exato
}
