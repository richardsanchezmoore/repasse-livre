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
const log = (...a: unknown[]) => console.log(new Date().toLocaleTimeString("pt-BR"), ...a);

async function baixar(url: string): Promise<string> {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

/** ⚠️ O ₲ chega escapado no JSON do FB. Ver desescapar() em precoParaguai. */
const itemUrl = (id: string) => `https://www.facebook.com/marketplace/item/${id}/?locale=es_LA`;
const linkPublico = (id: string) => `https://www.facebook.com/marketplace/item/${id}`;

async function main() {
  const alvo = process.argv[2];
  const [regioesRaw, minPreco, maxPreco, minAno, maxItensRaw, pacingRaw] = await Promise.all([
    lerConfig("FACEBOOK_REGIOES"),
    lerConfig("FACEBOOK_FILTRO_MIN_PRECO"),
    lerConfig("FACEBOOK_FILTRO_MAX_PRECO"),
    lerConfig("FACEBOOK_FILTRO_MIN_ANO"),
    lerConfig("FACEBOOK_MAX_ITENS"),
    lerConfig("FACEBOOK_PACING_MS"),
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
  log(`praças: ${regioes.map((r) => r.nome).join(", ")} | minPrice=${filtros.minPreco || "(sem)"} | ano>=${filtros.minAno || "(sem)"} | teto ${maxItens}/praça`);

  for (const regiao of regioes) {
    const marca = slugRegiao(regiao);
    const url = montarUrlBuscaFacebook(regiao.url, filtros, regiao.raio ?? "60");
    log(`\n▶ ${regiao.nome} (${marca})`);

    let html: string;
    try {
      html = await baixar(url);
    } catch (e) {
      log(`  ✗ busca falhou: ${(e as Error).message}`);
      continue;
    }

    const ids = extrairIdsDaBusca(html);
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
