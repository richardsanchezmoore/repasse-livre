/**
 * Sonda do Mercado Libre Paraguai — só leitura, para separar DUAS hipóteses:
 *
 *  (a) o muro é de CABEÇALHO — como era no Facebook, onde mandar só o
 *      user-agent devolvia HTTP 400;
 *  (b) o muro é de IP — o `account-verification` que já conhecemos do ML
 *      brasileiro (ver project_repasse_livre_ml_fichamento_ip_visibilidade).
 *
 * ★ Resultado do meu lado em 23/09: com os MESMOS doze cabeçalhos do scraper
 * do Facebook, o ML.py continuou mandando para `/gz/account-verification`.
 * Então, do meu IP, é (b) — cabeçalho não resolve. Falta a mesma medida do IP
 * residencial paraguaio do Gustavo, que é o que vai valer na operação real:
 * se passar lá, o bloqueio é do IP daqui e o ML.py é viável como fonte.
 *
 * Uso:  npx tsx src/sondarMercadoLibrePY.ts
 */
import { HEADERS } from "./facebookMarketplaceService.js";

const ALVOS: [string, string][] = [
  ["listagem de veículos", "https://listado.mercadolibre.com.py/vehiculos/"],
  ["autos e camionetas", "https://autos.mercadolibre.com.py/autos-camionetas/"],
  ["busca por modelo", "https://listado.mercadolibre.com.py/toyota-hilux"],
];

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log("🔎 SONDA — Mercado Libre Paraguai (só leitura)\n");
  console.log("Pergunta: o muro é cabeçalho ou é IP?\n");

  let passou = 0;
  for (const [nome, url] of ALVOS) {
    try {
      // Mesmos cabeçalhos que destravaram o Facebook — se o muro fosse de
      // cabeçalho, cairia aqui também.
      const r = await fetch(url, { headers: { ...HEADERS, "accept-language": "es-PY,es;q=0.9" }, redirect: "follow" });
      const html = await r.text();
      const muro = /account-verification/.test(r.url) || /ingresa a tu cuenta/i.test(html);
      const itens = (html.match(/ui-search-layout__item/g) ?? []).length;
      if (!muro) passou++;
      console.log(`  ${r.status} | ${nome.padEnd(22)} | ${muro ? "🚫 MURO (account-verification)" : `✅ passou — ${itens} itens`}`);
    } catch (e) {
      console.log(`  ERR | ${nome.padEnd(22)} | ${(e as Error).message}`);
    }
    await dormir(2500);
  }

  console.log("\n===== LEITURA =====");
  if (passou) {
    console.log("✅ Passou daqui. O ML.py é raspável deste IP — dá para tratar como fonte.");
  } else {
    console.log("🚫 Muro em tudo. Como os cabeçalhos são os mesmos que destravaram o");
    console.log("   Facebook, sobra o IP — é o `account-verification` que já conhecemos");
    console.log("   do ML brasileiro. Remédios daquela briga: reiniciar o roteador para");
    console.log("   pegar IP residencial novo, e cadência humana para não ser fichado.");
    console.log("   ⚠️ E vale medir DE NOVO depois de reiniciar: o bloqueio é por IP,");
    console.log("      então o resultado muda de máquina para máquina.");
  }
})();
