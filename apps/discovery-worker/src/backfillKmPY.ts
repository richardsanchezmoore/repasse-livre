import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { lerKm } from "./kmParaguai.js";

/**
 * ═══ KM QUE ESTAVA NA DESCRIÇÃO E NINGUÉM LIA ═════════════════════════════
 *
 * ★ Companheiro de ter ligado `lerKm` na captação (15/10/2026). Aquele vale
 * para o que entra; este recupera o que já entrou — e a varredura não reabre
 * anúncio que está no livro `fb_vistos`.
 *
 * ★★ O caso que o Gustavo viu: "Kia Sportage 2018 De Garden flex, automático,
 * sin detalles, **98mil km**" com o campo KM vazio na página. O número estava
 * no texto o tempo todo.
 *
 * ⚠️⚠️ NÃO APAGA KM EXISTENTE sem motivo. A regra é a do `lerKm`:
 *   • campo vazio + texto tem número  → preenche
 *   • campo e texto batem             → mantém, marca "informado"
 *   • campo é REDONDO SUSPEITO e o texto diverge → o texto vence
 *   • campo divergente mas não suspeito → mantém e marca "duvidoso"
 *
 * O redondo suspeito não é teoria: 10.000 km aparece em 53% da base e 1.000 km
 * em 13% — é o vendedor passando da validação do formulário, não o carro.
 *
 * ⚠️ Grava também a CONFIANÇA em `atributos_olx.confianca_km`: quem for
 * filtrar por quilometragem um dia precisa poder separar o informado do
 * inventado. Sem isso, um filtro "até 50.000 km" devolveria metade da base
 * por causa dos 10.000 fabricados.
 *
 * Uso: npx tsx src/backfillKmPY.ts [--aplicar]
 */
const APLICAR = process.argv.includes("--aplicar");

interface Linha {
  id: string;
  veiculo: string | null;
  veiculo_bruto: string | null;
  descricao: string | null;
  km: number | null;
  atributos_olx: Record<string, unknown> | null;
}

async function main() {
  const linhas: Linha[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, veiculo, veiculo_bruto, descricao, km, atributos_olx")
      .eq("pais", "PY")
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    linhas.push(...((data ?? []) as Linha[]));
    if (!data || data.length < 1000) break;
  }

  let preenchidos = 0;
  let corrigidos = 0;
  let semMudanca = 0;
  const amostra: string[] = [];

  const mudancas: { id: string; km: number | null; confianca: string; attrs: Record<string, unknown> }[] = [];

  for (const l of linhas) {
    const texto = `${l.veiculo_bruto || l.veiculo || ""} ${l.descricao || ""}`;
    const leitura = lerKm(l.km, texto);
    const antes = l.km == null ? null : Number(l.km);

    const confianciaAtual = (l.atributos_olx as Record<string, { value?: string }> | null)?.confianca_km?.value;
    if (leitura.km === antes && confianciaAtual === leitura.confianca) {
      semMudanca++;
      continue;
    }

    /**
     * ⚠️⚠️ ANÚNCIO SEM KM NENHUM NÃO É ESCRITA. Sem esta guarda o backfill
     * marcava `confianca_km: "ausente"` em TODA a base — 6.537 UPDATEs para
     * registrar que não se sabe nada, e egress foi o que derrubou este projeto
     * em 02/10. "Ausente" é a ausência do atributo; não precisa ser escrito.
     */
    if (leitura.km === null && antes === null) {
      semMudanca++;
      continue;
    }

    if (antes === null && leitura.km !== null) {
      preenchidos++;
      if (amostra.length < 12)
        amostra.push(
          `  + ${String(leitura.km.toLocaleString("es-PY")).padStart(9)} km  ${String(l.veiculo_bruto || l.veiculo).slice(0, 40)}`
        );
    } else if (antes !== null && leitura.km !== antes) {
      corrigidos++;
      if (amostra.length < 12)
        amostra.push(
          `  ~ ${String(antes.toLocaleString("es-PY")).padStart(9)} → ${String((leitura.km ?? 0).toLocaleString("es-PY")).padStart(9)} km  ${String(l.veiculo_bruto || l.veiculo).slice(0, 32)}`
        );
    }

    mudancas.push({
      id: l.id,
      km: leitura.km,
      confianca: leitura.confianca,
      attrs: {
        ...(l.atributos_olx ?? {}),
        confianca_km: { label: "Confiança do km", value: leitura.confianca },
      },
    });
  }

  console.log(`${linhas.length} anúncios PY${APLICAR ? "" : "  (ENSAIO — nada gravado)"}`);
  console.log(`  ${preenchidos} com km RECUPERADO do texto (campo estava vazio)`);
  console.log(`  ${corrigidos} com km corrigido (campo era redondo suspeito e o texto diverge)`);
  console.log(`  ${semMudanca} já estavam como o leitor diz — nenhuma escrita`);
  console.log(`  ${mudancas.length} linha(s) a gravar\n`);
  for (const a of amostra) console.log(a);

  if (!APLICAR || !mudancas.length) {
    if (!APLICAR) console.log("\n(seco — use --aplicar para gravar.)");
    return;
  }

  let ok = 0;
  for (const m of mudancas) {
    const { error } = await supabase
      .from("opportunities")
      .update({ km: m.km, atributos_olx: m.attrs })
      .eq("id", m.id);
    if (error) console.log(`  ✗ ${m.id}: ${error.message.slice(0, 55)}`);
    else ok++;
    if (ok % 250 === 0) console.log(`  ${ok}/${mudancas.length}`);
  }
  console.log(`\n✓ ${ok} atualizados`);
}

main().catch((e) => {
  console.error("falhou:", (e as Error).message);
  process.exitCode = 1;
});
