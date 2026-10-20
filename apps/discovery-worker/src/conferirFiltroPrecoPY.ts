import "dotenv/config";
import fs from "node:fs";
import { baixarLogado, fecharContexto, SessaoExpirada } from "./navegadorFacebook.js";
import { extrairIdsDaBusca } from "./facebookMarketplaceService.js";
import { supabase } from "./supabaseClient.js";

/**
 * ★★★ O FACEBOOK IGNORA `minPrice`, OU NÓS LEMOS A CASCA DA PÁGINA?
 *
 * Seis buscas com a faixa ₲300 milhões para cima devolveram 24 — o teto da
 * página — nas duas formas de URL. Duas explicações, e elas pedem remédios
 * opostos:
 *
 *   (a) o Facebook ignora o filtro de preço nessa rota;
 *   (b) a gente lê o HTML ANTES de o GraphQL montar a lista filtrada, e o que
 *       volta é a listagem genérica. Já aconteceu aqui com as fotos do anúncio
 *       ("com 2s a gente lia a casca e concluía vendido/removido").
 *
 * ★ O juiz é o PREÇO do que voltou. Os ids que a busca devolve são, em boa
 * parte, anúncios que já estão na nossa base — e lá o preço está lido. Se a
 * faixa foi respeitada, os preços são todos altos. Se voltou carro de ₲30
 * milhões, o filtro não valeu, seja por (a) ou por (b).
 *
 * ⚠️ Não distingue (a) de (b) sozinho — mas responde o que importa para a
 * decisão: dá para confiar na escada de faixas HOJE? Se não dá, ela não
 * aumenta cobertura e só multiplica exposição da conta.
 */
const ID = process.argv[2] ?? "112086098802417";
const FAIXA = { min: 300_000_000, max: 2_000_000_000 };
const ESPERA_MS = Number(process.env.PY_ESPERA ?? 9000);
const ARQUIVO_TRAVA = "C:/claude/fb-sessao-py.lock";

function tomarTrava(): boolean {
  try {
    const { pid, inicio } = JSON.parse(fs.readFileSync(ARQUIVO_TRAVA, "utf8")) as { pid: number; inicio: string };
    let vivo = false;
    try { process.kill(pid, 0); vivo = true; } catch { vivo = false; }
    if (vivo && pid !== process.pid) {
      const h = (Date.now() - new Date(inicio).getTime()) / 3_600_000;
      console.log(`⛔ varredura rodando (pid ${pid}, há ${h.toFixed(1)}h). Saindo.`);
      return false;
    }
  } catch { /* livre */ }
  fs.writeFileSync(ARQUIVO_TRAVA, JSON.stringify({ pid: process.pid, inicio: new Date().toISOString() }));
  return true;
}
function soltarTrava(): void {
  try {
    const { pid } = JSON.parse(fs.readFileSync(ARQUIVO_TRAVA, "utf8")) as { pid: number };
    if (pid === process.pid) fs.unlinkSync(ARQUIVO_TRAVA);
  } catch { /* já foi */ }
}

async function main() {
  if (!tomarTrava()) return;
  const u =
    `https://www.facebook.com/marketplace/${ID}/carros/?exact=false&radius=10&locale=es_LA` +
    `&minPrice=${FAIXA.min}&maxPrice=${FAIXA.max}&topLevelVehicleType=car_truck`;
  let ids: string[] = [];
  try {
    ids = extrairIdsDaBusca(await baixarLogado(u, ESPERA_MS));
  } catch (e) {
    if (e instanceof SessaoExpirada) console.log("⛔ sessão caiu.");
    else console.log("✗", e instanceof Error ? e.message.slice(0, 70) : e);
  } finally {
    await fecharContexto().catch(() => {});
    soltarTrava();
  }
  console.log(`faixa pedida: ₲${(FAIXA.min / 1e6).toFixed(0)} milhões para cima · ${ids.length} ids na página\n`);
  if (!ids.length) return;

  // ⚠️ Em lotes: `in` com centenas de ids estoura a URL do PostgREST.
  const conhecidos: { veiculo: string; preco: number; moeda: string }[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const lote = ids.slice(i, i + 50).map((x) => `https://www.facebook.com/marketplace/item/${x}`);
    const { data } = await supabase.from("opportunities")
      .select("veiculo, preco, moeda").eq("pais", "PY").in("link_origem", lote);
    for (const o of data ?? []) if (o.preco != null) conhecidos.push(o as never);
  }
  console.log(`${conhecidos.length} desses ids já estão na nossa base, com preço lido:\n`);
  let dentro = 0;
  for (const o of conhecidos.slice(0, 15)) {
    const ok = o.moeda === "PYG" && Number(o.preco) >= FAIXA.min;
    if (ok) dentro++;
    console.log(`  ${ok ? "✓" : "✗"} ${String(o.veiculo).slice(0, 34).padEnd(34)} ${o.moeda} ${Number(o.preco).toLocaleString("es-PY")}`);
  }
  const dentroTotal = conhecidos.filter((o) => o.moeda === "PYG" && Number(o.preco) >= FAIXA.min).length;
  console.log(`\n★ ${dentroTotal} de ${conhecidos.length} estão DENTRO da faixa pedida.`);
  console.log(
    dentroTotal === conhecidos.length
      ? "→ o filtro de preço FOI respeitado."
      : "→ ⚠️ o filtro de preço NÃO valeu: voltou carro fora da faixa.",
  );
}

main().catch((e) => { console.error(e); soltarTrava(); process.exit(1); });
