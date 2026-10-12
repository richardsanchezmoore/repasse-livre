import "dotenv/config";
import fs from "node:fs";
import { supabase } from "./supabaseClient.js";
import { baixarLogado, fecharContexto, SessaoExpirada } from "./navegadorFacebook.js";
import { extrairAnuncioFacebook } from "./facebookMarketplaceService.js";

/**
 * ═══ CIDADE DOS ANÚNCIOS QUE NASCERAM SEM LUGAR ═══════════════════════════
 *
 * ★ O PROBLEMA (medido em 12/10/2026): 113 anúncios vivos estão com `cidade`
 * E `estado` nulos, todos capturados entre 07 e 09/10. Anúncio sem cidade fica
 * FORA da vitrine por decisão nossa — ou seja: foram capturados, custaram
 * tempo de varredura e são invisíveis.
 *
 * ⚠️⚠️ E O CICLO NUNCA VAI CONSERTÁ-LOS SOZINHO: a varredura pula o que já
 * está no livro `fb_vistos` (`ids.filter(id => !jaVistos.has(id))`). Eles estão
 * vistos. Sem um passe dedicado, ficam invisíveis para sempre.
 *
 * ★★★ POR QUE NÃO SE CHUTA A CIDADE. Duas rotas baratas foram medidas e as
 * duas reprovadas:
 *
 *   ✗ DEDUZIR DA BUSCA QUE ACHOU O ANÚNCIO (`fb_buscas`): dos 94 ids, só 18
 *     aparecem numa praça ÚNICA. Os outros 57 aparecem em DUAS OU MAIS — o
 *     raio do Marketplace se sobrepõe entre praças vizinhas. Escolher uma
 *     delas é sortear.
 *
 *   ✗ O PRIMEIRO `reverse_geocode` DA PÁGINA: já foi tentado em 05/10 e gravou
 *     9 anúncios em "Foz do Iguaçu" — a cidade dos RELACIONADOS, a 500 km. Ver
 *     o comentário em facebookMarketplaceService.
 *
 * Então aqui só se grava o que a JANELA DO ANÚNCIO PRINCIPAL disser. Se ela
 * não disser, o anúncio continua sem cidade e sai no relatório. Cidade errada
 * mistura mercados na tabela de preço, que é o produto; cidade ausente só
 * esconde um anúncio.
 *
 * ⚠️ Rodar com o ciclo ligado é esperado: ele e este script dividem a MESMA
 * sessão do Playwright, então aqui se ESPERA a trava liberar em vez de sair —
 * um backfill que desiste em silêncio é um backfill que nunca roda.
 *
 * Uso: npx tsx src/backfillCidadePY.ts [--conferir]
 */
const CONFERIR = process.argv.includes("--conferir");
const PAUSA_MS = Number(process.env.CIDADE_PAUSA_MS ?? 2500);
const ESPERA_MS = Number(process.env.CIDADE_ESPERA_MS ?? 5000);
const ESPERA_TRAVA_MIN = Number(process.env.CIDADE_ESPERA_TRAVA_MIN ?? 90);

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ARQUIVO_TRAVA = "C:/claude/fb-sessao-py.lock";
function travaOcupada(): number | null {
  try {
    const { pid } = JSON.parse(fs.readFileSync(ARQUIVO_TRAVA, "utf8")) as { pid: number };
    if (pid === process.pid) return null;
    try { process.kill(pid, 0); return pid; } catch { return null; } // órfã
  } catch { return null; }
}
async function esperarEtomarTrava(): Promise<boolean> {
  for (let i = 0; i < ESPERA_TRAVA_MIN * 2; i++) {
    const pid = travaOcupada();
    if (pid === null) {
      fs.writeFileSync(ARQUIVO_TRAVA, JSON.stringify({ pid: process.pid, inicio: new Date().toISOString() }));
      return true;
    }
    if (i === 0) console.log(`perfil ocupado (pid ${pid}) — esperando a trava liberar (até ${ESPERA_TRAVA_MIN} min)`);
    await dormir(30_000);
  }
  console.log("⛔ a trava não liberou. Saindo sem fazer nada.");
  return false;
}
function soltarTrava(): void {
  try {
    const { pid } = JSON.parse(fs.readFileSync(ARQUIVO_TRAVA, "utf8")) as { pid: number };
    if (pid === process.pid) fs.unlinkSync(ARQUIVO_TRAVA);
  } catch { /* já foi */ }
}

/**
 * ⚠️ As praças que varremos são as únicas cidades paraguaias que a base
 * conhece hoje (12 distintas, e 11 são praças). "Foz do Iguaçu" está entre
 * elas com 1 anúncio — resto do bug de 05/10. Cidade BRASILEIRA numa vitrine
 * paraguaia é pior que cidade nenhuma, então ela também entra no conserto.
 */
const CIDADES_FORA_DO_PY = /^(foz do igua|ciudad del este, br|puerto iguaz)/i;

async function main() {
  if (!(await esperarEtomarTrava())) return;

  const alvos: Array<{ id: string; link_origem: string; veiculo: string | null; cidade: string | null }> = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, link_origem, veiculo, cidade")
      .eq("pais", "PY")
      .is("duplicata_de", null)
      .like("link_origem", "%/marketplace/item/%")
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    for (const o of (data ?? []) as typeof alvos) {
      if (!o.cidade || CIDADES_FORA_DO_PY.test(o.cidade)) alvos.push(o);
    }
    if (!data || data.length < 1000) break;
  }

  console.log(`${alvos.length} anúncio(s) sem cidade utilizável${CONFERIR ? "  (ENSAIO — nada gravado)" : ""}\n`);

  let recuperados = 0, semLocalizacao = 0, foraDoAr = 0, recusados = 0, erros = 0;
  const achadas = new Map<string, number>();

  for (let i = 0; i < alvos.length; i++) {
    const o = alvos[i];
    const rotulo = `${String(i + 1).padStart(3)}/${alvos.length} ${String(o.veiculo ?? "").slice(0, 34).padEnd(36)}`;
    try {
      const html = await baixarLogado(o.link_origem, ESPERA_MS);
      /**
       * ⚠️⚠️ `exigirMotor: false` — e isto NÃO é detalhe. O padrão do parser é
       * EXIGIR motor e devolver `anuncio: null` sem ele; a captura paraguaia
       * sempre chamou com false. Na primeira rodada deste script eu usei o
       * padrão e contei 60 anúncios como "fora do ar" quando boa parte estava
       * viva e só não declarava cilindrada. Número errado sobre dado vivo.
       *
       * ⚠️ E `motivoDescarte` separa as duas coisas que `anuncio: null`
       * confunde: página que não existe mais × página que existe e o parser
       * recusou. Só a primeira é "fora do ar".
       */
      const r = extrairAnuncioFacebook(html, o.link_origem, { exigirMotor: false });
      const a = r.anuncio;
      if (!a || !a.titulo) {
        if (r.motivoDescarte && r.motivoDescarte !== "sem_titulo") {
          recusados++;
          console.log(`  ▲ ${rotulo} página viva, parser recusou (${r.motivoDescarte})`);
        } else {
          foraDoAr++;
          console.log(`  ○ ${rotulo} página vazia (vendido/removido?)`);
        }
        await dormir(PAUSA_MS); continue;
      }
      if (!a.cidade) { semLocalizacao++; console.log(`  – ${rotulo} a janela do anúncio não traz localização`); await dormir(PAUSA_MS); continue; }

      achadas.set(a.cidade, (achadas.get(a.cidade) ?? 0) + 1);
      if (!CONFERIR) {
        const { error } = await supabase
          .from("opportunities")
          .update({ cidade: a.cidade, estado: a.estado ?? null })
          .eq("id", o.id);
        if (error) { erros++; console.log(`  ✗ ${rotulo} ${error.message.slice(0, 50)}`); await dormir(PAUSA_MS); continue; }
      }
      recuperados++;
      console.log(`  ✓ ${rotulo} ${a.cidade}${a.estado ? ` / ${a.estado}` : ""}`);
    } catch (e) {
      if (e instanceof SessaoExpirada) { console.log("\n❌ SESSÃO DO FACEBOOK CAÍDA — parando aqui."); break; }
      erros++;
      console.log(`  ✗ ${rotulo} ${(e as Error).message.slice(0, 60)}`);
    }
    await dormir(PAUSA_MS);
  }

  console.log(`\n✓ ${recuperados} com cidade recuperada`);
  console.log(`  ${semLocalizacao} sem localização na própria página — seguem fora da vitrine, de propósito`);
  console.log(`  ${foraDoAr} fora do ar`);
  console.log(`  ${recusados} vivos mas recusados pelo parser`);
  console.log(`  ${erros} erro(s)`);
  if (achadas.size) {
    console.log("\ncidades encontradas:");
    for (const [c, n] of [...achadas].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${c}`);
  }
  await fecharContexto();
}

main()
  .catch((e) => { console.error("falhou:", (e as Error).message); process.exitCode = 1; })
  .finally(async () => { await fecharContexto().catch(() => {}); soltarTrava(); });
