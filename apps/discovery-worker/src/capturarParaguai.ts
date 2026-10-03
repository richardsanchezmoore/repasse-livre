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
import {
  HEADERS,
  extrairAnuncioFacebook,
  extrairIdsDaBusca,
  montarUrlBuscaFacebook,
  montarVeiculoPadrao,
} from "./facebookMarketplaceService.js";
import { lerPrecoComContexto, lerProcedencia, ehAnuncioDeCompra, mencionaTroca } from "./precoParaguai.js";
import { baixarLogado, sessaoValida, fecharContexto, SessaoExpirada } from "./navegadorFacebook.js";
import {
  buscarIdsVistosFacebook,
  lerConfig,
  registrarVistoFacebook,
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

async function main() {
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

  const maxItens = Number(maxItensRaw ?? 40);
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

  log(`praças: ${regioes.map((r) => r.nome).join(", ")} | minPrice=${filtros.minPreco || "(sem)"} | ano>=${filtros.minAno || "(sem)"} | teto ${maxItens}/praça`);

  for (const regiao of regioes) {
    const marca = slugRegiao(regiao);
    log(`\n▶ ${regiao.nome} (${marca}) — ${faixas.length} faixa(s) de preço`);

    // ⚠️ Dedup ENTRE as faixas da mesma rodada: as bordas se tocam e o mesmo
    // anúncio aparece em duas. Sem isto, o relatório conta o dobro e o livro-
    // razão leva escrita à toa.
    const vistosNaRodada = new Set<string>();
    const ids: string[] = [];

    for (const faixa of faixas) {
      const url = montarUrlBuscaFacebook(
        regiao.url,
        { ...filtros, minPreco: String(faixa.min), maxPreco: String(faixa.max) },
        regiao.raio ?? "60"
      );
      let htmlFaixa: string;
      try {
        htmlFaixa = await baixar(url);
      } catch (e) {
        log(`  ✗ faixa ${faixa.min}-${faixa.max} falhou: ${(e as Error).message}`);
        continue;
      }
      const novosDaFaixa = extrairIdsDaBusca(htmlFaixa).filter((id) => !vistosNaRodada.has(id));
      novosDaFaixa.forEach((id) => vistosNaRodada.add(id));
      ids.push(...novosDaFaixa);
      log(`    faixa ${faixa.min.toLocaleString("pt-BR")}–${faixa.max.toLocaleString("pt-BR")}: ${novosDaFaixa.length} novo(s) na faixa`);
      // ⚠️ Pausa ENTRE faixas: são várias buscas seguidas na mesma praça, e é
      // justamente o padrão que mais chama atenção. O pacing do painel vale
      // aqui também.
      await dormir(pacing);
    }

    if (!ids.length) {
      log("  0 na página · 0 novos");
      continue;
    }
    const jaVistos = await buscarIdsVistosFacebook(ids);
    const novos = ids.filter((id) => !jaVistos.has(id)).slice(0, maxItens);
    log(`  ${ids.length} na página · ${novos.length} novos`);

    const conta = { salvos: 0, ambiguos: 0, iscas: 0, compra: 0, semPreco: 0, erro: 0 };

    for (const id of novos) {
      try {
        const detalhe = await baixar(itemUrl(id));
        // ★ SEM exigir cilindrada: no Paraguai não há FIPE para casar e essa
        // regra derrubava 6 de cada 10 anúncios.
        const { anuncio: a } = extrairAnuncioFacebook(detalhe, id, { exigirMotor: false });
        if (!a) { conta.erro++; await registrarVistoFacebook(id, "sem_parse"); await dormir(pacing); continue; }

        const contexto = `${a.titulo ?? ""} ${a.descricao ?? ""}`;
        if (ehAnuncioDeCompra(a.titulo ?? "", a.descricao ?? "")) {
          conta.compra++;
          await registrarVistoFacebook(id, "anuncio_de_compra");
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

        const fotos = a.fotos.slice(0, 10);
        const { error } = await supabase.from("opportunities").upsert(
          {
            fonte: "FACEBOOK",
            pais: "PY",
            link_origem: linkPublico(id),
            veiculo: montarVeiculoPadrao(a) || a.titulo,
            versao: a.versaoTexto ?? a.motor,
            ano: a.ano,
            cambio: a.cambio,
            km: a.km,
            cidade: a.cidade ?? regiao.nome,
            estado: regiao.uf ?? null,
            preco: preco.valor,
            moeda: preco.moeda,
            procedencia: lerProcedencia(contexto),
            // ⚠️ FIPE e margem ficam NULAS de propósito: no Paraguai não há
            // contra o que comparar até a nossa tabela existir.
            fipe_valor: null,
            margem_percentual: null,
            classificacao: null,
            foto_principal: fotos[0] ?? null,
            fotos_secundarias: fotos.slice(1),
            descricao: a.descricao,
            origem_tipo: "descoberta",
            status: "descoberta",
            data_publicacao_origem: a.publicadoEm,
            atributos_olx: {
              ...(mencionaTroca(a.titulo ?? "", a.descricao ?? "")
                ? { aceita_troca: { label: "Aceita troca", value: "Sim" } }
                : {}),
              confianca_moeda: { label: "Confiança da moeda", value: preco.confianca ?? "simbolo" },
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

    log(`  = ${regiao.nome}: ${conta.salvos} salvos · ${conta.ambiguos} escala ambígua · ${conta.iscas} isca · ${conta.compra} procura · ${conta.semPreco} sem preço · ${conta.erro} erro`);
  }
}

main().catch((e) => {
  console.error("[py] falha geral:", e);
  process.exitCode = 1;
});
