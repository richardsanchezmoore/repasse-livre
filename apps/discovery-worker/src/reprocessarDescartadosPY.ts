import "dotenv/config";
import fs from "node:fs";
import { supabase, registrarVistoFacebook } from "./supabaseClient.js";
import { baixarLogado, fecharContexto, SessaoExpirada } from "./navegadorFacebook.js";
import { extrairAnuncioFacebook, montarVeiculoPadrao } from "./facebookMarketplaceService.js";
import { lerPrecoComContexto, lerProcedencia, mencionaTroca, precoDeclarado } from "./precoParaguai.js";
import { normalizarVeiculoPY } from "./modeloParaguai.js";
import { conferirAnoModelo } from "./anoModeloPY.js";
import { geracaoDoAno } from "./geracoesPY.js";

/**
 * SEGUNDA CHANCE para quem foi descartado por preço.
 *
 * ★ POR QUE EXISTE: o mutirão de 09/10/2026 descartou 208 de 719 anúncios (29%)
 * em `fora_de_faixa`. Investigando, o campo de preço era isca — ₲105 num Hilux,
 * confirmado no JSON do próprio Facebook — e o preço de verdade estava escrito
 * na descrição. O resgate agora existe na captação, mas esses 208 já passaram.
 *
 * ⚠️ NÃO APAGA O LIVRO-RAZÃO para forçar reprocesso. Apagar faria a varredura
 * normal reabrir esses anúncios para sempre, a cada rodada, mesmo os que são
 * lixo de verdade. Este script visita os descartados UMA vez, com a regra nova,
 * e atualiza o status de quem foi recuperado.
 *
 * ⚠️ Só mexe em quem caiu por PREÇO. Quem foi descartado por ser anúncio de
 * compra, desmanche ou telefone não ganha segunda chance — a regra que os
 * barrou não mudou.
 */
const TRAVA = "C:/claude/fb-sessao-py.lock";
function tomarTrava(): boolean {
  try {
    const { pid } = JSON.parse(fs.readFileSync(TRAVA, "utf8")) as { pid: number };
    try { process.kill(pid, 0); if (pid !== process.pid) { console.log(`⛔ perfil ocupado (pid ${pid})`); return false; } } catch { /* órfã */ }
  } catch { /* sem trava */ }
  fs.writeFileSync(TRAVA, JSON.stringify({ pid: process.pid, inicio: new Date().toISOString() }));
  return true;
}
const soltarTrava = () => {
  try {
    const { pid } = JSON.parse(fs.readFileSync(TRAVA, "utf8")) as { pid: number };
    if (pid === process.pid) fs.unlinkSync(TRAVA);
  } catch { /* já foi */ }
};
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PAUSA = Number(process.env.PY_PACING ?? 1000);
const ESPERA = Number(process.env.PY_ESPERA_ITEM ?? 1200);
const LIMITE = Number(process.env.PY_LIMITE ?? 400);
/** Só os motivos que a regra nova pode reverter. */
const MOTIVOS = ["fora_de_faixa", "sem_preco", "preco_isca", "escala_ambigua"];

async function main() {
  if (!tomarTrava()) return;

  const { data, error } = await supabase
    .from("fb_vistos")
    .select("item_id, status")
    .in("status", MOTIVOS)
    .limit(LIMITE);
  if (error) throw new Error(error.message);
  const alvos = data ?? [];
  console.log(`${alvos.length} anúncio(s) descartado(s) por preço · tentando de novo com o resgate da descrição\n`);

  let recuperados = 0, seguemFora = 0, foraDoAr = 0;

  for (const [i, alvo] of alvos.entries()) {
    const id = String(alvo.item_id);
    try {
      const html = await baixarLogado(`https://www.facebook.com/marketplace/item/${id}/?locale=es_LA`, ESPERA);
      const a = extrairAnuncioFacebook(html, id, { exigirMotor: false })?.anuncio;
      if (!a) { foraDoAr++; await dormir(PAUSA); continue; }

      const j = html.indexOf('"redacted_description"');
      const textoPreco = html.slice(Math.max(0, j - 9000), j + 9000)
        .match(/"formatted_price":\{"text":"([^"]+)"/)?.[1] ?? "";
      const doCampo = lerPrecoComContexto(textoPreco, `${a.titulo ?? ""} ${a.descricao ?? ""}`);
      const resgate = doCampo.ok ? null : precoDeclarado(a.descricao ?? "");

      if (!doCampo.ok && !(resgate && resgate.ok)) {
        seguemFora++;
        await dormir(PAUSA);
        continue;
      }

      const valor = doCampo.ok ? doCampo.valor : (resgate as { ok: true; valor: number }).valor;
      const moeda = doCampo.ok ? doCampo.moeda : (resgate as { ok: true; moeda: string }).moeda;
      const confianca = doCampo.ok ? (doCampo.confianca ?? "simbolo") : "resgatado_da_descricao";

      const tituloCru = montarVeiculoPadrao(a) || a.titulo || "";
      const norm = normalizarVeiculoPY(tituloCru);
      const anoCru = a.ano ?? norm.ano ?? null;
      const anoNum = anoCru == null || anoCru === "" ? null : Number(anoCru);
      const ano = Number.isFinite(anoNum) ? (anoNum as number) : null;
      const conf = conferirAnoModelo(norm.modelo?.toLowerCase() ?? null, ano);
      const ger = geracaoDoAno(norm.modelo, ano);

      const { error: e } = await supabase.from("opportunities").upsert(
        {
          fonte: "FACEBOOK",
          pais: "PY",
          link_origem: `https://www.facebook.com/marketplace/item/${id}`,
          veiculo: norm.marca && norm.modelo
            ? [norm.marca, norm.modelo, ano].filter(Boolean).join(" ")
            : tituloCru,
          veiculo_bruto: tituloCru,
          marca: norm.marca,
          modelo: norm.modelo,
          segmento: norm.segmento,
          geracao: ger?.codigo ?? null,
          ano_suspeito: conf.problema === "antes_de_existir" || conf.problema === "depois_do_fim",
          ano,
          preco: valor,
          moeda,
          descricao: a.descricao,
          procedencia: lerProcedencia(`${a.titulo ?? ""} ${a.descricao ?? ""}`),
          // ⚠️ Sem foto: este script é de recuperação de PREÇO. O backfill de
          // fotos passa depois, e re-hospedar aqui dobraria o tempo.
          foto_principal: null,
          origem_tipo: "descoberta",
          status: "descoberta",
          atributos_olx: {
            ...(mencionaTroca(a.titulo ?? "", a.descricao ?? "") ? { aceita_troca: { label: "Aceita troca", value: "Sim" } } : {}),
            confianca_moeda: { label: "Confiança da moeda", value: confianca },
          },
        },
        { onConflict: "link_origem" },
      );
      if (e) { console.log(`  ✗ ${id}: ${e.message.slice(0, 50)}`); await dormir(PAUSA); continue; }

      await registrarVistoFacebook(id, "salvo");
      recuperados++;
      console.log(`  ✓ ${String(i + 1).padStart(3)} ${String(a.titulo ?? "").slice(0, 36).padEnd(36)} ${moeda} ${valor.toLocaleString("es-PY")} [${confianca}]`);
    } catch (err) {
      if (err instanceof SessaoExpirada) {
        console.log(`\n⚠️ SESSÃO CAIU — parando com ${recuperados} recuperados.`);
        break;
      }
      foraDoAr++;
    }
    await dormir(PAUSA);
  }

  console.log(`\n★ ${recuperados} recuperados · ${seguemFora} seguem sem preço legível · ${foraDoAr} fora do ar/sem parse`);
}

main()
  .catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; })
  .finally(async () => { await fecharContexto().catch(() => {}); soltarTrava(); });
