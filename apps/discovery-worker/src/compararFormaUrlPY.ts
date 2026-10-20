import "dotenv/config";
import fs from "node:fs";
import { baixarLogado, fecharContexto, SessaoExpirada } from "./navegadorFacebook.js";
import { extrairIdsDaBusca } from "./facebookMarketplaceService.js";

/**
 * ★★★ A FORMA DA URL MUDA O RESULTADO? — pergunta do Gustavo, 20/10/2026.
 *
 * Ele reparou que o raio parece "mais obediente" na forma que o Google entrega:
 *
 *   NOSSA:  /marketplace/<id>/carros/?exact=false&radius=10&locale=es_LA
 *   GOOGLE: /marketplace/<id>/search/?query=Vehículos&category_id=546583916084032
 *           &exact=false&referral_ui_component=category_menu_item
 *
 * ⚠️ Isto NÃO se resolve raciocinando: o Marketplace já nos enganou duas vezes
 * (o `topLevelVehicleType` em 3 variantes deu os MESMOS 13 ids; a praça
 * "concepcion" resolveu para o Chile). A pergunta é empírica e barata de medir.
 *
 * ★ O teste: a MESMA praça, dois raios bem diferentes, nas duas formas. Se uma
 * forma devolve o mesmo conjunto para raio 10 e 40, ela IGNORA o raio. Se os
 * conjuntos mudam, ela obedece.
 *
 * ⚠️ Uma rodada só e poucas buscas: é a conta do Gustavo, e o custo de
 * descobrir isso tem que ser menor que o de continuar no escuro.
 *
 * Uso: npx tsx src/compararFormaUrlPY.ts [idDaPraca]
 */
const ID = process.argv[2] ?? "112086098802417"; // Luque, por padrão
const ESPERA_MS = Number(process.env.PY_ESPERA ?? 6000);
const PAUSA_MS = Number(process.env.PY_PAUSA ?? 6000);
const ARQUIVO_TRAVA = "C:/claude/fb-sessao-py.lock";

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Mesma trava do ciclo: duas sessões na mesma pasta de perfil corrompem. */
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

const CATEGORIA_VEICULOS = "546583916084032";

/**
 * ⚠️⚠️ A FAIXA DE PREÇO NÃO É DETALHE DO TESTE, É O QUE O TORNA LEGÍVEL.
 *
 * A primeira rodada deu 24 nos QUATRO casos — e 24 é o teto da página. Com a
 * página cheia não dá para dizer nada sobre o raio: os dois raios devolvem
 * "os primeiros 24" e pronto. A nossa própria medição de faixas já dizia
 * isso: só ABAIXO de 24 a busca enumera o conjunto inteiro.
 *
 * ★ Com uma faixa estreita o total cai abaixo do teto, e aí a comparação
 * passa a significar alguma coisa. De quebra responde a pergunta mais
 * importante: a forma /search/ OBEDECE minPrice/maxPrice? Se ignorar,
 * voltaria 24 (página cheia) e a nossa escada de faixas — que é como
 * enumeramos o estoque — pararia de funcionar em silêncio.
 */
const FAIXA = { min: 30_000_000, max: 35_000_000 };

function url(forma: "carros" | "search", raio: number, comFaixa: boolean): string {
  const base = `https://www.facebook.com/marketplace/${ID}`;
  const faixa = comFaixa ? `&minPrice=${FAIXA.min}&maxPrice=${FAIXA.max}` : "";
  if (forma === "carros") {
    return `${base}/carros/?exact=false&radius=${raio}&locale=es_LA&topLevelVehicleType=car_truck${faixa}`;
  }
  // ⚠️ A forma do Google, com a grafia ESPANHOLA do rótulo (a praça é es_LA).
  return `${base}/search/?query=${encodeURIComponent("Vehículos")}&category_id=${CATEGORIA_VEICULOS}` +
    `&exact=false&radius=${raio}&locale=es_LA&referral_ui_component=category_menu_item${faixa}`;
}

const intersecao = (a: Set<string>, b: Set<string>) => [...a].filter((x) => b.has(x)).length;

async function main() {
  if (!tomarTrava()) return;
  const casos: { rotulo: string; forma: "carros" | "search"; raio: number; comFaixa: boolean }[] = [
    { rotulo: "carros  SEM faixa  r10", forma: "carros", raio: 10, comFaixa: false },
    { rotulo: "carros  COM faixa  r10", forma: "carros", raio: 10, comFaixa: true },
    { rotulo: "carros  COM faixa  r40", forma: "carros", raio: 40, comFaixa: true },
    { rotulo: "search  SEM faixa  r10", forma: "search", raio: 10, comFaixa: false },
    { rotulo: "search  COM faixa  r10", forma: "search", raio: 10, comFaixa: true },
    { rotulo: "search  COM faixa  r40", forma: "search", raio: 40, comFaixa: true },
  ];
  const achados = new Map<string, Set<string>>();

  try {
    for (const c of casos) {
      const u = url(c.forma, c.raio, c.comFaixa);
      let ids: string[] = [];
      try {
        const html = await baixarLogado(u, ESPERA_MS);
        ids = extrairIdsDaBusca(html);
      } catch (e) {
        if (e instanceof SessaoExpirada) { console.log("⛔ sessão do Facebook caiu — parando."); break; }
        console.log(`  ✗ ${c.rotulo}: ${e instanceof Error ? e.message.slice(0, 60) : e}`);
      }
      achados.set(c.rotulo, new Set(ids));
      console.log(`  ${c.rotulo} → ${ids.length} anúncios`);
      await dormir(PAUSA_MS);
    }
  } finally {
    await fecharContexto().catch(() => {});
    soltarTrava();
  }

  const n = (r: string) => achados.get(r)?.size ?? -1;
  const comum = (a: string, b: string) => {
    const x = achados.get(a), y = achados.get(b);
    return x && y ? intersecao(x, y) : -1;
  };

  console.log(`\n═══ A FAIXA DE PREÇO É OBEDECIDA? (praça ${ID}) ═══`);
  console.log(`  ⚠️ 24 = teto da página. Se COM faixa continuar 24, a faixa foi IGNORADA.`);
  for (const forma of ["carros", "search"] as const) {
    const sem = n(`${forma}  SEM faixa  r10`);
    const com = n(`${forma}  COM faixa  r10`);
    const veredito = com >= 24 ? "IGNOROU (página cheia)" : com < sem ? "OBEDECEU" : "inconclusivo";
    console.log(`  ${forma.padEnd(7)} sem faixa=${String(sem).padStart(3)} · com faixa=${String(com).padStart(3)} → ${veredito}`);
  }

  console.log(`\n═══ O RAIO É OBEDECIDO? (só vale se a faixa cortou abaixo de 24) ═══`);
  for (const forma of ["carros", "search"] as const) {
    const a = n(`${forma}  COM faixa  r10`), b = n(`${forma}  COM faixa  r40`);
    const c = comum(`${forma}  COM faixa  r10`, `${forma}  COM faixa  r40`);
    if (a < 0 || b < 0) { console.log(`  ${forma}: sem dado`); continue; }
    const cheia = a >= 24 || b >= 24;
    const veredito = cheia ? "INCONCLUSIVO (página cheia)" : a === b && c === a ? "IGNORA o raio" : "OBEDECE";
    console.log(`  ${forma.padEnd(7)} r10=${String(a).padStart(3)} · r40=${String(b).padStart(3)} · em comum=${String(c).padStart(3)} → ${veredito}`);
  }

  console.log(`\n═══ AS DUAS FORMAS VEEM O MESMO ESTOQUE? ═══`);
  const ca = achados.get("carros  COM faixa  r10"), se = achados.get("search  COM faixa  r10");
  if (ca && se) {
    console.log(`  mesma faixa e mesmo raio: carros=${ca.size} · search=${se.size} · em comum=${intersecao(ca, se)}`);
    console.log(`  ⚠️ pouco em comum com as DUAS páginas cheias só diz que a ORDEM é outra, não que o estoque é outro.`);
  }
}

main().catch((e) => { console.error(e); soltarTrava(); process.exit(1); });
