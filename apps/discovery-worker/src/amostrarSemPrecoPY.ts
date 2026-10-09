import "dotenv/config";
import fs from "node:fs";
import { supabase } from "./supabaseClient.js";
import { baixarLogado, fecharContexto } from "./navegadorFacebook.js";
import { extrairAnuncioFacebook } from "./facebookMarketplaceService.js";
import { lerPrecoComContexto, precoDeclarado } from "./precoParaguai.js";

/**
 * OS QUE SOBRARAM SEM PREÇO — e a pergunta que separa duas coisas muito
 * diferentes que hoje estão no mesmo balde.
 *
 * ★ Gustavo (09/10/2026): *"a sacada do preço na descrição achei que já
 * estávamos fazendo, pois quase sempre ele está lá... ou ao menos em 50%
 * chutaria eu"*. O resgate recuperou ~23%, metade do palpite dele. Isso pode
 * significar duas coisas OPOSTAS:
 *
 *   1. o anúncio realmente não diz preço ("interesados MP", "precio en
 *      privado") → não há o que fazer;
 *   2. o anúncio DIZ, num formato que o `precoDeclarado` não reconhece → é
 *      conserto nosso, e cada formato novo recupera um lote inteiro.
 *
 * ⚠️ Somados, os dois viram "sem preço" e a diferença some. Este script imprime
 * o TEXTO CRU da descrição ao lado do que o leitor extraiu, para a diferença
 * aparecer — o mesmo método que revelou o "PYG105", que só se mostrou quando
 * fui olhar o JSON em vez de confiar no que o código dizia.
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

/** Cheira a preço no texto? Grosseiro de propósito: a pergunta é "tem número de
 *  tamanho de preço aí?", não "qual é o preço". */
const RX_CHEIRO = /\b\d{1,3}[.,]\d{3}[.,]\d{3}\b|\b\d{2,3}\s*mill?[oó]n/i;

async function main() {
  if (!tomar()) return;

  const { data } = await supabase
    .from("fb_vistos")
    .select("item_id, status")
    .in("status", ["fora_de_faixa", "sem_preco", "preco_isca"])
    .limit(Number(process.env.PY_AMOSTRA ?? 18));

  console.log(`amostrando ${data?.length} dos que SEGUEM sem preço\n`);
  let comCheiro = 0, semNada = 0, foraDoAr = 0;

  for (const r of data ?? []) {
    const id = String(r.item_id);
    try {
      const html = await baixarLogado(`https://www.facebook.com/marketplace/item/${id}/?locale=es_LA`, 1400);
      const a = extrairAnuncioFacebook(html, id, { exigirMotor: false })?.anuncio;
      if (!a) { foraDoAr++; await dormir(1200); continue; }

      const desc = String(a.descricao ?? "").replace(/\s+/g, " ");
      const j = html.indexOf('"redacted_description"');
      const campo = html.slice(Math.max(0, j - 9000), j + 9000)
        .match(/"formatted_price":\{"text":"([^"]+)"/)?.[1] ?? "(sem)";
      const lido = precoDeclarado(desc);
      const cheiro = RX_CHEIRO.test(desc);
      if (cheiro) comCheiro++; else semNada++;

      console.log(`${cheiro ? "⚠️ TEM CARA DE PREÇO" : "   nada numérico   "}  campo="${campo.slice(0, 14)}"  leitor=${lido?.ok ? `${lido.moeda} ${lido.valor.toLocaleString("es-PY")}` : "✗"}`);
      console.log(`     ${String(a.titulo ?? "").slice(0, 44)}`);
      console.log(`     ${desc.slice(0, 150) || "(descrição vazia)"}`);
    } catch { foraDoAr++; }
    await dormir(1200);
  }

  const total = comCheiro + semNada;
  console.log(`\n★ ${comCheiro} de ${total} têm número com CARA DE PREÇO na descrição e mesmo assim não foram lidos`);
  console.log(`  ${semNada} não têm nada numérico — esses não dizem preço mesmo`);
  console.log(`  ${foraDoAr} fora do ar / sem parse`);
  console.log(
    comCheiro > semNada
      ? "\n  ⚠️ O LEITOR é o gargalo, não o anúncio. Cada formato novo recupera um lote."
      : "\n  ✓ a maioria realmente não diz preço — o leitor está perto do teto.",
  );
}

main()
  .catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; })
  .finally(async () => { await fecharContexto().catch(() => {}); soltar(); });
