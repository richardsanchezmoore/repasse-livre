/**
 * Sonda de captação do Facebook Marketplace no PARAGUAI — extração direta,
 * sem cron, sem gravar nada no banco.
 *
 * ★ Pedido do Gustavo (23/09): "fazer extração direta sem o CRON por ora é o
 * mais correto". Antes de agendar qualquer coisa, olhar com os próprios olhos
 * o que volta de Ciudad del Este: quantos anúncios, em que moeda, com que
 * cara. Agendar primeiro e descobrir depois é como o motor brasileiro nasceu
 * e foi mais caro.
 *
 * Só LÊ. Não escreve no banco, não avança cadência, não marca nada.
 *
 * Uso:  npx tsx src/sondarFacebookPY.ts "<url-base>"
 */
import { montarUrlBuscaFacebook, extrairIdsDaBusca, extrairAnuncioFacebook } from "./facebookMarketplaceService.js";
import { lerPreco, lerProcedencia, ehAnuncioDeCompra } from "./precoParaguai.js";

const UA_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const URL_BASE =
  process.argv[2] ??
  "https://www.facebook.com/marketplace/108383999186596/carros/?exact=0&locale=es_LA";

/** Quantos anúncios abrir em detalhe. Pouco de propósito: é sonda, não varredura. */
const AMOSTRA = 8;

async function baixar(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: {
      "user-agent": UA_CHROME,
      "accept-language": "es-PY,es;q=0.9,pt-BR;q=0.8",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log("🔎 SONDA — Facebook Marketplace Paraguai (só leitura)\n");
  console.log("URL-base do painel:");
  console.log("  " + URL_BASE + "\n");

  // ⚠️ SEM FILTRO DE PREÇO. Os campos do painel estão vazios porque preço
  // paraguaio não cabe na régua brasileira — e é justamente isso que a sonda
  // precisa provar: quanto volta quando ninguém filtra.
  const semFiltro = { minPreco: "", maxPreco: "", minAno: "", sort: "creation_time_descend" };
  const urlFinal = montarUrlBuscaFacebook(URL_BASE, semFiltro, "60");
  console.log("URL composta pelo worker:");
  console.log("  " + urlFinal + "\n");

  let html: string;
  try {
    html = await baixar(urlFinal);
  } catch (e) {
    console.error("❌ não consegui baixar a busca:", (e as Error).message);
    console.error("   (do Paraguai, com IP residencial, costuma passar; de datacenter o FB barra)");
    process.exit(1);
  }

  const ids = extrairIdsDaBusca(html);
  console.log(`📋 ${ids.length} anúncio(s) na primeira página\n`);
  if (!ids.length) {
    console.log("⚠️ Zero. Ou o FB devolveu página de login, ou a URL não é de listagem.");
    console.log("   tamanho do HTML:", html.length, "| tem 'login':", /login|iniciar sesión/i.test(html));
    process.exit(1);
  }

  const moedas: Record<string, number> = {};
  const procedencias: Record<string, number> = {};
  let compras = 0;
  let semPreco = 0;

  for (const id of ids.slice(0, AMOSTRA)) {
    try {
      const detalhe = await baixar(`https://www.facebook.com/marketplace/item/${id}/?locale=es_LA`);
      const { anuncio: a } = extrairAnuncioFacebook(detalhe, id);
      if (!a) { console.log(`  ${id} — não consegui ler`); continue; }

      // ⚠️ ACHADO AO ESCREVER A SONDA: o parser brasileiro guarda o preço só
      // como NÚMERO (`precoCampo`) e, no último recurso, lê o texto formatado
      // com a moeda chumbada em `"formatted_price":{"text":"R$..."`. No
      // Paraguai isso perde metade da informação: sem o símbolo não dá para
      // saber se 97.500.000 é guarani (normal) ou dólar (absurdo).
      // Aqui puxo o texto cru e o código da moeda direto do JSON do FB.
      const txt = detalhe.match(/"formatted_price":\{"text":"([^"]+)"/)?.[1] ?? null;
      const moedaFb = detalhe.match(/"listing_price":\{[^}]{0,200}?"currency":"([A-Z]{3})"/)?.[1] ?? null;
      const preco = lerPreco(txt ?? String(a.precoCampo ?? ""));
      const proc = lerProcedencia(`${a.titulo ?? ""} ${a.descricao ?? ""}`);
      const compra = ehAnuncioDeCompra(a.titulo ?? "", a.descricao ?? "");

      if (preco.ok) moedas[preco.moeda] = (moedas[preco.moeda] ?? 0) + 1;
      else { semPreco++; moedas["(recusado: " + preco.motivo + ")"] = (moedas["(recusado: " + preco.motivo + ")"] ?? 0) + 1; }
      procedencias[proc] = (procedencias[proc] ?? 0) + 1;
      if (compra) compras++;

      const etiquetaPreco = preco.ok
        ? `${preco.moeda} ${preco.valor.toLocaleString("es-PY")}${preco.corrigido ? " ⚠️corrigido" : ""}`
        : `❌ ${preco.motivo}`;
      console.log(
        `  • ${(a.titulo ?? "sem título").slice(0, 46).padEnd(46)} | ${etiquetaPreco.padEnd(24)} | ${proc}${compra ? " | 🚩COMPRA" : ""}`
      );
      console.log(`      preço cru do FB: ${JSON.stringify(txt)} | moeda no JSON: ${moedaFb ?? "—"} | número: ${a.precoCampo ?? "—"} | ano: ${a.ano ?? "—"} | cidade: ${a.cidade ?? "—"}`);

      await dormir(2500); // cadência humana: é o que mantém o IP limpo
    } catch (e) {
      console.log(`  ${id} — erro: ${(e as Error).message}`);
    }
  }

  console.log("\n===== RESUMO DA AMOSTRA =====");
  console.log("moedas:      ", moedas);
  console.log("procedência: ", procedencias);
  console.log("anúncios de compra (não são oferta):", compras);
  console.log("sem preço legível:", semPreco);
})();
