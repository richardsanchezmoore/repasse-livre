import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { gravarCodigoAprendido } from "./mapaAprendidoFipe.js";
import type { ReferenciaFipe } from "./types.js";

/**
 * Aprendizado MANUAL de código FIPE quando a âncora de valor não encaixa
 * sozinha (ex.: FIPE cataloga o carro sob combustível diferente do da OLX —
 * o Land Rover Discovery Sport 2020 é "Híbrido" na FIPE mas "Diesel" na OLX;
 * a Chery/Citroën/LR já precisaram disso). O especialista informa o código e
 * gravamos em DOIS lugares:
 *   1. opportunities.fipe_codigo do anúncio (destrava a série histórica);
 *   2. fipe_mapa_aprendido (assinatura da versão + ano) → todos os anúncios
 *      idênticos futuros resolvem por HIT direto, sem fuzzy nem FIPE.
 *
 * NUNCA mexe em fipe_valor/margem — a margem da OLX é a da página.
 *
 * Uso: tsx aprenderCodigoFipeManual.ts <id> <codigoFipe> [anoModelo] [--aplicar]
 *   ex.: tsx aprenderCodigoFipeManual.ts 928dd7fe-... 033173-2 2020 --aplicar
 */

const APLICAR = process.argv.includes("--aplicar");
const args = process.argv.slice(2).filter((a) => a !== "--aplicar");
const [id, codigoFipe, anoModeloArg] = args;

async function main(): Promise<void> {
  if (!id || !codigoFipe) {
    throw new Error("uso: tsx aprenderCodigoFipeManual.ts <id> <codigoFipe> [anoModelo] [--aplicar]");
  }

  const { data, error } = await supabase
    .from("opportunities")
    .select("id, fonte, veiculo, versao, ano, fipe_valor, fipe_codigo")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`anúncio não encontrado: ${id}`);

  const chave = (data.versao ?? data.veiculo) as string; // mesma chave do rematch
  const anoModelo = Number.parseInt(anoModeloArg ?? String(data.ano), 10);
  if (!Number.isFinite(anoModelo)) throw new Error(`anoModelo inválido: ${anoModeloArg ?? data.ano}`);

  const ref: ReferenciaFipe = {
    marca: "",
    modelo: chave,
    ano: String(data.ano),
    valor: data.fipe_valor ?? 0, // valor da página (a OLX congela o FIPE na inserção)
    mesReferencia: "",
    codigoFipe,
    anoModelo,
    siglaCombustivel: "",
    mesReferenciaNum: 0,
    anoReferencia: 0,
  };

  console.log(`[aprender-fipe-manual] ${data.fonte} | ${data.veiculo}`);
  console.log(`  ano=${data.ano} anoModelo=${anoModelo} código=${codigoFipe} (atual: ${data.fipe_codigo ?? "—"})`);
  console.log(`  assinatura aprendida: "${chave}"`);

  if (!APLICAR) {
    console.log("\nDRY-RUN — nada gravado. Rode com --aplicar pra confirmar.");
    process.exit(0);
  }

  const { error: upErr } = await supabase
    .from("opportunities")
    .update({ fipe_codigo: codigoFipe })
    .eq("id", id);
  if (upErr) throw upErr;

  await gravarCodigoAprendido(chave, String(data.ano), ref);

  console.log("\n✅ Gravado: anúncio + base aprendida. Anúncios idênticos resolvem por HIT direto.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
