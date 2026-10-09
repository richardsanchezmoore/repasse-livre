import "dotenv/config";
import fs from "node:fs";
import { supabase } from "./supabaseClient.js";
import { baixarLogado, fecharContexto } from "./navegadorFacebook.js";
import { extrairAnuncioFacebook } from "./facebookMarketplaceService.js";

/**
 * "FORA DO AR" É MESMO FORA DO AR?
 *
 * ★ Pergunta do Gustavo (09/10/2026): *"por que você diz que 222 estão mortos?
 * Baseado na busca pelo link das imagens? Se for isso, o link só pode ter sido
 * atualizado pelo CDN"*.
 *
 * ⚠️ A hipótese dele do CDN está coberta — o backfill reabre a PÁGINA do
 * anúncio, não testa o link antigo, justamente para pegar URL nova. Mas ele
 * está certo no fundo: o que o backfill mede é *"a página não devolveu foto"*,
 * e eu relatei isso como *"o anúncio não existe"*. São coisas diferentes, e
 * juntá-las escondeu três causas possíveis:
 *
 *   1. anúncio removido ou vendido — aí sim, morto;
 *   2. anúncio VIVO cuja extração falhou — defeito nosso, recuperável;
 *   3. página que não carregou a tempo — ruído, basta tentar de novo.
 *
 * ⚠️ A diferença importa para o produto: se for (2), temos centenas de anúncios
 * bons sendo escondidos por um bug; se for (1), é vida útil de anúncio e vira
 * métrica de cadência. Tratar as duas como a mesma coisa leva à decisão errada
 * nos dois casos.
 *
 * ★ Este script separa olhando o que a página DIZ, não o que ela deixa de dar.
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

/** O Facebook avisa quando o anúncio saiu — em espanhol, português ou inglês. */
const RX_REMOVIDO =
  /no est[áa] disponible|ya no est[áa]|n[ãa]o est[áa] dispon[íi]vel|isn't available|no longer available|conte[úu]do n[ãa]o encontrado|content not found/i;
/** Marcas de que a página É um anúncio, mesmo sem foto. */
const RX_EH_ANUNCIO = /"marketplace_listing_title"|"redacted_description"|"listing_price"/;

async function main() {
  if (!tomar()) return;

  const { data } = await supabase
    .from("opportunities")
    .select("link_origem, veiculo")
    .eq("pais", "PY")
    .is("foto_principal", null)
    .like("link_origem", "%/marketplace/item/%")
    .limit(Number(process.env.PY_AMOSTRA ?? 20));

  console.log(`conferindo ${data?.length} dos marcados como "sem foto na página"\n`);
  let removido = 0, vivoSemFoto = 0, vivoComFoto = 0, naoCarregou = 0;

  for (const o of data ?? []) {
    const id = String(o.link_origem).match(/item\/(\d+)/)?.[1];
    if (!id) continue;
    try {
      const html = await baixarLogado(`https://www.facebook.com/marketplace/item/${id}/?locale=es_LA`, 2200);
      const r = extrairAnuncioFacebook(html, id, { exigirMotor: false });
      const fotos = r?.anuncio?.fotos ?? [];
      const ehAnuncio = RX_EH_ANUNCIO.test(html);
      const diz = RX_REMOVIDO.test(html);

      let veredito: string;
      if (diz) { removido++; veredito = "✗ REMOVIDO (a página diz)"; }
      else if (fotos.length) { vivoComFoto++; veredito = `★ VIVO E COM ${fotos.length} FOTO(S) — recuperável!`; }
      else if (ehAnuncio) { vivoSemFoto++; veredito = "○ vivo, mas sem foto no anúncio"; }
      else { naoCarregou++; veredito = "? página não parece anúncio (não carregou?)"; }

      console.log(`  ${String(o.veiculo).slice(0, 34).padEnd(34)} ${veredito}`);
    } catch (e) {
      naoCarregou++;
      console.log(`  ${String(o.veiculo).slice(0, 34).padEnd(34)} ? erro: ${(e as Error).message.slice(0, 30)}`);
    }
    await dormir(2000);
  }

  const total = removido + vivoSemFoto + vivoComFoto + naoCarregou;
  console.log(`\n★ de ${total}:`);
  console.log(`   ${removido} REMOVIDOS de verdade (a página avisa)`);
  console.log(`   ${vivoComFoto} VIVOS E COM FOTO — foram contados como mortos por engano`);
  console.log(`   ${vivoSemFoto} vivos, anúncio sem foto nenhuma`);
  console.log(`   ${naoCarregou} não deu para saber`);
  if (vivoComFoto > 0) {
    console.log(`\n  ⚠️ ${((vivoComFoto / total) * 100).toFixed(0)}% eram recuperáveis. O backfill os perdeu —`);
    console.log(`     provavelmente por espera curta demais na página. Vale repassar.`);
  }
}

main()
  .catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; })
  .finally(async () => { await fecharContexto().catch(() => {}); soltar(); });
