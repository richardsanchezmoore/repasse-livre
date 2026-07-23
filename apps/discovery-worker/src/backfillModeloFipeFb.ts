import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { resolverReferenciaFipeEntrada, MARCAS_COMPOSTAS } from "./fipeService.js";
import { modeloDoTextoLivre, modeloEhGenerico, combustivelDoTexto } from "./facebookMarketplaceService.js";

/**
 * BACKFILL: conserta anúncios FB já salvos com modelo "Outro" (título fora do padrão + FIPE
 * casada errada) e/ou combustível não-considerado (diesel/elétrico/híbrido claro na descrição).
 * Re-extrai modelo (da descrição) e combustível, RE-CASA a FIPE e recomputa a margem. NÃO toca
 * no que não muda. Usa a MESMA lógica da captura nova (importa os helpers).
 *
 * Uso: tsx src/backfillModeloFipeFb.ts [--dry] [limite]   (--dry só mostra o antes→depois)
 * FIPE oficial tem throttle → pacing entre itens; rode em lotes.
 */
const DRY = process.argv.includes("--dry");
const LIMITE = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 150);
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const motorDe = (s: string) => s.match(/\b([0-9]\.[0-9])\b/)?.[1] ?? "";
const fmt = (n: number | null) => (n == null ? "—" : `R$${n.toLocaleString("pt-BR")}`);

async function main() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, veiculo, versao, ano, preco, fipe_valor, fipe_codigo, descricao")
    .eq("fonte", "FACEBOOK")
    .eq("status", "aprovada")
    .or("veiculo.ilike.*Outro*,descricao.ilike.*diesel*")
    .limit(LIMITE);
  if (error) {
    console.error("ERRO:", error.message);
    return;
  }
  const lista = data ?? [];
  console.log(`Candidatos (Outro ou diesel): ${lista.length} (limite ${LIMITE}). ${DRY ? "[DRY]" : "[APLICANDO]"}\n`);

  let mudados = 0;
  let iguais = 0;
  let semRef = 0;
  for (const o of lista) {
    // Marca de 2 palavras (Land Rover, Alfa Romeo...) — o split ingênuo pegava "Land" e o
    // modelo virava "Rover" (perdia "Discovery"). Detecta a composta antes.
    const veic = o.veiculo ?? "";
    const marca = MARCAS_COMPOSTAS.find((m) => veic.toLowerCase().startsWith(m.toLowerCase())) ?? veic.split(" ")[0];
    if (!marca || !o.ano) continue;
    const ehOutro = /\bOutro\b/i.test(o.veiculo ?? "");
    const modelo = ehOutro
      ? modeloDoTextoLivre(o.descricao, marca) ?? modeloDoTextoLivre(o.veiculo, marca)
      : (o.veiculo ?? "").replace(new RegExp(`^${marca}\\s+`, "i"), "").replace(/\b(19|20)\d{2}\b.*/, "").replace(/\b\d\.\d\b/, "").trim().split(" ")[0];
    if (!modelo || modeloEhGenerico(modelo)) continue;
    const combustivel = combustivelDoTexto(`${o.veiculo} ${o.descricao ?? ""}`);
    const motor = motorDe(o.versao ?? "") || motorDe(o.veiculo ?? "");

    // Inclui o TRIM (versao) no discriminador — consistente com a captura nova (facebookMain):
    // o fuzzy escolhe o trim certo e sobrevive ao corte top-30. Neutro pros guards.
    const ref = await resolverReferenciaFipeEntrada(marca, modelo, String(o.ano), `${o.versao ?? ""} ${motor} ${combustivel ?? ""}`.trim()).catch(() => null);
    await dormir(400);
    if (!ref) {
      semRef++;
      continue;
    }
    const mudouFipe = ref.valor !== o.fipe_valor || ref.codigoFipe !== o.fipe_codigo;
    if (!ehOutro && !mudouFipe) {
      iguais++;
      continue;
    }
    const novaMargem = ref.valor > 0 ? Number((((ref.valor - o.preco) / ref.valor) * 100).toFixed(2)) : null;
    const marcaDiesel = combustivel && /^(DIESEL|ELETRICO|HIBRIDO)$/.test(combustivel) ? combustivel.charAt(0) + combustivel.slice(1).toLowerCase() : "";
    const novoVeiculo = [marca, modelo, o.ano, motor, marcaDiesel].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

    mudados++;
    console.log(`• ${o.veiculo}  →  ${novoVeiculo}`);
    console.log(`    FIPE ${fmt(o.fipe_valor)} → ${fmt(ref.valor)}  (cod ${o.fipe_codigo ?? "—"}→${ref.codigoFipe})  margem→${novaMargem}%`);

    if (!DRY) {
      await supabase
        .from("opportunities")
        .update({
          veiculo: novoVeiculo,
          fipe_valor: ref.valor,
          fipe_codigo: ref.codigoFipe,
          fipe_data_referencia: ref.mesReferencia,
          margem_percentual: novaMargem,
        })
        .eq("id", o.id);
    }
  }
  console.log(`\nFIM: ${mudados} a corrigir · ${iguais} já ok · ${semRef} sem FIPE resolvível.${DRY ? " (nada escrito — rode sem --dry pra aplicar)" : ""}`);
}

main();
