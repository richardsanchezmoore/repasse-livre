import "dotenv/config";
import { baixarLogado, fecharContexto } from "./navegadorFacebook.js";
import { montarUrlBuscaFacebook } from "./facebookMarketplaceService.js";

const BASE = "https://www.facebook.com/marketplace/103101039729508/carros/?exact=0&locale=es_LA";
const CDE  = "https://www.facebook.com/marketplace/108383999186596/carros/?exact=0&locale=es_LA";
const filtroCheio = { minPreco: "15000000", maxPreco: "17500000", minAno: "1990", sort: "creation_time_descend" };

const CASOS: [string, string][] = [
  ["ENC nua", BASE],
  ["ENC + raio 60", montarUrlBuscaFacebook(BASE, { minPreco: "", maxPreco: "", minAno: "", sort: "" }, "60")],
  ["ENC + ano>=1990", montarUrlBuscaFacebook(BASE, { minPreco: "", maxPreco: "", minAno: "1990", sort: "" }, "60")],
  ["ENC + sort recentes", montarUrlBuscaFacebook(BASE, { minPreco: "", maxPreco: "", minAno: "", sort: "creation_time_descend" }, "60")],
  ["ENC + faixa 15-17.5M", montarUrlBuscaFacebook(BASE, filtroCheio, "60")],
  ["CDE + faixa 15-17.5M (controle)", montarUrlBuscaFacebook(CDE, filtroCheio, "60")],
];

for (const [rotulo, url] of CASOS) {
  try {
    const html = await baixarLogado(url, 2500);
    const ids = [...new Set([...html.matchAll(/marketplace\/item\/(\d{8,})/g)].map((m) => m[1]))];
    console.log(`${String(ids.length).padStart(3)} anuncio(s)  ${rotulo}`);
    if (ids.length === 0) console.log(`      url: ${url}`);
  } catch (e) {
    console.log(`  ✗ ${rotulo}: ${(e as Error).message}`);
  }
}
await fecharContexto();
