import "dotenv/config";
import { fetch as undiciFetch, ProxyAgent } from "undici";
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
} from "./supabaseClient.js";
import {
  extrairAnuncioFacebook,
  extrairIdsDaBusca,
  montarUrlBuscaFacebook,
  montarVeiculoPadrao,
  type AnuncioFacebook,
  type FiltrosFacebook,
} from "./facebookMarketplaceService.js";
import { buscarReferenciaFipe } from "./fipeService.js";
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
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
};

// Proxy opcional: o IP DATACENTER da Railway leva login-wall do FB (confirmado 14/07). Roteando
// por um proxy de IP residencial/ISP (o mesmo PROXY_URL estático da OLX, custo fixo) o FB serve o
// Marketplace real. Sem PROXY_URL → fetch direto (funciona só de IP residencial, ex.: rodar local).
const PROXY_URL = process.env.FACEBOOK_PROXY_URL ?? process.env.PROXY_URL ?? "";
const dispatcher = PROXY_URL ? new ProxyAgent(PROXY_URL) : undefined;

async function pega(url: string): Promise<string> {
  try {
    const r = await undiciFetch(url, { headers: HEADERS, dispatcher });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  } catch (e) {
    // undici embrulha o motivo real em `.cause` (ECONNREFUSED, cert, tunnel, timeout…) —
    // "fetch failed" sozinho não diz nada. Expõe a causa pra diagnosticar o proxy.
    const causa = (e as { cause?: { code?: string; message?: string } })?.cause;
    const detalhe = causa ? `${causa.code ?? ""} ${causa.message ?? ""}`.trim() : "";
    throw new Error(`fetch falhou${detalhe ? ` [${detalhe}]` : ""}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
const dormir = (ms: number) => new Promise((res) => setTimeout(res, ms));
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const itemUrl = (id: string) => `https://web.facebook.com/marketplace/item/${id}/?locale=pt_BR`;
const linkPublico = (id: string) => `https://www.facebook.com/marketplace/item/${id}`;

interface Regiao {
  nome: string;
  url: string;
  raio?: string; // km (80/100/250/500); campo do painel. Default 250.
}
interface ConfigFb {
  ativo: boolean;
  regioes: Regiao[];
  filtros: FiltrosFacebook;
  maxItens: number;
  pacingMs: number;
  margemMinima: number;
}

async function carregarConfig(): Promise<ConfigFb> {
  const [ativo, regioesRaw, minPreco, maxPreco, minAno, sort, maxItens, pacing, margem] = await Promise.all([
    lerConfig("FACEBOOK_ATIVO"),
    lerConfig("FACEBOOK_REGIOES"),
    lerConfig("FACEBOOK_FILTRO_MIN_PRECO"),
    lerConfig("FACEBOOK_FILTRO_MAX_PRECO"),
    lerConfig("FACEBOOK_FILTRO_MIN_ANO"),
    lerConfig("FACEBOOK_FILTRO_SORT"),
    lerConfig("FACEBOOK_MAX_ITENS"),
    lerConfig("FACEBOOK_PACING_MS"),
    lerConfig("MARGEM_MINIMA_PERCENTUAL"),
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
    maxItens: Number(maxItens ?? 40),
    pacingMs: Number(pacing ?? 1500),
    margemMinima: Number(margem ?? MARGEM_MINIMA_PADRAO),
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

/** Caça FIPE tentando CADA motor candidato (título/descrição/estruturado). Sem marca/ano → null. */
async function resolverFipe(a: AnuncioFacebook): Promise<ReferenciaFipe | null> {
  if (!a.marca || !a.ano) return null;
  const modelo = modeloLimpo(a) || a.modelo || "";
  const motores = [...new Set(a.motorCandidatos.map((c) => c.motor))];
  for (const motor of motores.length ? motores : [""]) {
    const ref = await buscarReferenciaFipe(a.marca, modelo, a.ano, `${motor} ${a.combustivel ?? ""}`.trim()).catch(() => null);
    if (ref) return ref;
  }
  return null;
}

function montarOportunidade(a: AnuncioFacebook, ref: ReferenciaFipe, margem: number, classificacao: Classificacao): Oportunidade {
  const fotos = a.fotos.slice(0, 10);
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
    data_publicacao_origem: null,
    atributos_olx: {},
    anunciante_profissional: a.sellerType === "DEALER" ? true : a.sellerType === "PRIVATE_SELLER" ? false : null,
  };
}

async function processarRegiao(regiao: Regiao, cfg: ConfigFb): Promise<void> {
  const urlBusca = montarUrlBuscaFacebook(regiao.url, cfg.filtros, regiao.raio ?? "250"); // contém "facebook" → board mostra fonte FACEBOOK
  const registroId = await iniciarRegistroVarredura(urlBusca, "facebook");
  try {
    const htmlBusca = await pega(urlBusca);
    const idsBusca = extrairIdsDaBusca(htmlBusca);
    // Busca vazia (0 IDs) apesar do 200 = provável bloqueio "mole" do datacenter (login-wall/
    // consent/página degradada). Captura o HTML pra diagnosticar DAQUI o que a Railway recebeu.
    if (idsBusca.length === 0) {
      await registrarDebugVarredura(
        "FB_DEBUG_BUSCA_VAZIA",
        JSON.stringify({
          em: new Date().toISOString(),
          regiao: regiao.nome,
          url: urlBusca,
          tamanho: htmlBusca.length,
          loginWall: /você precisa fazer login|entrar no facebook|log in to continue|iniciar sessão|entre para ver/i.test(htmlBusca),
          temListing: htmlBusca.includes("GroupCommerceProductItem"),
          temMarketplace: htmlBusca.includes("marketplace"),
          inicio: htmlBusca.slice(0, 1600),
          fim: htmlBusca.slice(-1600),
        })
      );
    }
    const vistos = await buscarIdsVistosFacebook(idsBusca);
    const novosIds = idsBusca.filter((id) => !vistos.has(id));
    const alcancouConhecido = novosIds.length < idsBusca.length; // já havia id conhecido na página

    let novos = 0;
    let elegiveis = 0;
    let descartados = 0;
    let semFipe = 0;
    let processados = 0;
    let atingiuLimite = false;

    for (const id of novosIds) {
      if (processados >= cfg.maxItens) {
        atingiuLimite = true;
        break;
      }
      processados++;
      novos++;
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
        descartados++;
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
      const ref = await resolverFipe(a);
      if (!ref) {
        semFipe++;
        await registrarVistoFacebook(id, "sem_fipe");
        await dormir(cfg.pacingMs);
        continue;
      }
      const margem = calcularMargemPercentual(a.precoCampo ?? 0, ref.valor);
      const classificacao = ehElegivel(margem, cfg.margemMinima) ? classificar(margem, cfg.margemMinima) : null;
      if (!classificacao) {
        descartados++;
        await registrarVistoFacebook(id, "acima_fipe");
        await dormir(cfg.pacingMs);
        continue;
      }
      await salvarOportunidade(montarOportunidade(a, ref, margem, classificacao));
      elegiveis++;
      await registrarVistoFacebook(id, "salvo");
      await garantirHistoricoFipe(ref.codigoFipe, ref.anoModelo);
      if (a.cidade && a.estado) await garantirCoordenadasCidade(a.cidade, a.estado);
      console.log(`[fb:${regiao.nome}] ✓ ${a.marca} ${a.modelo} ${a.ano} R$${a.precoCampo} (+${margem.toFixed(0)}% FIPE, ${a.fotos.length} fotos)`);
      await dormir(cfg.pacingMs);
    }

    // Cobertura do radar (a métrica que o user quer): em dia vs gap.
    const cobertura = atingiuLimite
      ? `GAP — limite ${cfg.maxItens} atingido, ${novosIds.length - processados} novos não cobertos (radar atrasado)`
      : alcancouConhecido
        ? "em dia (alcançou já-visto)"
        : novosIds.length === 0
          ? "nada novo desde o último run"
          : "página toda nova (sem já-visto — provável 1ª run/feed rápido)";
    const observacao = `${regiao.nome} · ${processados}/${idsBusca.length} processados · ${cobertura}`;
    await finalizarRegistroVarreduraComSucesso(registroId, { novos, elegiveis, descartados, semFipe }, observacao);
    console.log(`[fb:${regiao.nome}] ${observacao} | ${elegiveis} oportunidades salvas`);
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
  const regioes = alvo ? cfg.regioes.filter((r) => slug(r.nome) === slug(alvo)) : cfg.regioes;
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
