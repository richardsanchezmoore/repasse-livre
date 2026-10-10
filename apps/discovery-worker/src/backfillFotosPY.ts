import "dotenv/config";
import fs from "node:fs";
import { supabase } from "./supabaseClient.js";
import { baixarLogado, fecharContexto, SessaoExpirada } from "./navegadorFacebook.js";
import { extrairAnuncioFacebook } from "./facebookMarketplaceService.js";
import { rehospedarFotosFacebook, itemIdDoLink } from "./fotosFacebook.js";
import { precoImplausivel } from "./limitePrecoPY.js";

/**
 * BACKFILL DE FOTOS depois da troca de projeto Supabase.
 *
 * ⚠️ POR QUE TODAS precisam: as 128 fotos re-hospedadas em 03/10 ficaram no
 * bucket do projeto ANTIGO, que responde 402 (`exceed_egress_quota`). Não há
 * como copiá-las — o Storage está cortado junto com o resto. As URLs gravadas
 * apontam todas para lá, então hoje nenhum card tem imagem.
 *
 * ★ O caminho é o que o Gustavo apontou: buscar de novo no Facebook. O link do
 * anúncio está guardado, e o que ainda estiver no ar devolve URL de foto NOVA —
 * que a gente re-hospeda direto no bucket novo.
 *
 * ⚠️ ATRITO ESPERADO: anúncio vendido ou removido devolve nada. Isso não é
 * falha do script, é a vida útil do anúncio. Conta separado para a gente saber
 * quanto da base envelheceu.
 *
 * ⚠️ RITMO: é a conta do Gustavo no Facebook, e ela é usável — "tome os
 * devidos cuidados para não bloquearmos". Pausa entre anúncios, e PARA tudo se
 * a sessão cair, em vez de insistir e chamar atenção.
 */
const PAUSA_MS = Number(process.env.FOTOS_PAUSA_MS ?? 4000);
const LIMITE = Number(process.env.FOTOS_LIMITE ?? 400);

/**
 * ⚠️⚠️ ESPERA DA PÁGINA — 2.000ms estavam MATANDO anúncio vivo.
 *
 * Medido em 10/10/2026, depois de o Gustavo questionar minha afirmação de que
 * 222 anúncios estavam mortos: numa amostra de 20 marcados como fora do ar,
 * **ZERO estavam removidos** e **12 (60%) estavam vivos e com foto**. Honda
 * Navi com 5, Mustang com 8, Corolla Runx com 6 — todos lá.
 *
 * A página do anúncio monta as fotos por GraphQL DEPOIS do primeiro paint.
 * Com 2s a gente lia a casca e concluía "sem foto na página (vendido?)".
 *
 * ★ Terceira vez na semana que espera curta demais produz conclusão errada: na
 * rolagem, 700ms separavam 38 de 500 ids; na leitura do HTML, lia-se a casca.
 * O padrão é sempre o mesmo — o Facebook responde rápido e COMPLETA depois, e
 * quem lê no meio conclui que não há nada.
 */
const ESPERA_MS = Number(process.env.FOTOS_ESPERA_MS ?? 5000);

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * ⚠️ MESMA TRAVA do resto do motor. Quarto script a abrir o mesmo
 * `user-data-dir` — duas instâncias de Chrome no mesmo diretório brigam, e
 * foi essa a causa medida das mortes de sessão. Um backfill de 736 anúncios
 * segura o perfil por horas; sem a trava, qualquer varredura que dispare no
 * meio arruína as duas.
 */
const ARQUIVO_TRAVA = "C:/claude/fb-sessao-py.lock";
function tomarTrava(): boolean {
  try {
    const { pid } = JSON.parse(fs.readFileSync(ARQUIVO_TRAVA, "utf8")) as { pid: number };
    try { process.kill(pid, 0); if (pid !== process.pid) { console.log(`⛔ perfil ocupado (pid ${pid}). Saindo.`); return false; } } catch { /* órfã */ }
  } catch { /* sem trava */ }
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
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, link_origem, veiculo, foto_principal, preco, moeda, ano")
    .eq("pais", "PY")
    .like("link_origem", "%/marketplace/item/%")   // post de grupo não tem página de anúncio
    .order("data_captura", { ascending: false })
    .limit(LIMITE);
  if (error) throw new Error(error.message);

  // ⚠️ Só os que precisam: foto nula, ou apontando para o bucket MORTO.
  const precisam = (data ?? []).filter((o) => {
    const f = o.foto_principal as string | null;
    // ⚠️⚠️ LINK CRU DO FBCDN TAMBÉM PRECISA — e esta linha quase virou uma
    // bomba-relógio em 09/10/2026.
    //
    // A captação rápida (PY_SEM_FOTO=1) passou a gravar o link cru do Facebook
    // para o anúncio já nascer com imagem. Só que o teste antigo era "foto
    // nula", e link cru NÃO é nulo — esses anúncios ficariam invisíveis para o
    // backfill, e o fbcdn CADUCA em poucos dias (tem `oe=` com validade).
    //
    // O resultado seria o pior possível: anúncio que parece ter foto hoje e
    // amanhã mostra imagem quebrada, sem ninguém ser avisado, porque o
    // mecanismo de conserto não o enxergava.
    const cru = Boolean(f && /fbcdn\.net|\.fbcdn\./i.test(f));
    return !f || cru || f.includes("chuvlvwctwkeviencfuy");
  });

  // ★★ SÓ OS QUE TÊM PREÇO COERENTE — regra do Gustavo (09/10/2026):
  // *"não adianta fazer backfill de fotos de anúncios que não estão com
  // preços coerentes"*.
  //
  // ⚠️ Não é só ordem de execução, é economia dupla: cada foto é download,
  // sharp e upload no bucket. Gastar isso num anúncio que o raio já acusa
  // como implausível é trabalho perdido duas vezes — uma agora, outra quando
  // o anúncio for corrigido ou sair.
  //
  // ⚠️ O raio SINALIZA, não apaga: o anúncio continua na base esperando
  // revisão. O que ele não ganha é foto, que é o recurso caro.
  const alvos = precisam.filter(
    (o) => !precoImplausivel(Number(o.preco), o.ano == null ? null : Number(o.ano), String(o.moeda)),
  );
  const pulados = precisam.length - alvos.length;

  console.log(`${(data ?? []).length} anúncios de Marketplace · ${alvos.length} vão receber foto · ${pulados} pulados por preço implausível\n`);

  let ok = 0, semFoto = 0, foraDoAr = 0, erro = 0;

  for (const [i, o] of alvos.entries()) {
    const id = itemIdDoLink(o.link_origem as string);
    if (!id) { erro++; continue; }

    try {
      const html = await baixarLogado(o.link_origem as string, ESPERA_MS);
      // ⚠️ extrairAnuncioFacebook devolve { anuncio, descartar }, não o anúncio
      // direto. As fotos ficam em .anuncio.fotos.
      const r = extrairAnuncioFacebook(html, id);
      const fotos = (r?.anuncio?.fotos ?? []).slice(0, 10);

      if (!fotos.length) {
        foraDoAr++;
        console.log(`  ○ ${String(i + 1).padStart(3)} ${String(o.veiculo).slice(0, 34).padEnd(34)} sem foto na página (vendido/removido?)`);
      } else {
        const reh = await rehospedarFotosFacebook(id, fotos);
        if (!reh) {
          semFoto++;
          console.log(`  ✗ ${String(i + 1).padStart(3)} ${String(o.veiculo).slice(0, 34).padEnd(34)} re-hospedagem falhou`);
        } else {
          await supabase.from("opportunities")
            .update({ foto_principal: reh.foto_principal, fotos_secundarias: reh.fotos_secundarias })
            .eq("id", o.id);
          ok++;
          console.log(`  ✓ ${String(i + 1).padStart(3)} ${String(o.veiculo).slice(0, 34).padEnd(34)} ${reh.fotos_secundarias.length + 1} foto(s)`);
        }
      }
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        console.log(`\n⚠️ SESSÃO CAIU — parando aqui, com ${ok} já repostas.`);
        console.log(`   Refaça o login (duplo clique em C:\\claude\\login-fb-py.cmd) e rode de novo.`);
        break;
      }
      erro++;
      console.log(`  ✗ ${String(i + 1).padStart(3)} ${String(o.veiculo).slice(0, 34).padEnd(34)} ${(e as Error).message.slice(0, 50)}`);
    }
    await dormir(PAUSA_MS);
  }

  console.log(`\n${ok} com foto nova · ${foraDoAr} fora do ar · ${semFoto} re-hospedagem falhou · ${erro} erro`);
  const { count } = await supabase.from("opportunities")
    .select("id", { count: "exact", head: true }).eq("pais", "PY").not("foto_principal", "is", null);
  console.log(`total PY com foto agora: ${count}`);
  await fecharContexto();
}

main()
  .catch(async (e) => { console.error("falhou:", e.message); process.exitCode = 1; })
  .finally(async () => { await fecharContexto().catch(() => {}); soltarTrava(); });
