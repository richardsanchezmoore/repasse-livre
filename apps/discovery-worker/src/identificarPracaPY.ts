import "dotenv/config";
import fs from "node:fs";
import { baixarLogado, fecharContexto, SessaoExpirada } from "./navegadorFacebook.js";
import { extrairIdsDaBusca } from "./facebookMarketplaceService.js";

/**
 * ★★★ ESTE ID É MESMO DESTA CIDADE? — pergunta do Gustavo, 20/10/2026.
 *
 * Ele achou DOIS ids numéricos diferentes dizendo ser Encarnación:
 *
 *     108921039142193   (na forma /search/ que o Facebook entrega)
 *     103101039729508   (o que a gente usa, na forma /carros/)
 *
 * > *"se depois do /marketplace/ o que vem é o ID de cidade não faz sentido,
 * > pois a princípio as duas são de Encarnación"*
 *
 * ⚠️⚠️ E a pergunta NÃO é acadêmica: existe **Encarnación de Díaz, no México**.
 * Foi exatamente assim que a praça "concepcion" nos fez varrer o CHILE por
 * dias — 1.707 anúncios em peso chileno publicados como se fossem do Paraguai.
 *
 * ★ O teste compara candidatos pelo que eles DEVOLVEM, não pelo que prometem:
 *
 *   1. SOBREPOSIÇÃO de ids — dois endereços da mesma praça veem o mesmo
 *      estoque; de cidades diferentes, não se tocam.
 *   2. O SLUG QUALIFICADO ("encarnacion-itapua") é a âncora: Itapúa é
 *      departamento paraguaio, então quem casa com ele é o do Paraguai.
 *
 * ⚠️ Uma busca por candidato, sem faixa de preço: o objetivo é identidade, não
 * cobertura. É a conta do Gustavo e o custo tem que ser pequeno.
 *
 * Uso: npx tsx src/identificarPracaPY.ts "rotulo=caminho" "rotulo=caminho" ...
 *   ex.: npx tsx src/identificarPracaPY.ts \
 *          "ancora slug=encarnacion-itapua" "id novo=108921039142193" "id nosso=103101039729508"
 */
const ESPERA_MS = Number(process.env.PY_ESPERA ?? 6000);
const PAUSA_MS = Number(process.env.PY_PAUSA ?? 6000);
const ARQUIVO_TRAVA = "C:/claude/fb-sessao-py.lock";
const CATEGORIA_VEICULOS = "546583916084032";

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

/** Mesma forma para TODOS os candidatos: se a forma variar, a comparação não vale. */
const url = (caminho: string) =>
  `https://www.facebook.com/marketplace/${caminho}/search/?category_id=${CATEGORIA_VEICULOS}` +
  `&query=${encodeURIComponent("Vehículos")}&locale=es_LA&referral_ui_component=category_menu_item`;

async function main() {
  const candidatos = process.argv.slice(2)
    .filter((a) => a.includes("="))
    .map((a) => { const i = a.indexOf("="); return { rotulo: a.slice(0, i).trim(), caminho: a.slice(i + 1).trim() }; });
  if (candidatos.length < 2) {
    console.log('Uso: npx tsx src/identificarPracaPY.ts "rotulo=caminho" "rotulo=caminho" ...');
    return;
  }
  if (!tomarTrava()) return;

  const achados = new Map<string, Set<string>>();
  try {
    for (const c of candidatos) {
      let ids: string[] = [];
      try {
        ids = extrairIdsDaBusca(await baixarLogado(url(c.caminho), ESPERA_MS));
      } catch (e) {
        if (e instanceof SessaoExpirada) { console.log("⛔ sessão caiu — parando."); break; }
        console.log(`  ✗ ${c.rotulo}: ${e instanceof Error ? e.message.slice(0, 60) : e}`);
      }
      achados.set(c.rotulo, new Set(ids));
      console.log(`  ${c.rotulo.padEnd(18)} ${String(ids.length).padStart(3)} anúncios   (${c.caminho})`);
      await dormir(PAUSA_MS);
    }
  } finally {
    await fecharContexto().catch(() => {});
    soltarTrava();
  }

  console.log(`\n═══ QUEM VÊ O MESMO ESTOQUE? ═══`);
  const nomes = [...achados.keys()];
  for (let i = 0; i < nomes.length; i++) {
    for (let k = i + 1; k < nomes.length; k++) {
      const a = achados.get(nomes[i])!, b = achados.get(nomes[k])!;
      if (!a.size || !b.size) { console.log(`  ${nomes[i]} × ${nomes[k]}: sem dado`); continue; }
      const comum = [...a].filter((x) => b.has(x)).length;
      const pct = Math.round((comum / Math.min(a.size, b.size)) * 100);
      const veredito = pct >= 80 ? "MESMA PRAÇA" : pct === 0 ? "⚠️ CIDADES DIFERENTES" : "parcial (ordem ou raio)";
      console.log(`  ${nomes[i].padEnd(18)} × ${nomes[k].padEnd(18)} ${String(comum).padStart(3)} em comum = ${String(pct).padStart(3)}% → ${veredito}`);
    }
  }
  console.log(`\n⚠️ Pouco em comum com as DUAS páginas no teto (24) pode ser só ordenação.`);
  console.log(`   Zero em comum com páginas CURTAS é que é sinal forte de cidade diferente.`);
}

main().catch((e) => { console.error(e); soltarTrava(); process.exit(1); });
