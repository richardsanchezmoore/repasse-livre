import "dotenv/config";
import fs from "node:fs";
import { baixarLogado, coletarIdsComRolagem, fecharContexto } from "./navegadorFacebook.js";
import { extrairIdsDaBusca } from "./facebookMarketplaceService.js";
import { supabase, lerConfig } from "./supabaseClient.js";

/**
 * QUANTO O AUTOLOAD RENDE DE VERDADE — medir antes de gastar horas.
 *
 * ★ O mutirão que o Gustavo pediu é caro: rolar muitas vezes, em muitas praças,
 * numa conta que precisa ser preservada. ⚠️ Antes de soltar isso é preciso saber
 * se rolar MULTIPLICA os ids ou se o Facebook corta no mesmo lugar de qualquer
 * jeito. Se o ganho for pequeno, o mutirão é exposição a troco de nada.
 *
 * Compara, na MESMA URL e em sequência:
 *   · sem rolagem  — o que a captação faz hoje (lê o HTML da primeira carga)
 *   · com rolagem  — o autoload novo (acumula do DOM a cada passo)
 *
 * E cruza com a base, porque o número que importa não é "quantos ids" e sim
 * **quantos INÉDITOS** — id que já temos não vira anúncio novo.
 */
const TRAVA = "C:/claude/fb-sessao-py.lock";
function tomar(): boolean {
  try {
    const { pid } = JSON.parse(fs.readFileSync(TRAVA, "utf8")) as { pid: number };
    try { process.kill(pid, 0); if (pid !== process.pid) { console.log(`⛔ perfil ocupado (pid ${pid})`); return false; } } catch { /* órfã */ }
  } catch { /* sem trava */ }
  fs.writeFileSync(TRAVA, JSON.stringify({ pid: process.pid, inicio: new Date().toISOString() }));
  return true;
}
const soltar = () => {
  try {
    const { pid } = JSON.parse(fs.readFileSync(TRAVA, "utf8")) as { pid: number };
    if (pid === process.pid) fs.unlinkSync(TRAVA);
  } catch { /* já foi */ }
};
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ROLAGENS = Number(process.env.PY_ROLAGENS ?? 20);

async function main() {
  if (!tomar()) return;

  const { data } = await supabase.from("opportunities").select("link_origem").eq("pais", "PY");
  const nossos = new Set(
    (data ?? []).map((o) => String(o.link_origem).match(/item\/(\d+)/)?.[1]).filter(Boolean) as string[],
  );
  console.log(`base: ${nossos.size} ids conhecidos · ${ROLAGENS} rolagens no teste\n`);

  const regioesRaw = await lerConfig("FACEBOOK_REGIOES");
  const todas = JSON.parse(regioesRaw ?? "[]") as { nome: string; url: string; uf?: string }[];
  const pracas = todas.filter((r) => (r.uf ?? "").startsWith("PY-")).slice(0, 3);

  console.log("  praça                faixa            sem rolar   COM rolar   inéditos");
  let totalSem = 0, totalCom = 0, totalInedito = 0;

  for (const p of pracas) {
    // Duas faixas por praça: uma densa e uma esparsa, para não concluir a
    // partir de um caso só.
    for (const [rotulo, faixa] of [["densa 30–45M", "minPrice=30000000&maxPrice=45000000"], ["esparsa 70–90M", "minPrice=70000000&maxPrice=90000000"]] as const) {
      const url = `${p.url}${p.url.includes("?") ? "&" : "?"}${faixa}&minYear=1990&sortBy=creation_time_descend`;
      try {
        const sem = extrairIdsDaBusca(await baixarLogado(url, 2500));
        await dormir(5000);
        const com = await coletarIdsComRolagem(url, ROLAGENS, 2000);
        const ineditos = com.filter((id) => !nossos.has(id)).length;
        totalSem += sem.length; totalCom += com.length; totalInedito += ineditos;
        const ganho = sem.length ? `${(com.length / sem.length).toFixed(1)}×` : "—";
        console.log(
          `  ${p.nome.slice(0, 18).padEnd(18)} ${rotulo.padEnd(16)} ${String(sem.length).padStart(7)}   ${String(com.length).padStart(9)}   ${String(ineditos).padStart(8)}  ${ganho}`,
        );
        await dormir(6000);
      } catch (e) {
        console.log(`  ${p.nome.padEnd(18)} ${rotulo.padEnd(16)} ✗ ${(e as Error).message.slice(0, 40)}`);
      }
    }
  }

  console.log(`\n★ TOTAL: ${totalSem} sem rolar → ${totalCom} com rolar (${totalSem ? (totalCom / totalSem).toFixed(1) : "—"}×) · ${totalInedito} inéditos`);
  console.log("\n  Se o ganho ficar perto de 1×, o Facebook corta no mesmo lugar e o");
  console.log("  mutirão não se paga. Acima de 2×, vale as horas.");
}

main()
  .catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; })
  .finally(async () => { await fecharContexto().catch(() => {}); soltar(); });
