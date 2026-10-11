import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { hashDaImagem } from "./hashPerceptual.js";

/**
 * CALCULA O HASH PERCEPTUAL do que já está no ar.
 *
 * ★★ NÃO TOCA NO FACEBOOK. As fotos já foram re-hospedadas no NOSSO bucket, e
 * é de lá que elas são lidas. Zero raspagem, zero risco para a conta, zero
 * antiscraping — e por isso dá para rodar à vontade.
 *
 * ⚠️ Só busca quem ainda não tem hash, então é retomável: cair no meio e rodar
 * de novo continua de onde parou.
 *
 * ⚠⚠ E RODA EM LAÇO porque `.limit(2000)` NÃO vence o teto de 1.000 linhas do
 * PostgREST — ele devolve 1.000 em silêncio, sem erro. Essa mesma armadilha já
 * me pegou duas vezes hoje (no mapa de marcas e no diagnóstico de fotos).
 *
 * ⚠️ Foto que já saiu do ar (404 no bucket, ou URL do fbcdn que caducou)
 * simplesmente não ganha hash. Anúncio sem hash cai nos critérios de texto —
 * perder um critério não é perder o anúncio.
 */
const LIMITE = Number(process.env.HASH_LIMITE ?? 2000);
const PAUSA = Number(process.env.HASH_PAUSA_MS ?? 60);

async function rodada(): Promise<{ ok: number; falhou: number; vistos: number }> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, veiculo, foto_principal")
    .eq("pais", "PY")
    .not("foto_principal", "is", null)
    .is("foto_hash", null)
    .limit(LIMITE);
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as { id: string; veiculo: string; foto_principal: string }[];
  console.log(`${linhas.length} anúncio(s) com foto e sem hash\n`);

  let ok = 0, falhou = 0;
  for (let i = 0; i < linhas.length; i++) {
    const o = linhas[i];
    try {
      const r = await fetch(o.foto_principal, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const h = await hashDaImagem(Buffer.from(await r.arrayBuffer()));
      if (!h) throw new Error("imagem ilegível");
      const { error: e } = await supabase.from("opportunities").update({ foto_hash: h }).eq("id", o.id);
      if (e) throw new Error(e.message);
      ok++;
      if (ok % 50 === 0) console.log(`  ${String(i + 1).padStart(4)}/${linhas.length} · ${ok} com hash`);
    } catch (erro) {
      falhou++;
      if (falhou <= 5) console.log(`  ✗ ${String(o.veiculo).slice(0, 34).padEnd(34)} ${(erro as Error).message}`);
    }
    if (PAUSA) await new Promise((r) => setTimeout(r, PAUSA));
  }
  return { ok, falhou, vistos: linhas.length };
}

async function main() {
  let ok = 0;
  let falhou = 0;
  for (let volta = 1; ; volta++) {
    const r = await rodada();
    ok += r.ok;
    falhou += r.falhou;
    // ⚠️ Para quando a rodada não hasheou NADA: ou acabou, ou o que sobrou é
    // foto fora do ar — e insistir nesse caso seria laço infinito.
    if (r.vistos === 0 || r.ok === 0) break;
    console.log(`  — volta ${volta}: ${r.ok} com hash, ${r.falhou} falharam —\n`);
  }
  console.log(`\n✓ ${ok} com hash · ${falhou} falharam (foto fora do ar ou ilegível)`);
}

main().catch((e: Error) => { console.error("falhou:", e.message); process.exitCode = 1; });
