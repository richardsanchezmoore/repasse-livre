import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fetch as undiciFetch } from "undici";
import {
  buscarIdsVistosFacebook,
  finalizarRegistroVarreduraComErro,
  finalizarRegistroVarreduraComSucesso,
  finalizarRunsPresosComoErro,
  garantirCoordenadasCidade,
  iniciarRegistroVarredura,
  registrarDebugVarredura,
  lerConfig,
  linkOrigemJaExiste,
  registrarVistoFacebook,
  salvarOportunidade,
  buscarDuplicataFacebook,
} from "./supabaseClient.js";
import {
  extrairAnuncioFacebook,
  extrairIdsDaBusca,
  geografiaDaBusca,
  financiamentoAssumido,
  fipeInformada,
  montarUrlBuscaFacebook,
  montarVeiculoPadrao,
  precoAvista,
  precoEhEntrada,
  quitacaoFutura,
  riscoDocumentacao,
  type AnuncioFacebook,
  type FiltrosFacebook,
} from "./facebookMarketplaceService.js";
import { rehospedarFotosFacebook, itemIdDoLink } from "./fotosFacebook.js";
import { resolverReferenciaFipeEntrada } from "./fipeService.js";
import { garantirHistoricoFipe } from "./historicoFipe.js";
import { calcularMargemPercentual, classificar, ehElegivel, MARGEM_MINIMA_PADRAO } from "./margin.js";
import type { Classificacao, Oportunidade, ReferenciaFipe } from "./types.js";

/**
 * Motor de Descoberta do FACEBOOK MARKETPLACE. Config 100% no painel "Motor de Busca"
 * (worker_config), ZERO hardcode. Ver project_repasse_livre_facebook_marketplace_motor_descoberta.
 *
 * RADAR POR REGIÃO: cada cron roda UMA região (arg ou env FACEBOOK_REGIAO = rótulo; o raio/
 * geografia estão na URL-base daquela região no painel). O feed vem ordenado por "mais recentes";
 * andamos do topo pra trás pulando o que já vimos (fb_vistos). Cobertura:
 *  - alcançou id já-visto antes do limite → radar EM DIA (cobrimos 100% do intervalo).
 *  - bateu no limite (FACEBOOK_MAX_ITENS) ainda vendo id novo → GAP (radar atrasado).
 * Freio (max itens + pacing) = contrapeso anti-bloqueio no IP de datacenter da Railway.
 *
 * Fetch é LEVE (fetch nativo + headers Chrome, sem browser/proxy/login). Preço-campo do FB
 * pode ser isca de loja → a política (b) DESCARTA loja/isca (extrator) e fica no particular genuíno.
 */

const HEADERS: Record<string, string> = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  // sec-fetch-site FICA "none": testado, "cross-site" faz o FB devolver 400. O Referer do Google
  // (sozinho, com site=none) mantém o 200 E dá o sinal de tráfego ORGÂNICO de busca — camada
  // defensiva pra o IP residencial não ser fichado com o volume/tempo. Ver memória do FB.
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  referer: "https://www.google.com/",
  "upgrade-insecure-requests": "1",
};

// O IP DATACENTER da Railway leva login-wall do FB (confirmado 14/07). Com PROXY_URL setado
// (o MESMO proxy ISP estático da OLX, custo fixo) usamos `curl_chrome116 -x` — caminho PROVADO
// da OLX com esse proxy, + impersonação de TLS de Chrome real (o undici ProxyAgent dá "Request
// was cancelled" com esse proxy). Sem PROXY_URL → fetch direto (funciona só de IP residencial,
// ex.: rodar LOCAL no PC como o ML).
const PROXY_URL = process.env.FACEBOOK_PROXY_URL ?? process.env.PROXY_URL ?? "";
const execFileAsync = promisify(execFile);

async function pega(url: string): Promise<string> {
  if (PROXY_URL) {
    const args = ["-sS", "--connect-timeout", "30", "--max-time", "150", "-x", PROXY_URL, "-H", "accept-language: pt-BR,pt;q=0.9", url];
    try {
      const { stdout } = await execFileAsync("curl_chrome116", args, { maxBuffer: 1024 * 1024 * 20, timeout: 165_000 });
      return stdout;
    } catch (e) {
      // NÃO vazar a senha do proxy (que vem no comando) — só exit code + stderr do curl.
      const err = e as { code?: number | string; killed?: boolean; stderr?: string | Buffer };
      const stderr = (err.stderr ? String(err.stderr) : "").trim().slice(0, 300);
      throw new Error(`curl_chrome116 saiu ${err.code ?? "?"}${err.killed ? " (timeout/killed)" : ""}${stderr ? `: ${stderr}` : ""}`);
    }
  }
  const r = await undiciFetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}
const dormir = (ms: number) => new Promise((res) => setTimeout(res, ms));
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const itemUrl = (id: string) => `https://web.facebook.com/marketplace/item/${id}/?locale=pt_BR`;
const linkPublico = (id: string) => `https://www.facebook.com/marketplace/item/${id}`;

interface Regiao {
  nome: string;
  url: string;
  raio?: string; // km (80/100/250/500); campo do painel. Default 250.
  uf?: string; // estado; entra no slug (cidade-uf) pra ser único entre estados. Ver PainelMotorBusca.
  precoMax?: string; // teto de preço PRÓPRIO da região; vazio → usa o Geral (FACEBOOK_FILTRO_MAX_PRECO).
  paginar?: boolean; // ON → varre em FAIXAS de preço (mais volume, mais fetches leves NA MESMA run).
}

/** Faixa de preço pra "paginação" do FB (fatia a busca; cada faixa = 1 fetch leve). */
interface FaixaPreco {
  min: string;
  max: string; // "" = aberto pra cima (usa o teto da região/Geral)
}

/** Faixas globais de FACEBOOK_FAIXAS_PRECO: "15000-30000,30000-60000,60000-100000,100000-". */
function parseFaixasPreco(raw: string | null | undefined): FaixaPreco[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((seg) => seg.trim())
    .filter(Boolean)
    .map((seg) => {
      const [min, max] = seg.split("-").map((x) => x.trim());
      return { min: min ?? "", max: max ?? "" };
    })
    .filter((f) => f.min || f.max);
}
/** FACEBOOK_REGIAO = slug da cidade + UF (Santa Maria RS ≠ Santa Maria SC). Compatível com o painel. */
const slugRegiao = (r: Regiao): string => [slug(r.nome), r.uf ? r.uf.toLowerCase() : ""].filter(Boolean).join("-");
interface ConfigFb {
  ativo: boolean;
  regioes: Regiao[];
  filtros: FiltrosFacebook;
  faixas: FaixaPreco[]; // faixas de preço globais; aplicadas só nas regiões com paginar=true
  maxItens: number;
  pacingMs: number;
  margemMinima: number;
  margemMaxSuspeita: number; // teto de margem: acima disso, DESCARTA (regra só-FB, ver abaixo)
}

async function carregarConfig(): Promise<ConfigFb> {
  const [ativo, regioesRaw, minPreco, maxPreco, minAno, sort, maxItens, pacing, margem, margemMax, faixasRaw] = await Promise.all([
    lerConfig("FACEBOOK_ATIVO"),
    lerConfig("FACEBOOK_REGIOES"),
    lerConfig("FACEBOOK_FILTRO_MIN_PRECO"),
    lerConfig("FACEBOOK_FILTRO_MAX_PRECO"),
    lerConfig("FACEBOOK_FILTRO_MIN_ANO"),
    lerConfig("FACEBOOK_FILTRO_SORT"),
    lerConfig("FACEBOOK_MAX_ITENS"),
    lerConfig("FACEBOOK_PACING_MS"),
    lerConfig("MARGEM_MINIMA_PERCENTUAL"),
    lerConfig("FACEBOOK_MARGEM_MAX_SUSPEITA"),
    lerConfig("FACEBOOK_FAIXAS_PRECO"),
  ]);
  let regioes: Regiao[] = [];
  try {
    const v = JSON.parse(regioesRaw ?? "[]");
    if (Array.isArray(v)) regioes = v.filter((r) => r?.nome && r?.url);
  } catch {
    /* config inválida → sem regiões */
  }
  return {
    ativo: ativo === "true",
    regioes,
    filtros: {
      minPreco: minPreco ?? "15000",
      maxPreco: maxPreco ?? "400000",
      minAno: minAno ?? "1995",
      sort: sort ?? "creation_time_descend",
    },
    faixas: parseFaixasPreco(faixasRaw),
    maxItens: Number(maxItens ?? 40),
    pacingMs: Number(pacing ?? 1500),
    margemMinima: Number(margem ?? MARGEM_MINIMA_PADRAO),
    margemMaxSuspeita: Number(margemMax ?? 40),
  };
}

/** Modelo pronto pro fuzzy da FIPE (tira ano/motor/câmbio/ruído do texto livre do vendedor). */
function modeloLimpo(a: AnuncioFacebook): string {
  return (a.modelo ?? "")
    .replace(/\b(19|20)?\d{2}\b/g, " ")
    .replace(/\b[0-9]\.[0-9]\b/g, " ")
    .replace(/\b(flex|aut\.?|autom[áa]tico|manual|8v|16v|gasolina|[áa]lcool|completo|b[áa]sico|sedan|hatch)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Caça FIPE tentando CADA motor candidato (título/descrição/estruturado). Usa o
 * resolvedor FB-específico (resolverReferenciaFipeEntrada): guarda de cilindrada
 * dura + versão de ENTRADA (menor valor) quando o vendedor não especifica a versão
 * — o padrão do FB. Sem marca/ano → null. Ver project_repasse_livre_facebook_...
 */
async function resolverFipe(a: AnuncioFacebook): Promise<ReferenciaFipe | null> {
  if (!a.marca || !a.ano) return null;
  const modelo = modeloLimpo(a) || a.modelo || "";
  const motores = [...new Set(a.motorCandidatos.map((c) => c.motor))];
  for (const motor of motores.length ? motores : [""]) {
    // Inclui o TRIM no discriminador: a.versaoTexto + o TÍTULO (onde "Sense"/"Comfort"/"XEI"
    // quase sempre está). Faz o fuzzy escolher o trim certo e SOBREVIVER ao corte top-30 — era
    // o que cortava o HB20 Sense Plus (R$68.537) e deixava o Comfort Plus mais caro (R$74.085).
    // Título é NEUTRO pros guards (cilindrada/combustível extraem por padrão específico) — só ajuda.
    const disc = `${a.versaoTexto ?? ""} ${a.titulo ?? ""} ${motor} ${a.combustivel ?? ""}`.trim();
    const ref = await resolverReferenciaFipeEntrada(a.marca, modelo, a.ano, disc).catch(() => null);
    if (ref) return ref;
  }
  return null;
}

function montarOportunidade(a: AnuncioFacebook, ref: ReferenciaFipe, margem: number, classificacao: Classificacao): Oportunidade {
  const fotos = a.fotos.slice(0, 10);
  // FB não tem atributo estruturado: o leilão detectado na descrição vira has_auction (o mesmo
  // sinal que o Copiloto/BIA leem via atributos_olx). "Sim" dispara o aviso de procedência.
  const atributos: Record<string, { label: string; value: string }> = {};
  if (a.leilao) atributos.has_auction = { label: "Passagem por leilão", value: a.leilao };
  // FIPE assumida como 4P (anúncio não informou portas e o modelo tem 2P e 4P) → o
  // Copiloto avisa pra conferir na foto. Sinal interno (só FB), lido pela BIA.
  if (ref.ressalvaPortas4) atributos.fipe_4p_assumido = { label: "FIPE assumida 4 portas", value: "Sim" };
  return {
    fonte: "FACEBOOK",
    link_origem: linkPublico(a.id),
    veiculo: montarVeiculoPadrao(a) || a.titulo,
    versao: a.versaoTexto ?? a.motor,
    ano: a.ano,
    cambio: a.cambio,
    km: a.km,
    cidade: a.cidade,
    estado: a.estado,
    preco: a.precoCampo ?? 0,
    fipe_valor: ref.valor,
    fipe_data_referencia: ref.mesReferencia,
    fipe_codigo: ref.codigoFipe,
    margem_percentual: Number(margem.toFixed(2)),
    classificacao,
    foto_principal: fotos[0] ?? null,
    fotos_secundarias: fotos.slice(1),
    descricao: a.descricao,
    origem_tipo: "descoberta",
    status: "descoberta",
    // creation_time do FB = quando o VENDEDOR publicou. Antes era null e a página caía no
    // fallback `data_publicacao_origem ?? data_captura`, ou seja, dizia "Anunciado há X" pra
    // hora em que NÓS passamos — mentira sempre que o radar chega atrasado (run em GAP).
    data_publicacao_origem: a.publicadoEm,
    atributos_olx: atributos,
    anunciante_profissional: a.sellerType === "DEALER" ? true : a.sellerType === "PRIVATE_SELLER" ? false : null,
  };
}

async function processarRegiao(regiao: Regiao, cfg: ConfigFb): Promise<void> {
  const AMOSTRA_MINIMA = 5; // com menos cards que isso não dá pra julgar geografia sem falso positivo
  const baseMin = Number(cfg.filtros.minPreco || 0);
  // Teto de preço próprio da região sobrescreve o Geral (vazio → Geral). Praças de
  // alto valor (Balneário Camboriú) pedem régua maior; o resto barra preço-isca.
  const regMax = Number(regiao.precoMax?.trim() || cfg.filtros.maxPreco);

  // ★ PAGINAÇÃO POR FAIXA: só se a região está com `paginar` ligado E há faixas globais.
  // Senão, 1 busca única (comportamento de sempre). As faixas respeitam o piso base
  // (anti preço-isca) e o teto da região. Rodam NA MESMA run — não são crons separados.
  const faixas: Array<{ min: number; max: number }> =
    regiao.paginar && cfg.faixas.length
      ? cfg.faixas
          .map((f) => ({ min: Math.max(Number(f.min || 0), baseMin), max: f.max ? Number(f.max) : regMax }))
          .filter((f) => f.max > f.min)
      : [{ min: baseMin, max: regMax }];

  const urlPrimeira = montarUrlBuscaFacebook(
    regiao.url,
    { ...cfg.filtros, minPreco: String(faixas[0].min), maxPreco: String(faixas[0].max) },
    regiao.raio ?? "250"
  );
  const registroId = await iniciarRegistroVarredura(urlPrimeira, "facebook"); // contém "facebook" → board mostra FACEBOOK
  try {
    const c = { novos: 0, elegiveis: 0, descartados: 0, semFipe: 0, processados: 0 };
    let atingiuLimite = false;
    let alcancouConhecido = false;
    let idsBuscaTotal = 0;
    let geoChecada = false;
    let centroAusente = false;
    let primeiroHtml = "";
    const vistosNaRun = new Set<string>(); // dedup de id ENTRE as faixas da mesma run

    for (const faixa of faixas) {
      const filtros = { ...cfg.filtros, minPreco: String(faixa.min), maxPreco: String(faixa.max) };
      const urlBusca = montarUrlBuscaFacebook(regiao.url, filtros, regiao.raio ?? "250");
      const htmlBusca = await pega(urlBusca);
      if (!primeiroHtml) primeiroHtml = htmlBusca;
      const idsBusca = extrairIdsDaBusca(htmlBusca);
      idsBuscaTotal += idsBusca.length;

      // ★★ GUARDA DE GEOGRAFIA — uma vez, na 1ª faixa com amostra suficiente, ANTES de gastar
      // fetches de item. A URL de região MENTE CALADA: slug que o FB não conhece devolve HTTP
      // 200 com anúncios do local PADRÃO dele (San Francisco). Sem a guarda, uma URL torta no
      // painel ingere carro da Califórnia como se fosse Paraná. Ver a memória do motor do FB.
      if (!geoChecada) {
        const geo = geografiaDaBusca(htmlBusca);
        const uf = regiao.uf?.trim().toUpperCase();
        if (uf && geo.estados.length >= AMOSTRA_MINIMA) {
          geoChecada = true;
          if (!geo.estados.includes(uf)) {
            const vistosEstados = [...new Set(geo.estados)].slice(0, 6).join(", ");
            throw new Error(
              `geografia errada: região "${regiao.nome}" é ${uf}, mas a busca voltou ${geo.estados.length} anúncios e NENHUM é de ${uf} (veio: ${vistosEstados}). ` +
                `Quase certo URL errada no painel. Nada foi ingerido.`
            );
          }
          // Aviso (NÃO derruba a run): a cidade-centro não aparece no próprio feed. Casa por
          // PREFIXO ("sao-paulo-40km" começa com "sao-paulo-") — o user rotula com sufixo.
          const nomeSlug = slug(regiao.nome);
          const ehCentro = (cidade: string) => {
            const cc = slug(cidade);
            return nomeSlug === cc || nomeSlug.startsWith(`${cc}-`);
          };
          if (geo.cidades.length >= AMOSTRA_MINIMA && !geo.cidades.some(ehCentro)) {
            centroAusente = true;
            console.warn(
              `[fb:${regiao.nome}] ⚠ a cidade "${regiao.nome}" não aparece em nenhum dos ${geo.cidades.length} anúncios da busca ` +
                `(veio: ${[...new Set(geo.cidades)].slice(0, 5).join(", ")}). Conferir a URL da região no painel.`
            );
          }
        }
      }

      const vistos = await buscarIdsVistosFacebook(idsBusca);
      const novosIds = idsBusca.filter((id) => !vistos.has(id) && !vistosNaRun.has(id));
      if (novosIds.length < idsBusca.length) alcancouConhecido = true; // havia id conhecido nesta faixa

      let procNaFaixa = 0; // o freio maxItens é POR FAIXA (cada faixa é uma "página")
      for (const id of novosIds) {
        if (procNaFaixa >= cfg.maxItens) {
          atingiuLimite = true;
          break;
        }
        procNaFaixa++;
        vistosNaRun.add(id);
        c.processados++;
        c.novos++;
        let html: string;
        try {
          html = await pega(itemUrl(id));
        } catch (erro) {
          console.warn(`[fb:${regiao.nome}] item ${id} falhou: ${erro instanceof Error ? erro.message : erro}`);
          await dormir(cfg.pacingMs);
          continue;
        }
        const res = extrairAnuncioFacebook(html, id);
        if (res.descartar || !res.anuncio) {
          c.descartados++;
          await registrarVistoFacebook(id, res.motivoDescarte ?? "descartado");
          await dormir(cfg.pacingMs);
          continue;
        }
        const a = res.anuncio;
        if (await linkOrigemJaExiste(linkPublico(id))) {
          await registrarVistoFacebook(id, "salvo");
          await dormir(cfg.pacingMs);
          continue;
        }
        // Documentação de risco (procedência insegura) → descarta sempre.
        if (riscoDocumentacao(a.descricao)) {
          c.descartados++;
          await registrarVistoFacebook(id, "documentacao_risco");
          console.log(`[fb:${regiao.nome}] ⚠ descartado documentação de risco: ${a.marca} ${a.modelo} ${a.ano}`);
          await dormir(cfg.pacingMs);
          continue;
        }
        if (quitacaoFutura(a.descricao)) {
          c.descartados++;
          await registrarVistoFacebook(id, "quitacao_futura");
          console.log(`[fb:${regiao.nome}] ⚠ descartado FUTURA QUITAÇÃO/QF (preço é só entrada + assume financiamento): ${a.marca} ${a.modelo} ${a.ano}`);
          await dormir(cfg.pacingMs);
          continue;
        }
        // VÁLVULA DE ESCAPE: se a descrição disclosa um valor "à vista" > preço anunciado,
        // o preço-campo era a ENTRADA → corrige pro valor total e NÃO descarta como isca.
        const avista = precoAvista(a.descricao, a.precoCampo ?? null);
        if (avista) {
          console.log(`[fb:${regiao.nome}] ✎ preço corrigido p/ à vista R$${avista} (campo era entrada R$${a.precoCampo}): ${a.marca} ${a.modelo} ${a.ano}`);
          a.precoCampo = avista;
        } else {
          // Sem à vista salvando → descarta preço-isca ("de entrada" / "assumir financiamento").
          if (precoEhEntrada(a.descricao, a.precoCampo ?? null)) {
            c.descartados++;
            await registrarVistoFacebook(id, "preco_entrada");
            console.log(`[fb:${regiao.nome}] ⚠ descartado preço=entrada (R$${a.precoCampo}): ${a.marca} ${a.modelo} ${a.ano}`);
            await dormir(cfg.pacingMs);
            continue;
          }
          if (financiamentoAssumido(a.descricao)) {
            c.descartados++;
            await registrarVistoFacebook(id, "financiamento_assumido");
            console.log(`[fb:${regiao.nome}] ⚠ descartado assumir financiamento (preço só a dívida): ${a.marca} ${a.modelo} ${a.ano}`);
            await dormir(cfg.pacingMs);
            continue;
          }
        }
        const ref = await resolverFipe(a);
        if (!ref) {
          c.semFipe++;
          await registrarVistoFacebook(id, "sem_fipe");
          await dormir(cfg.pacingMs);
          continue;
        }
        // Âncora de sanidade: a FIPE que casamos MUITO acima da que o anunciante declara na
        // descrição = casamos versão/modelo errado (margem inflada — pecado capital pra a
        // credibilidade). Melhor pular que mostrar ganho falso. Só corta quando INFLA (casar
        // abaixo é conservador). Caso Sandero: declara 41.300, casamos 52.854 (+28%).
        const fipeDecl = fipeInformada(a.descricao);
        if (fipeDecl && ref.valor > fipeDecl * 1.12) {
          c.descartados++;
          await registrarVistoFacebook(id, "fipe_divergente");
          console.log(`[fb:${regiao.nome}] ⚠ descartado FIPE divergente: casamos R$${ref.valor} vs R$${fipeDecl} declarada (+${(((ref.valor / fipeDecl) - 1) * 100).toFixed(0)}%): ${a.marca} ${a.modelo} ${a.ano}`);
          await dormir(cfg.pacingMs);
          continue;
        }
        const margem = calcularMargemPercentual(a.precoCampo ?? 0, ref.valor);
        // ★ REGRA SÓ-FB: margem alta demais = quase certo FALSO ALARME (FIPE em versão errada
        // ou preço que esconde parte do valor). Margem ILUSÓRIA → descarta. Teto config (40%).
        if (margem > cfg.margemMaxSuspeita) {
          c.descartados++;
          await registrarVistoFacebook(id, "margem_suspeita");
          console.log(`[fb:${regiao.nome}] ⚠ descartado margem ${margem.toFixed(0)}% > ${cfg.margemMaxSuspeita}% (provável FIPE errada/preço oculto): ${a.marca} ${a.modelo} ${a.ano}`);
          await dormir(cfg.pacingMs);
          continue;
        }
        const classificacao = ehElegivel(margem, cfg.margemMinima) ? classificar(margem, cfg.margemMinima) : null;
        if (!classificacao) {
          c.descartados++;
          await registrarVistoFacebook(id, "acima_fipe");
          await dormir(cfg.pacingMs);
          continue;
        }
        // Anti-duplicata do FB: a mesma loja republica o MESMO carro em vários perfis, na MESMA
        // cidade. Chave veículo+preço+CIDADE (sem KM). Preserva o que já está. Ver buscarDuplicataFacebook.
        const op = montarOportunidade(a, ref, margem, classificacao);
        if (op.cidade) {
          const dup = await buscarDuplicataFacebook(op.veiculo, op.preco, op.cidade);
          if (dup && dup.link_origem !== op.link_origem) {
            console.log(`[fb:${regiao.nome}] ⧉ duplicata de "${op.veiculo}" R$${op.preco} em ${op.cidade} (já na plataforma via ${dup.link_origem}) — descartado.`);
            await registrarVistoFacebook(id, "duplicado");
            await dormir(cfg.pacingMs);
            continue;
          }
        }
        // Re-hospeda as fotos ANTES de salvar (fbcdn expira em dias → 403). foto_principal
        // SEMPRE permanente; extras cruas ficam nas secundárias (somem ao expirar, via limpeza).
        // REGRA: veículo SEM FOTO não entra. Sem foto ou re-hospedagem falhou → DESCARTA
        // (não salva foto crua que vai quebrar). Não marca "salvo" — se foi blip, re-tenta depois.
        const itemId = itemIdDoLink(op.link_origem);
        const reh = itemId && op.foto_principal ? await rehospedarFotosFacebook(itemId, [op.foto_principal, ...op.fotos_secundarias]) : null;
        if (!reh) {
          c.descartados++;
          await registrarVistoFacebook(id, "sem_foto");
          console.log(`[fb:${regiao.nome}] ⚠ descartado SEM FOTO (re-hospedagem falhou): ${a.marca} ${a.modelo} ${a.ano}`);
          await dormir(cfg.pacingMs);
          continue;
        }
        op.foto_principal = reh.foto_principal;
        op.fotos_secundarias = reh.fotos_secundarias;
        await salvarOportunidade(op);
        c.elegiveis++;
        await registrarVistoFacebook(id, "salvo");
        await garantirHistoricoFipe(ref.codigoFipe, ref.anoModelo);
        if (a.cidade && a.estado) await garantirCoordenadasCidade(a.cidade, a.estado);
        console.log(`[fb:${regiao.nome}] ✓ ${a.marca} ${a.modelo} ${a.ano} R$${a.precoCampo} (+${margem.toFixed(0)}% FIPE, ${a.fotos.length} fotos)`);
        await dormir(cfg.pacingMs);
      }
    }

    // Busca vazia em TODAS as faixas (0 IDs) apesar do 200 = provável bloqueio "mole" do
    // datacenter (login-wall/consent). Captura o 1º HTML pra diagnosticar o que a Railway recebeu.
    if (idsBuscaTotal === 0) {
      await registrarDebugVarredura(
        "FB_DEBUG_BUSCA_VAZIA",
        JSON.stringify({
          em: new Date().toISOString(),
          regiao: regiao.nome,
          url: urlPrimeira,
          tamanho: primeiroHtml.length,
          loginWall: /você precisa fazer login|entrar no facebook|log in to continue|iniciar sessão|entre para ver/i.test(primeiroHtml),
          temListing: primeiroHtml.includes("GroupCommerceProductItem"),
          temMarketplace: primeiroHtml.includes("marketplace"),
          inicio: primeiroHtml.slice(0, 1600),
          fim: primeiroHtml.slice(-1600),
        })
      );
    }

    // Cobertura do radar (a métrica que o user quer): em dia vs gap.
    const cobertura = atingiuLimite
      ? `GAP — limite ${cfg.maxItens}/faixa atingido (radar atrasado)`
      : alcancouConhecido
        ? "em dia (alcançou já-visto)"
        : idsBuscaTotal === 0
          ? "busca vazia (conferir bloqueio/URL)"
          : c.processados === 0
            ? "nada novo desde o último run"
            : "tudo novo (provável 1ª run/feed rápido)";
    const faixasLabel = faixas.length > 1 ? `${faixas.length} faixas · ` : "";
    const alertaCentro = centroAusente ? ` · ⚠ "${regiao.nome}" não apareceu no próprio feed — conferir a URL da região` : "";
    const observacao = `${regiao.nome} · ${faixasLabel}${c.processados}/${idsBuscaTotal} processados · ${cobertura}${alertaCentro}`;
    await finalizarRegistroVarreduraComSucesso(registroId, { novos: c.novos, elegiveis: c.elegiveis, descartados: c.descartados, semFipe: c.semFipe }, observacao);
    console.log(`[fb:${regiao.nome}] ${observacao} | ${c.elegiveis} oportunidades salvas`);
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro);
    await finalizarRegistroVarreduraComErro(registroId, msg);
    throw erro;
  }
}

async function main(): Promise<void> {
  const cfg = await carregarConfig();
  if (!cfg.ativo) {
    console.log("[fb] Facebook desativado no painel (FACEBOOK_ATIVO ≠ true). Nada a fazer.");
    return;
  }
  await finalizarRunsPresosComoErro();

  // Seleção de região: argumento CLI > env FACEBOOK_REGIAO (rótulo) > TODAS (fallback local/single).
  const alvo = (process.argv[2] ?? process.env.FACEBOOK_REGIAO ?? "").trim();
  const regioes = alvo ? cfg.regioes.filter((r) => slugRegiao(r) === slug(alvo)) : cfg.regioes;
  if (regioes.length === 0) {
    console.warn(alvo ? `[fb] região "${alvo}" não encontrada no painel.` : "[fb] nenhuma região configurada no painel.");
    return;
  }
  console.log(
    `[fb] rodando ${regioes.length} região(ões): ${regioes.map((r) => r.nome).join(", ")} | filtros ${cfg.filtros.minAno}+ / R$${cfg.filtros.minPreco}-${cfg.filtros.maxPreco} | freio ${cfg.maxItens} itens/run, pacing ${cfg.pacingMs}ms | proxy: ${PROXY_URL ? "SIM (" + PROXY_URL.replace(/:[^:@/]+@/, ":***@") + ")" : "não (fetch direto)"}`
  );
  for (const r of regioes) {
    try {
      await processarRegiao(r, cfg);
    } catch (erro) {
      console.error(`[fb] região ${r.nome} falhou:`, erro instanceof Error ? erro.message : erro);
    }
  }
}

main().catch((erro) => {
  console.error("[fb] falha geral:", erro);
  process.exitCode = 1;
});
