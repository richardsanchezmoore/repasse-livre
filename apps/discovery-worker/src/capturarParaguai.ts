/**
 * CAPTAÇÃO PARAGUAI — Facebook Marketplace, sem FIPE.
 *
 * ★★ POR QUE UM ARQUIVO SEPARADO, e não um `if` dentro do facebookMain:
 * o motor brasileiro inteiro é construído em volta da FIPE — resolve a
 * referência, calcula margem, classifica, descarta o que não casa. No
 * Paraguai não existe FIPE, e a referência é a tabela que ESTA captação vai
 * criar. Enfiar os dois caminhos no mesmo arquivo deixaria os dois piores.
 *
 * A primeira versão paraguaia é mais SIMPLES que a brasileira, não mais
 * complexa: ela só guarda. Nas palavras do Gustavo (23/09): *"lá nós é que
 * iremos descobrir padrões e iremos absorvendo dados para nossa tabela"*.
 * Primeiro volume, depois inteligência.
 *
 * O que ela faz:
 *   1. lê as praças paraguaias do painel (uf começando com "PY-")
 *   2. baixa a busca, pega os ids novos (livro-razão fb_vistos)
 *   3. abre cada anúncio SEM exigir cilindrada
 *   4. lê o preço com o parser paraguaio (guarani, dólar, escala ambígua)
 *   5. grava com moeda, procedência e país — fipe e margem ficam nulas
 *
 * Uso:  npx tsx src/capturarParaguai.ts [slug-da-regiao]
 */
import "dotenv/config";
import fs from "node:fs";
import {
  HEADERS,
  extrairAnuncioFacebook,
  extrairIdsDaBusca,
  montarUrlBuscaFacebook,
  montarVeiculoPadrao,
} from "./facebookMarketplaceService.js";
import {
  lerPrecoComContexto,
  lerProcedencia,
  ehAnuncioDeCompra,
  ehAnuncioDeDesmanche,
  mencionaTroca,
  precoEhEntrega,
  precoDeclarado,
} from "./precoParaguai.js";
import {
  baixarLogado,
  sessaoValida,
  fecharContexto,
  SessaoExpirada,
  coletarIdsComRolagem,
} from "./navegadorFacebook.js";
import { rehospedarFotosFacebook, itemIdDoLink } from "./fotosFacebook.js";
import { normalizarVeiculoPY } from "./modeloParaguai.js";
import { CATALOGO_JDM } from "./catalogoJdmParaguai.js";
import { CATALOGO_MERCADO } from "./catalogoMercadoPY.js";
import { conferirAnoModelo } from "./anoModeloPY.js";
import { geracaoDoAno } from "./geracoesPY.js";
import {
  buscarIdsVistosFacebook,
  lerConfig,
  registrarVistoFacebook,
  registrarBuscaFacebook,
  supabase,
} from "./supabaseClient.js";

interface RegiaoPY {
  nome: string;
  url: string;
  raio?: string;
  uf?: string;
}

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const slugRegiao = (r: RegiaoPY) => [slug(r.nome), r.uf ? r.uf.toLowerCase() : ""].filter(Boolean).join("-");
const dormir = (ms: number) => new Promise((res) => setTimeout(res, ms));

interface FaixaPreco { min: number; max: number }

/**
 * ★★★ PAGINAÇÃO POR FAIXA DE PREÇO — e a pergunta do Gustavo que levou até aqui.
 *
 * A busca do Marketplace devolve **24 itens e para**. Eu comecei a inventar
 * autoscroll; ele perguntou *"mas por que não seguimos o comportamento que
 * usávamos antes? E funcionava?"* — e tinha razão: o motor brasileiro nunca
 * rolou a página. Ele FATIA A BUSCA POR PREÇO, e cada faixa é uma requisição
 * que devolve os seus próprios 24. Está em facebookMain.ts desde sempre.
 *
 * Medido no navegador antes de descobrir isso: scroll por JS e scroll de mouse
 * real, dez tentativas, altura travada em 2.602px e nenhum item novo. A rolagem
 * infinita simplesmente não entrega para sessão automatizada. A faixa entrega.
 *
 * ⚠️⚠️ E AQUI ENTRA O QUE SÓ O DADO PARAGUAIO MOSTRA: metade da praça de Ciudad
 * del Este digita DÓLAR no campo que o Facebook carimba como guarani. Um
 * Corolla Cross 2026 de concessionária aparece como "PYG33.000" — são US$
 * 33.000. Esses anúncios vivem ABAIXO de qualquer faixa sensata em guarani, e
 * uma primeira faixa começando em 5 milhões os perderia TODOS, em silêncio.
 *
 * Por isso as duas primeiras faixas são baixas de propósito: elas existem para
 * pescar a população de preço em dólar, não para pescar carro barato.
 */
function parseFaixas(raw: string | null | undefined, piso: number, teto: number): FaixaPreco[] {
  if (!raw?.trim()) return [{ min: piso, max: teto }];
  const faixas = raw.split(",").map((seg) => {
    const [a, b] = seg.split("-").map((x) => x.trim());
    return { min: Number(a || 0) || piso, max: b ? Number(b) : teto };
  }).filter((f) => Number.isFinite(f.min) && Number.isFinite(f.max) && f.max > f.min);
  return faixas.length ? faixas : [{ min: piso, max: teto }];
}
const log = (...a: unknown[]) => console.log(new Date().toLocaleTimeString("pt-BR"), ...a);

/**
 * ★★★ POR QUE ISTO PASSOU A USAR NAVEGADOR LOGADO (02/10/2026)
 *
 * Esta função era um `fetch` anônimo e funcionou por meses — no Brasil. Parou,
 * e o modo como parou é o que importa: **sem erro nenhum**. A captação saía com
 * exit 0 e gravava "0 na página" nas cinco praças, de hora em hora, durante
 * dias. Falha silenciosa é pior que falha barulhenta.
 *
 * Sondado ao vivo, o anônimo devolve HTTP 200 com redirect para
 * /login/?next=... e um único __typename: "CAAFetaManualLoginRenderer".
 *
 * ⚠️ E NÃO É COISA DO PARAGUAI — o Gustavo levantou essa dúvida e o teste deu
 * razão a ele pela metade: comparando as duas praças brasileiras antigas com as
 * paraguaias, **as quatro estão igualmente fechadas**. O Facebook trancou as
 * listagens por cidade para visitante anônimo, em todo lugar. Funcionava;
 * não funciona mais.
 *
 * Testadas e também fechadas: /marketplace/category/vehicles, /search?query=,
 * a cidade sem subcategoria, e até a página de ITEM. A única coisa que ainda
 * abre é a raiz /marketplace/, que devolve seis itens aleatórios sem filtro de
 * lugar nem de categoria ("Tree bookshelf") — inútil para a tabela.
 *
 * Sobrou sessão real. Ver navegadorFacebook.ts para o desenho (perfil
 * persistente em vez de cookie copiado, e por que a conta tem que ser dedicada).
 */
async function baixar(url: string): Promise<string> {
  return baixarLogado(url);
}

/** ⚠️ O ₲ chega escapado no JSON do FB. Ver desescapar() em precoParaguai. */
const itemUrl = (id: string) => `https://www.facebook.com/marketplace/item/${id}/?locale=es_LA`;
const linkPublico = (id: string) => `https://www.facebook.com/marketplace/item/${id}`;

/**
 * ★★★ TRAVA CONTRA RODADA SOBREPOSTA — medido em 07/10/2026, não previsto.
 *
 * A tarefa RL-fb-py-todas começou às 09:15 e às 13:15 AINDA estava rodando
 * (ainda salvando: último anúncio às 12:33). A próxima dispara 13:25. Ou seja:
 * duas varreduras no mesmo perfil, ao mesmo tempo, todo ciclo.
 *
 * ⚠️⚠️ E ISSO NÃO É SÓ DESPERDÍCIO. Duas instâncias de Chrome no MESMO
 * `user-data-dir` brigam pelo diretório — é o modo clássico de corromper
 * sessão. Andamos culpando o Facebook pelas mortes de sessão; esta é uma causa
 * nossa, e explica por que o login morria sem motivo aparente.
 *
 * ⚠️ SAIR COM CÓDIGO 0, não erro: "já tem uma rodando" é funcionamento normal
 * da trava, e exit≠0 encheria o histórico da tarefa agendada de falha vermelha
 * — que é justamente o sinal que a gente usa para saber que algo quebrou.
 *
 * ⚠️ A trava é por PID VIVO, não pela existência do arquivo: force-kill e queda
 * de energia deixam arquivo órfão, e trava que não se solta sozinha é pior que
 * trava nenhuma — para a captação em silêncio até alguém notar.
 */
const ARQUIVO_TRAVA = "C:/claude/fb-sessao-py.lock";

function tomarTrava(): boolean {
  try {
    const cru = fs.readFileSync(ARQUIVO_TRAVA, "utf8");
    const { pid, inicio } = JSON.parse(cru) as { pid: number; inicio: string };
    let vivo = false;
    try {
      // sinal 0 não mata: só pergunta se o processo existe (vale no Windows).
      process.kill(pid, 0);
      vivo = true;
    } catch {
      vivo = false;
    }
    if (vivo && pid !== process.pid) {
      const horas = (Date.now() - new Date(inicio).getTime()) / 3_600_000;
      log(`⛔ já existe uma varredura rodando (pid ${pid}, há ${horas.toFixed(1)}h). Saindo sem fazer nada.`);
      return false;
    }
    log(`(trava órfã do pid ${pid} descartada — processo não existe mais)`);
  } catch {
    /* sem arquivo, ou arquivo torto: caminho livre */
  }
  fs.writeFileSync(ARQUIVO_TRAVA, JSON.stringify({ pid: process.pid, inicio: new Date().toISOString() }));
  return true;
}

function soltarTrava(): void {
  try {
    const { pid } = JSON.parse(fs.readFileSync(ARQUIVO_TRAVA, "utf8")) as { pid: number };
    // ⚠️ Só apaga a PRÓPRIA trava: se outra rodada já tomou, apagar aqui a
    // liberaria para uma terceira entrar junto.
    if (pid === process.pid) fs.unlinkSync(ARQUIVO_TRAVA);
  } catch {
    /* já foi */
  }
}
/**
 * ★★★ MODO TERMO — o catálogo JDM vira plano de busca (07/10/2026).
 *
 * A sonda provou que a varredura por categoria + faixa NÃO enxerga a frota
 * japonesa: hiace, aqua, crown, noah, wish e alphard devolveram 248 anúncios
 * em CDE e Asunción, e NENHUM estava na base de 307. Dois segmentos inteiros
 * do catálogo (van_luxo, sedan_luxo) zerados. A busca por palavra-chave é
 * outro índice do Facebook, e acha o que o índice de categoria não acha.
 *
 * ⚠️ NÃO SUBSTITUI a varredura por faixa, SOMA a ela. A faixa pega o que
 * chega de qualquer marca, inclusive o que não está no catálogo; o termo pega
 * o que o catálogo sabe que existe e a faixa não mostra. Ligar um e desligar
 * o outro trocaria um buraco por outro.
 *
 * Liga com PY_MODO=termo.
 */
const MODO = (process.env.PY_MODO ?? "faixa").toLowerCase();

/**
 * ★★★ AUTOLOAD / MUTIRÃO — PY_AUTOLOAD=1.
 *
 * ★ Pedido do Gustavo (08/10/2026): *"devemos fazer um mutirão de pesquisa
 * com o AutoLoad, pois assim também conseguiremos aprimorar nossa tabela e
 * acelerar o lançamento. Se ficarmos esperando dia a dia vamos perder muitos
 * dias desnecessários, podemos utilizar os inúmeros já publicados"*.
 *
 * ⚠️ A conta que sustenta isso: a varredura diária traz ~4,3 anúncios novos
 * por rodada, e a página de categoria devolve ~13 ids sem rolagem. O mercado
 * paraguaio já tem milhares PUBLICADOS — esperar o fluxo diário é deixar o
 * estoque existente na mesa.
 *
 * ⚠️ É varredura de BACKLOG, não de rotina: roda sob demanda, não no cron.
 * Rolar muito, em muitas praças, todo dia, é o padrão que chama atenção — e
 * depois que o backlog entrou, a rolagem rende pouco, porque o que chega
 * depois cabe na primeira carga.
 */
const AUTOLOAD = process.env.PY_AUTOLOAD === "1";

/**
 * ⚠️ PULAR A RE-HOSPEDAGEM DE FOTO no mutirão (PY_SEM_FOTO=1).
 *
 * Medido: cada anúncio custa ~37s, e boa parte disso é baixar e re-hospedar
 * as fotos. Num mutirão de milhares, isso é a diferença entre uma noite e
 * uma semana.
 *
 * ★ E o próprio arquivo já tinha a razão escrita: *"o produto paraguaio é a
 * TABELA DE PREÇO, e o que a alimenta é preço + modelo + ano + km, não a
 * foto"*. No mutirão a prioridade é preço; a foto vem depois.
 *
 * ⚠️⚠️ MAS A FOTO CADUCA. O link do fbcdn tem validade e vira 403 em poucos
 * dias — foi o que deixou o catálogo inteiro sem imagem em outubro. Então
 * `backfillFotosPY` TEM que rodar logo depois; passar da validade significa
 * voltar ao Facebook anúncio por anúncio, ou perder a imagem de vez.
 */
const SEM_FOTO = process.env.PY_SEM_FOTO === "1";
const ROLAGENS = Number(process.env.PY_ROLAGENS ?? 20);

/**
 * ⚠️⚠️ PAUSA DA ROLAGEM ≠ PACING ENTRE BUSCAS. Confundi as duas e custou caro:
 * o `pacing` do painel (1.500ms) é a educação ENTRE buscas, e usá-lo como
 * espera entre rolagens fez a colheita parar em 38 ids onde cabiam 500 — sem
 * erro no log, porque parecia fim de lista.
 *
 * O Facebook precisa de ~2s para montar o lote seguinte. Este número responde
 * a isso, não à política de ritmo.
 */
const PAUSA_ROLAGEM = Number(process.env.PY_PAUSA_ROLAGEM ?? 2500);

/**
 * ⚠️ O teto por praça vem do painel (FACEBOOK_MAX_ITENS, 40). Num mutirão
 * isso corta a colheita pela metade — mas mudar a config mexeria também na
 * rodada de rotina, que não é o que se quer. Env ganha da config, e só aqui.
 */
const MAX_ITENS_ENV = Number(process.env.PY_MAX_ITENS ?? 0);

/** Quantos termos por rodada. Teto baixo: é a conta do Gustavo e ela é usável. */
const TERMOS_POR_RODADA = Number(process.env.PY_TERMOS_POR_RODADA ?? 10);

interface Busca {
  rotulo: string;
  url: string;
  min: number;
  max: number;
  termo: string | null;
}

/** O trecho de praça da URL do painel: /marketplace/<aqui>/carros/... */
function localDaRegiao(url: string): string | null {
  return url.match(/\/marketplace\/([^/?#]+)/)?.[1] ?? null;
}

/**
 * ★ QUAIS TERMOS VARRER AGORA — a fila sai do próprio banco, sem cursor.
 *
 * Duas perguntas, nesta ordem:
 *   1. qual modelo do catálogo tem MENOS anúncio na base?  → vai na frente
 *   2. qual termo já foi buscado nas últimas 24h?          → fica para depois
 *
 * ⚠️ A pergunta 2 não é educação com o Facebook, é o que impede a fila de
 * travar: um modelo que de fato não circula no Paraguai ficaria eternamente
 * em primeiro lugar na pergunta 1, e os outros 58 nunca rodariam.
 */
async function escolherTermos(limite: number): Promise<string[]> {
  // ★★ OS DOIS CATÁLOGOS. O JDM é a tese (frota japonesa) e busca pelo nome
  // solto, porque "vitz" e "premio" são distintivos. O de mercado cobre o resto
  // — ~47% da base que não tinha termo nenhum — e decide por entrada se precisa
  // da marca junto, porque "soul", "fit" e "gol" sozinhos trazem vara de pesca.
  //
  // ⚠️ TERMO ≠ MODELO, e confundir os dois quebra a fila. A busca pode ser
  // "kia soul" enquanto o modelo gravado no banco é "Soul": a cobertura tem que
  // ser medida pelo MODELO e a busca feita pelo TERMO.
  const candidatos: { termo: string; modelo: string }[] = [
    ...CATALOGO_JDM.map((m) => ({ termo: m.nomes[0], modelo: m.nomes[0] })),
    ...CATALOGO_MERCADO.map((m) => ({
      termo: m.comMarca ? `${m.marca.toLowerCase()} ${m.nomes[0]}` : m.nomes[0],
      modelo: m.nomes[0],
    })),
  ];

  const desde = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data: recentes } = await supabase
    .from("fb_buscas")
    .select("termo")
    .gte("executada_em", desde)
    .not("termo", "is", null);
  const jaFoi = new Set((recentes ?? []).map((r) => String(r.termo)));

  // ⚠️ Uma consulta só para a cobertura toda: uma contagem por modelo seriam
  // ~160 idas ao banco por rodada, e já estourei o egress deste projeto uma vez.
  const { data: base } = await supabase.from("opportunities").select("modelo").eq("pais", "PY");
  const cobertura = new Map<string, number>();
  for (const linha of base ?? []) {
    const m = String(linha.modelo ?? "").toLowerCase();
    if (!m) continue;
    for (const c of candidatos) {
      if (m === c.modelo || m.includes(c.modelo) || c.modelo.includes(m)) {
        cobertura.set(c.termo, (cobertura.get(c.termo) ?? 0) + 1);
      }
    }
  }

  return candidatos
    .filter((c) => !jaFoi.has(c.termo))
    .sort((a, b) => (cobertura.get(a.termo) ?? 0) - (cobertura.get(b.termo) ?? 0))
    .slice(0, limite)
    .map((c) => c.termo);
}
async function main() {
  if (!tomarTrava()) return;
  const alvo = process.argv[2];
  const [regioesRaw, minPreco, maxPreco, minAno, maxItensRaw, pacingRaw, faixasRaw] = await Promise.all([
    lerConfig("FACEBOOK_REGIOES"),
    lerConfig("FACEBOOK_FILTRO_MIN_PRECO"),
    lerConfig("FACEBOOK_FILTRO_MAX_PRECO"),
    lerConfig("FACEBOOK_FILTRO_MIN_ANO"),
    lerConfig("FACEBOOK_MAX_ITENS"),
    lerConfig("FACEBOOK_PACING_MS"),
    lerConfig("FACEBOOK_FAIXAS_PRECO"),
  ]);

  let todas: RegiaoPY[] = [];
  try {
    const v = JSON.parse(regioesRaw ?? "[]");
    if (Array.isArray(v)) todas = v.filter((r) => r?.nome && r?.url);
  } catch { /* config inválida */ }

  // Só praças paraguaias. O prefixo "PY-" na UF é o que separa os dois países.
  const regioes = todas.filter((r) => (r.uf ?? "").startsWith("PY-"))
    .filter((r) => !alvo || slugRegiao(r) === alvo);

  if (!regioes.length) {
    log("nenhuma praça paraguaia" + (alvo ? ` com slug "${alvo}"` : "") + " no painel.");
    return;
  }

  const maxItens = MAX_ITENS_ENV > 0 ? MAX_ITENS_ENV : Number(maxItensRaw ?? 40);
  const pacing = Number(pacingRaw ?? 2500);
  // ⚠️ Vazio = SEM filtro. O padrão brasileiro (15000-400000) em guarani
  // descartaria o mercado inteiro em silêncio.
  const filtros = { minPreco: minPreco ?? "", maxPreco: maxPreco ?? "", minAno: minAno ?? "", sort: "creation_time_descend" };
  // ⚠️⚠️ CHECA A SESSÃO ANTES DE VARRER. Sem isto, sessão caída vira "0 na
  // página" em todas as praças e exit 0 — o relatório diz que rodou, o painel
  // não acusa nada, e só se descobre dias depois olhando o banco vazio. Falhar
  // aqui, alto e cedo, é o ponto inteiro.
  if (!(await sessaoValida())) {
    log("❌ SESSÃO DO FACEBOOK CAÍDA — nada será capturado.");
    log("   Rode:  npx tsx src/navegadorFacebook.ts login");
    await fecharContexto();
    process.exitCode = 2;
    return;
  }

  // Piso 1.000 de propósito: é onde moram os anúncios com preço em dólar
  // digitado no campo guarani. Teto aberto (2 bilhões de Gs cobre importado de
  // luxo) quando o painel não define.
  const faixas = parseFaixas(faixasRaw, Number(filtros.minPreco || 1000), Number(filtros.maxPreco || 2_000_000_000));

  log(`${AUTOLOAD ? `★ MUTIRÃO (autoload, ${ROLAGENS} rolagens) · ` : ""}praças: ${regioes.map((r) => r.nome).join(", ")} | minPrice=${filtros.minPreco || "(sem)"} | ano>=${filtros.minAno || "(sem)"} | teto ${maxItens}/praça`);

  // ★★ REPESCAGEM DE PRAÇA ZERADA — 03/10/2026.
  //
  // Encarnación devolveu 0 em TODAS as 23 faixas numa rodada, com ritmo normal
  // (~25s entre faixas) e ZERO erro no log. Investigado depois: a URL funciona
  // com todos os filtros, inclusive com faixa de preço, e a praça seguinte
  // (Luque) rodou normal logo em seguida — então não foi bloqueio sustentado.
  //
  // ⚠️ NÃO SEI A CAUSA, e é por isso que isto existe. Praça viva com 23 faixas
  // sempre devolve alguma coisa; zero em TODAS é anomalia, não resultado. Em vez
  // de adivinhar o motivo, a rodada repete quem veio zerada: conserta seja qual
  // for a causa, e só custa uma praça a mais quando o problema de fato acontece.
  //
  // Sem isto a falha é SILENCIOSA — o log diz "0 na página", a rodada segue, e a
  // praça some da coleta do dia sem ninguém perceber. Foi o que aconteceu.
  const zeradas: typeof regioes = [];

  // ★ Carimbo ÚNICO da rodada: é o que agrupa as ~132 buscas de uma varredura
  // só, e sem ele não há como comparar rodada com rodada.
  const rodada = new Date().toISOString();

  const termosDaRodada = MODO === "termo" ? await escolherTermos(TERMOS_POR_RODADA) : [];
  if (MODO === "termo") {
    if (!termosDaRodada.length) {
      log("todos os termos do catálogo já foram buscados nas últimas 24h — nada a fazer.");
      return;
    }
    log(`MODO TERMO — ${termosDaRodada.length} termo(s): ${termosDaRodada.join(", ")}`);
  }

  const varrerRegiao = async (regiao: (typeof regioes)[number], repescagem = false): Promise<void> => {
    const marca = slugRegiao(regiao);
    log(`\n▶ ${regiao.nome} (${marca}) — ${MODO === "termo" ? `${termosDaRodada.length} termo(s)` : `${faixas.length} faixa(s) de preço`}${repescagem ? " [REPESCAGEM]" : ""}`);

    // ⚠️ Dedup ENTRE as faixas da mesma rodada: as bordas se tocam e o mesmo
    // anúncio aparece em duas. Sem isto, o relatório conta o dobro e o livro-
    // razão leva escrita à toa.
    const vistosNaRodada = new Set<string>();
    const ids: string[] = [];

    // ★ A ÚNICA coisa que muda entre os dois modos é a lista de URLs; dedup,
    // livro-razão, abertura do anúncio, preço, foto e gravação são os mesmos.
    const local = localDaRegiao(regiao.url);
    const buscas: Busca[] =
      MODO === "termo" && local
        ? termosDaRodada.map((termo) => ({
            rotulo: `termo "${termo}"`,
            // ⚠️ URL IGUAL À DA SONDA que funcionou. Nada de parâmetro a mais:
            // foi assim que ela achou 248 anúncios, e não vou melhorar no
            // escuro uma coisa que já está provada.
            url: `https://www.facebook.com/marketplace/${local}/search/?query=${encodeURIComponent(termo)}&locale=es_LA`,
            min: 0,
            max: 0,
            termo,
          }))
        : AUTOLOAD
        ? [{
            // ★★★ SOB AUTOLOAD, FATIAR POR PREÇO NÃO SERVE — medido 08/10/2026.
            //
            // Três variantes da mesma praça (sem faixa, 30–45M, 70–90M) com 20
            // rolagens devolveram 390, 375 e 410 ids — e a sobreposição entre
            // elas foi de 100%. União: 412. O Facebook IGNORA o filtro de preço
            // depois do primeiro lote e passa a servir feed genérico; conferi 12
            // anúncios da faixa 70–90M e 9 estavam fora dela.
            //
            // ⚠️ Ou seja: as 23 faixas eram CONTORNO para não conseguirmos rolar.
            // Com rolagem, 23 buscas devolvem o mesmo que 1 — e custam 23 vezes
            // mais exposição numa conta que precisa ser preservada.
            rotulo: "praça inteira (autoload)",
            url: montarUrlBuscaFacebook(
              regiao.url,
              { ...filtros, minPreco: "", maxPreco: "" },
              regiao.raio ?? "60",
            ),
            min: 0,
            max: 0,
            termo: null,
          }]
        : faixas.map((faixa) => ({
            rotulo: `faixa ${faixa.min.toLocaleString("pt-BR")}–${faixa.max.toLocaleString("pt-BR")}`,
            url: montarUrlBuscaFacebook(
              regiao.url,
              { ...filtros, minPreco: String(faixa.min), maxPreco: String(faixa.max) },
              regiao.raio ?? "60",
            ),
            min: faixa.min,
            max: faixa.max,
            termo: null,
          }));

    for (const busca of buscas) {
      // ★ COM AUTOLOAD os ids vêm do DOM, rolando; sem ele, do HTML da
      // primeira carga. ⚠️ Depois de rolar o JSON do GraphQL não acompanha,
      // então ler o HTML devolveria os mesmos ~13 de sempre.
      let cruDaFaixa: string[];
      try {
        cruDaFaixa = AUTOLOAD
          ? await coletarIdsComRolagem(busca.url, ROLAGENS, PAUSA_ROLAGEM)
          : extrairIdsDaBusca(await baixar(busca.url));
      } catch (e) {
        if (e instanceof SessaoExpirada) throw e;
        log(`  ✗ ${busca.rotulo} falhou: ${(e as Error).message}`);
        continue;
      }
      // ★★ O QUE O FACEBOOK DEVOLVEU, NA ORDEM E SEM FILTRO NOSSO.
      //
      // ⚠️ Registrar DEPOIS da dedup destruiria o sinal: o que denuncia se ele
      // honra `creation_time_descend` ou rotaciona com "perto de você" é a
      // POSIÇÃO de cada id, e a dedup remove justamente os repetidos — que são
      // a evidência. Ver migração 0089.
      await registrarBuscaFacebook(rodada, marca, busca.min, busca.max, cruDaFaixa, busca.termo);

      const novosDaFaixa = cruDaFaixa.filter((id) => !vistosNaRodada.has(id));
      novosDaFaixa.forEach((id) => vistosNaRodada.add(id));
      ids.push(...novosDaFaixa);
      log(`    ${busca.rotulo}: ${cruDaFaixa.length} na página, ${novosDaFaixa.length} novo(s)`);
      // ⚠️ Pausa ENTRE faixas: são várias buscas seguidas na mesma praça, e é
      // justamente o padrão que mais chama atenção. O pacing do painel vale
      // aqui também.
      await dormir(pacing);
    }

    if (!ids.length) {
      log("  0 na página · 0 novos");
      // ⚠️ Só agenda repescagem se não for ela própria — senão vira laço infinito.
      if (!repescagem) zeradas.push(regiao);
      return;
    }
    const jaVistos = await buscarIdsVistosFacebook(ids);
    const novos = ids.filter((id) => !jaVistos.has(id)).slice(0, maxItens);
    log(`  ${ids.length} na página · ${novos.length} novos`);

    const conta = { salvos: 0, ambiguos: 0, iscas: 0, compra: 0, semPreco: 0, erro: 0, semFoto: 0, entregas: 0, resgatados: 0, naoVeiculo: 0, desmanche: 0 };

    for (const id of novos) {
      try {
        const detalhe = await baixar(itemUrl(id));

        // ★ SEM exigir cilindrada: no Paraguai não há FIPE para casar e essa
        // regra derrubava 6 de cada 10 anúncios.
        const { anuncio: a } = extrairAnuncioFacebook(detalhe, id, { exigirMotor: false });
        if (!a) { conta.erro++; await registrarVistoFacebook(id, "sem_parse"); await dormir(pacing); continue; }

        // ★★★ PORTÃO DO MODO TERMO: SEM ANO, NÃO ENTRA.
        //
        // A busca por palavra-chave não aceita restrição de categoria — cinco
        // variantes de URL testadas em 08/10/2026, todas ignoram (a lápide com
        // o detalhe está em facebookMarketplaceService). Então "century" traz
        // vara de pesca, relógio e multivitamínico, e o normalizador, vendo a
        // palavra no catálogo JDM, gravou nove deles como "Toyota Century" —
        // um a USD 240.000. Todos removidos à mão depois.
        //
        // ★ O ANO é o discriminador, e a medição é limpa: 2% da base não tem
        // ano, e é nesses 2% que mora o lixo (óleo de motor, página de
        // revenda, vara). Carro paraguaio praticamente sempre declara o ano,
        // porque é o que define o preço.
        //
        // ⚠️ E o custo é aceitável POR CONSTRUÇÃO: a referência é por
        // modelo+ano, então anúncio sem ano não serve para a tabela de
        // qualquer jeito. O portão só recusa o que já não ia ser usado.
        //
        // ⚠️ No modo faixa isto NÃO roda: lá a URL de categoria já restringe.
        if (MODO === "termo" && !a.ano) {
          conta.naoVeiculo++;
          await registrarVistoFacebook(id, "sem_ano_modo_termo");
          await dormir(pacing);
          continue;
        }

        const contexto = `${a.titulo ?? ""} ${a.descricao ?? ""}`;
        if (ehAnuncioDeCompra(a.titulo ?? "", a.descricao ?? "")) {
          conta.compra++;
          await registrarVistoFacebook(id, "anuncio_de_compra");
          await dormir(pacing);
          continue;
        }

        // ★ CARRO PARA DESMANCHE não é carro à venda: é carro vendido em
        // PEÇAS, e o preço que aparece é o de uma peça. Achado na base em
        // 08/10/2026 — "Chevrolet Luv 1997 Desarme" a US$ 450.000, que era
        // ₲450.000 de uma peça lido como dólar. Os dois defeitos se somaram.
        if (ehAnuncioDeDesmanche(a.titulo ?? "")) {
          conta.desmanche++;
          await registrarVistoFacebook(id, "desmanche");
          await dormir(pacing);
          continue;
        }

        // O texto formatado tem que sair da janela do anúncio PRINCIPAL: o HTML
        // traz ~21 anúncios e todos têm formatted_price.
        const win = detalhe.slice(
          Math.max(0, detalhe.indexOf('"redacted_description"') - 9000),
          detalhe.indexOf('"redacted_description"') + 9000
        );
        const textoPreco = win.match(/"formatted_price":\{"text":"([^"]+)"/)?.[1] ?? String(a.precoCampo ?? "");
        const preco = lerPrecoComContexto(textoPreco, contexto);

        if (!preco.ok) {
          if (preco.motivo === "escala_ambigua") conta.ambiguos++;
          else if (preco.motivo === "preco_isca") conta.iscas++;
          else conta.semPreco++;
          // ⚠️ Marca como visto para não reabrir todo ciclo, mas guarda o
          // motivo: a proporção de ambíguos é o que vai dizer quando a tabela
          // já tem massa para arbitrar a escala sozinha.
          await registrarVistoFacebook(id, preco.motivo);
          await dormir(pacing);
          continue;
        }

        // ★★★ A ENTREGA NÃO É O PREÇO — guarda ligada em 08/10/2026.
        //
        // ⚠️⚠️ `precoEhEntrega` e `precoDeclarado` existiam desde setembro, com
        // a medição no próprio comentário — *um terço da amostra* põe a entrada
        // do financiamento no campo de preço — e NUNCA FORAM CHAMADAS. O
        // mecanismo estava pronto e o motor passava ao largo dele.
        //
        // É o pior tipo de erro para este produto: a entrega tem valor
        // PLAUSÍVEL de carro, entra na mediana sem levantar suspeita e arrasta
        // a referência do modelo para baixo. Isca de ₲1 a gente vê; entrega de
        // ₲20 milhões num carro de ₲60 milhões, não.
        //
        // ★ Descartar seria desperdício: o preço de verdade quase sempre está
        // escrito na descrição ("Precio: 80.000.000 Gs"). Tenta resgatar
        // primeiro, descarta só quando não há o que resgatar.
        let valorFinal = preco.valor;
        let moedaFinal = preco.moeda;
        let confiancaFinal: string | null = preco.confianca ?? null;

        if (precoEhEntrega(a.descricao ?? "", a.titulo ?? "", preco.valor)) {
          const resgate = precoDeclarado(a.descricao ?? "");
          if (resgate?.ok) {
            valorFinal = resgate.valor;
            moedaFinal = resgate.moeda;
            // ⚠️ Marca a procedência do número: preço resgatado da descrição
            // não tem a mesma força do que veio do campo, e quem montar a
            // tabela precisa poder decidir se aceita.
            confiancaFinal = "resgatado_da_descricao";
            conta.resgatados++;
          } else {
            conta.entregas++;
            await registrarVistoFacebook(id, "preco_e_entrega");
            await dormir(pacing);
            continue;
          }
        }

        // ★★ NORMALIZA NA CAPTAÇÃO, não só no backfill — lacuna vista em
        // 07/10/2026: a rodada agendada trouxe 86 anúncios novos e TODOS
        // entraram sem marca/modelo/segmento, porque só o backfill preenchia
        // essas colunas. Do jeito antigo, cada rodada exigiria um backfill
        // depois, e a tabela de preço viveria sempre desatualizada.
        //
        // ⚠️ Guarda o título cru em `veiculo_bruto` ANTES de gravar o limpo: o
        // dicionário vai melhorar, e sem o original não há como reprocessar.
        const tituloCru = montarVeiculoPadrao(a) || a.titulo || "";
        const norm = normalizarVeiculoPY(tituloCru);

        // ★★ O DICIONÁRIO ENCOSTA NO DADO AQUI — ligado em 08/10/2026.
        //
        // ⚠️⚠️ `conferirAnoModelo` existia desde 05/10 e era chamado só pelo
        // backfill e pelos testes. A captação nunca consultava, então anúncio
        // novo com ano impossível entrava liso e o dicionário não cumpria o
        // que o Gustavo pediu dele: *"já sabermos quando o anúncio está
        // errado"*. Segunda vez no mesmo dia que acho mecanismo pronto fora do
        // caminho quente (a outra foi a guarda de entrega).
        //
        // ⚠️ SINALIZA, NÃO REJEITA. No Paraguai o ano do anúncio pode ser o da
        // IMPORTAÇÃO, não o de fabricação — um "Vitz 2021" pode ser um 2018
        // que entrou por Iquique em 2021. Descartar jogaria fora anúncio bom e
        // calaria justamente o sinal que a gente quer estudar.
        // ⚠️ `a.ano` vem do Facebook e pode chegar como string ("2014"). Number()
        // aqui, porque um ano em texto faria as duas conferências abaixo
        // silenciarem sem erro — o pior desfecho possível para uma validação.
        const anoCru = a.ano ?? norm.ano ?? null;
        const anoNum = anoCru == null || anoCru === "" ? null : Number(anoCru);
        const ano = Number.isFinite(anoNum) ? (anoNum as number) : null;

        const conf = conferirAnoModelo(norm.modelo?.toLowerCase() ?? null, ano);
        const ger = geracaoDoAno(norm.modelo, ano);
        if (conf.aviso) log(`    ⚠️ ${conf.aviso}`);

        const fotos = a.fotos.slice(0, 10);

        // ★★ RE-HOSPEDAR AS FOTOS — lembrado pelo Gustavo em 03/10/2026, e ele
        // estava certo: o link do fbcdn CADUCA (tem `oe=` com validade) e vira
        // 403 em poucos dias. Medido hoje: 175 dos 176 registros paraguaios
        // ainda apontavam para o fbcdn cru, contra 245 de 245 re-hospedados no
        // lado brasileiro. O catálogo PY inteiro ia ficar sem imagem.
        //
        // O mecanismo já existia desde julho (fotosFacebook.ts, sharp → bucket)
        // — o motor paraguaio simplesmente nunca o chamava.
        //
        // ⚠️ DIFERENÇA DELIBERADA EM RELAÇÃO AO BRASIL: lá, falha de
        // re-hospedagem DESCARTA o veículo ("sem foto não entra"). Aqui NÃO.
        // O produto paraguaio é a TABELA DE PREÇO, e o que a alimenta é preço +
        // modelo + ano + km, não a foto. Jogar fora um preço porque a imagem
        // falhou seria perder o dado que importa para salvar a aparência.
        //
        // Mas também não guardo o link cru: ele morre e vira imagem quebrada,
        // que é pior que imagem nenhuma. Sem foto permanente → `null`, e a
        // tela mostra o espaço vazio.
        const itemId = itemIdDoLink(linkPublico(id));
        const reh = !SEM_FOTO && itemId && fotos.length
          ? await rehospedarFotosFacebook(itemId, fotos)
          : null;
        if (!reh && fotos.length) conta.semFoto++;

        const { error } = await supabase.from("opportunities").upsert(
          {
            fonte: "FACEBOOK",
            pais: "PY",
            link_origem: linkPublico(id),
            // Nome limpo quando o catálogo reconhece; o cru quando não — nunca
            // um palpite, que contaminaria a mediana.
            veiculo: norm.marca && norm.modelo
              ? [norm.marca, norm.modelo, norm.ano ?? a.ano].filter(Boolean).join(" ")
              : tituloCru,
            veiculo_bruto: tituloCru,
            marca: norm.marca,
            modelo: norm.modelo,
            segmento: norm.segmento,
            // ★ A chave de agrupamento que faltava para a referência: no
            // Paraguai quase todo ANO tem amostra pequena demais para publicar
            // mediana, e geração junta os anos que são o mesmo carro.
            geracao: ger?.codigo ?? null,
            // ⚠️ SÓ as duas que são erro DO ANÚNCIO. `conferirAnoModelo` também
            // devolve "modelo_sem_faixa" e "ano_ausente", e nenhuma das duas é
            // ano suspeito: a primeira é o NOSSO dicionário que não cobre o
            // modelo (a própria função diz isso no comentário dela), a segunda é
            // anúncio sem ano. Usar `problema !== null` marcou 178 de 306 linhas
            // — 58% — e uma bandeira que acende em mais da metade da base é
            // ruído que ninguém olha.
            ano_suspeito: conf.problema === "antes_de_existir" || conf.problema === "depois_do_fim",
            versao: a.versaoTexto ?? a.motor,
            ano: a.ano,
            cambio: a.cambio,
            km: a.km,
            cidade: a.cidade ?? regiao.nome,
            estado: regiao.uf ?? null,
            preco: valorFinal,
            moeda: moedaFinal,
            procedencia: lerProcedencia(contexto),
            // ⚠️ FIPE e margem ficam NULAS de propósito: no Paraguai não há
            // contra o que comparar até a nossa tabela existir.
            fipe_valor: null,
            margem_percentual: null,
            classificacao: null,
            foto_principal: reh?.foto_principal ?? null,
            fotos_secundarias: reh?.fotos_secundarias ?? [],
            descricao: a.descricao,
            origem_tipo: "descoberta",
            status: "descoberta",
            data_publicacao_origem: a.publicadoEm,
            atributos_olx: {
              ...(mencionaTroca(a.titulo ?? "", a.descricao ?? "")
                ? { aceita_troca: { label: "Aceita troca", value: "Sim" } }
                : {}),
              confianca_moeda: { label: "Confiança da moeda", value: confiancaFinal ?? "simbolo" },
            },
            anunciante_profissional: a.sellerType === "DEALER" ? true : a.sellerType === "PRIVATE_SELLER" ? false : null,
            ultimo_visto: new Date().toISOString(),
          },
          { onConflict: "link_origem" }
        );

        if (error) { conta.erro++; log(`  ✗ ${id}: ${error.message}`); }
        else {
          conta.salvos++;
          await registrarVistoFacebook(id, "salvo");
          log(`  ✓ ${(a.titulo ?? "").slice(0, 40).padEnd(40)} ${preco.moeda} ${preco.valor.toLocaleString("es-PY")} [${preco.confianca}]`);
        }
        await dormir(pacing);
      } catch (e) {
        conta.erro++;
        log(`  ✗ ${id}: ${(e as Error).message}`);
        await dormir(pacing);
      }
    }

    log(`  = ${regiao.nome}: ${conta.salvos} salvos · ${conta.resgatados} resgatados da descrição · ${conta.entregas} era entrega · ${conta.ambiguos} escala ambígua · ${conta.iscas} isca · ${conta.compra} procura · ${conta.desmanche} desmanche · ${conta.semPreco} sem preço · ${conta.erro} erro · ${conta.semFoto} sem foto · ${conta.naoVeiculo} sem ano (modo termo)`);
  };

  for (const regiao of regioes) await varrerRegiao(regiao);

  if (zeradas.length) {
    // ⚠️ Pausa maior antes de repescar. Se a causa for alguma proteção do lado
    // do Facebook, repetir na hora só confirma o padrão; esperar um pouco é a
    // tentativa mais barata de sair da janela ruim.
    log(`\n↻ ${zeradas.length} praça(s) vieram ZERADAS: ${zeradas.map((r) => r.nome).join(", ")} — repescando em 60s`);
    await dormir(60000);
    for (const regiao of zeradas) await varrerRegiao(regiao, true);
  }
}

/**
 * ⚠️⚠️ FECHAR O NAVEGADOR SEMPRE — bug achado em 03/10/2026, e ele matava a
 * captação inteira em silêncio.
 *
 * A varredura da noite TERMINOU o trabalho às 00:35 ("40 salvos") e o processo
 * continuou vivo às 09:5x — 9h30 pendurado. Causa: `fecharContexto()` só era
 * chamado no caminho de sessão inválida; no fim normal o contexto persistente
 * do Playwright ficava aberto, o event loop do Node nunca drenava e o processo
 * nunca saía.
 *
 * O dano real não é o processo parado: é que o Agendador de Tarefas, com
 * "não iniciar nova instância se já estiver em execução", PULA todas as
 * rodadas seguintes. Uma única run pendurada mata o cron de 4h10 para sempre,
 * sem erro em lugar nenhum — o log só para de crescer.
 *
 * `finally` e não `then`: tem que fechar também quando falha, senão o modo de
 * erro deixa o mesmo zumbi.
 */
main()
  .catch((e) => {
    console.error("[py] falha geral:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await fecharContexto().catch(() => {});
    soltarTrava();
  });
