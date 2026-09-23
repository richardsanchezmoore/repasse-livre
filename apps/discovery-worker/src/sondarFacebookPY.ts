/**
 * Sonda de captação do Facebook Marketplace no PARAGUAI — extração direta,
 * sem cron, sem gravar nada no banco.
 *
 * ★ Pedido do Gustavo (23/09): "fazer extração direta sem o CRON por ora é o
 * mais correto". Antes de agendar qualquer coisa, olhar com os próprios olhos
 * o que volta de Ciudad del Este. Agendar primeiro e descobrir depois foi como
 * o motor brasileiro nasceu, e saiu mais caro.
 *
 * Só LÊ. Não escreve no banco, não avança cadência, não marca nada.
 *
 * Uso:  npx tsx src/sondarFacebookPY.ts
 */
import { HEADERS, montarUrlBuscaFacebook, extrairIdsDaBusca, extrairAnuncioFacebook } from "./facebookMarketplaceService.js";
import { lerPreco, lerProcedencia, ehAnuncioDeCompra } from "./precoParaguai.js";

const URL_BASE =
  process.argv[2] ??
  "https://www.facebook.com/marketplace/108383999186596/carros/?exact=0&locale=es_LA";

/** Quantos anúncios abrir em detalhe. Pouco de propósito: é sonda, não varredura. */
const AMOSTRA = 10;

async function baixar(url: string): Promise<string> {
  // ⚠️ USA O MESMO BLOCO DE CABEÇALHOS DO SCRAPER. A primeira versão desta
  // sonda mandava só o user-agent e levou HTTP 400 nas duas máquinas — e me
  // fez suspeitar de bloqueio de IP quando o aviso já estava no código: sem o
  // conjunto de sec-fetch/sec-ch-ua, o Facebook recusa.
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

/**
 * ⚠️ O JSON do Facebook vem com ESCAPE UNICODE: o símbolo do guarani chega
 * como a sequência literal `₲`, não como "₲". Na primeira rodada isso
 * fez `₲110.000.000` ser lido como **202.110.000.000** — o "20b2" do
 * escape virou dígito e o preço ganhou três casas. Decodificar antes de
 * qualquer leitura é obrigatório, não cosmético.
 */
function decodificar(s: string): string {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log("🔎 SONDA — Facebook Marketplace Paraguai (só leitura)\n");

  const semFiltro = { minPreco: "", maxPreco: "", minAno: "", sort: "creation_time_descend" };
  const urlFinal = montarUrlBuscaFacebook(URL_BASE, semFiltro, "60");
  console.log("URL composta:\n  " + urlFinal + "\n");

  let html: string;
  try {
    html = await baixar(urlFinal);
  } catch (e) {
    console.error("❌ não consegui baixar a busca:", (e as Error).message);
    process.exit(1);
  }

  const ids = extrairIdsDaBusca(html);
  console.log(`📋 ${ids.length} anúncio(s) na primeira página\n`);
  if (!ids.length) { console.log("⚠️ Zero — o FB devolveu login ou a URL não é de listagem."); process.exit(1); }

  const moedas: Record<string, number> = {};
  const cidades: Record<string, number> = {};
  const motivos: Record<string, number> = {};
  const procedencias: Record<string, number> = {};
  let compras = 0;

  for (const id of ids.slice(0, AMOSTRA)) {
    try {
      const detalhe = await baixar(`https://www.facebook.com/marketplace/item/${id}/?locale=es_LA`);
      const r = extrairAnuncioFacebook(detalhe, id);
      const a = r.anuncio;

      if (!a) {
        // ★ Saber POR QUE não leu vale mais que o número de falhas. O extrator
        // brasileiro descarta o que não serve para a FIPE (sem motor, sem
        // modelo) — e no Paraguai isso pode estar jogando fora anúncio bom.
        const motivo = (r as { motivo?: string }).motivo ?? "(sem motivo)";
        motivos[motivo] = (motivos[motivo] ?? 0) + 1;
        console.log(`  ✗ ${id} — descartado pelo extrator: ${motivo}`);
        await dormir(2500);
        continue;
      }

      // Bloco de preço CRU do JSON, para entender o formato em vez de adivinhar.
      const blocoPreco = detalhe.match(/"listing_price":\{[^}]{0,220}\}/)?.[0] ?? "";
      const txt = decodificar(detalhe.match(/"formatted_price":\{"text":"([^"]+)"/)?.[1] ?? "");
      const moedaFb = blocoPreco.match(/"currency":"([A-Z]{3})"/)?.[1] ?? null;
      const comOffset = blocoPreco.match(/"amount_with_offset":"(\d+)"/)?.[1] ?? null;
      const amount = blocoPreco.match(/"amount":"([\d.]+)"/)?.[1] ?? null;

      const preco = lerPreco(txt);
      const proc = lerProcedencia(`${a.titulo ?? ""} ${a.descricao ?? ""}`);
      const compra = ehAnuncioDeCompra(a.titulo ?? "", a.descricao ?? "");

      if (preco.ok) moedas[preco.moeda] = (moedas[preco.moeda] ?? 0) + 1;
      else moedas["✗ " + preco.motivo] = (moedas["✗ " + preco.motivo] ?? 0) + 1;
      procedencias[proc] = (procedencias[proc] ?? 0) + 1;
      const cid = a.cidade ?? "(sem cidade)";
      cidades[cid] = (cidades[cid] ?? 0) + 1;
      if (compra) compras++;

      const etiqueta = preco.ok
        ? `${preco.moeda} ${preco.valor.toLocaleString("es-PY")}${preco.corrigido ? " ⚠️corrigido" : ""}`
        : `❌ ${preco.motivo}`;
      console.log(`  • ${(a.titulo ?? "sem título").slice(0, 44).padEnd(44)} | ${etiqueta.padEnd(22)} | ${proc}${compra ? " | 🚩COMPRA" : ""}`);
      console.log(`      texto: "${txt}" | currency: ${moedaFb ?? "—"} | with_offset: ${comOffset ?? "—"} | amount: ${amount ?? "—"}`);
      console.log(`      precoCampo do extrator: ${a.precoCampo ?? "—"}  ← se estiver /100, é o bug do centavo`);
      console.log(`      ano: ${a.ano ?? "—"} | cidade: ${cid}`);

      await dormir(2500);
    } catch (e) {
      console.log(`  ✗ ${id} — erro: ${(e as Error).message}`);
    }
  }

  console.log("\n===== RESUMO =====");
  console.log("moedas lidas: ", moedas);
  console.log("procedência:  ", procedencias);
  console.log("cidades:      ", cidades);
  console.log("descartes do extrator:", motivos);
  console.log("anúncios de compra:", compras);
  console.log("\n⚠️ Repare nas CIDADES: o raio de 65km de Ciudad del Este alcança");
  console.log("   Foz do Iguaçu. Vai entrar anúncio brasileiro, em real, na base");
  console.log("   paraguaia — outro mercado e outra moeda na mesma tabela.");
})();
