import "dotenv/config";
import fs from "node:fs";
import crypto from "node:crypto";
import { supabase } from "./supabaseClient.js";
import type { AnuncioGrupo } from "./capturarGruposPY.js";

/**
 * Importa os anúncios colhidos nos GRUPOS para `opportunities`.
 *
 * ⚠️⚠️ O PROBLEMA DA CHAVE, e como resolvi — medido em 07/10/2026:
 *
 * `link_origem` é a chave anti-duplicata da tabela. Mas o Facebook **só
 * renderiza o permalink em alguns cards**: na colheita de hoje foram 10 links
 * em 82 posts no primeiro grupo e ZERO em 77 no segundo.
 *
 * Então: quando há permalink, uso ele (e o anúncio fica clicável). Quando não
 * há, monto uma chave SINTÉTICA a partir do grupo + hash do texto:
 *
 *     https://www.facebook.com/groups/<id>#p-<hash12>
 *
 * ★ Ela é estável (o mesmo post dá sempre o mesmo hash, então a próxima rodada
 * não duplica) e o endereço base ABRE O GRUPO — não o post exato, mas leva a
 * algum lugar útil em vez de ser um identificador morto.
 *
 * ⚠️ E é honesta sobre a limitação: `atributos_olx.link_exato = "não"` marca
 * quais não têm permalink, para a tela poder avisar em vez de prometer.
 *
 * ★ Entra como `status='descoberta'`, não `aprovada`: texto livre de grupo é
 * material mais sujo que anúncio de Marketplace, e passar pela curadoria antes
 * de ir para a tabela de preço é o certo enquanto a amostra é pequena.
 */

const DIR = process.argv[2] ?? "C:/claude/backup-autoradar/grupos";

/** Id do grupo a partir da URL conhecida, para montar a chave sintética. */
const URL_DO_GRUPO: Record<string, string> = {
  "autitos baratitos": "https://www.facebook.com/groups/522751401231608",
  "Aiyellow CDE": "https://www.facebook.com/groups/aiyellowpyciudaddeleste",
};

const hash12 = (s: string) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);

async function main() {
  const arquivos = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
  const todos: AnuncioGrupo[] = arquivos.flatMap(
    (f) => JSON.parse(fs.readFileSync(`${DIR}/${f}`, "utf8")) as AnuncioGrupo[],
  );

  const bons = todos.filter((a) => !a.descarte && a.preco && a.modelo);
  console.log(`${todos.length} posts no disco · ${bons.length} com preço e modelo`);

  let gravados = 0, jaExistiam = 0, erros = 0, semLink = 0;

  for (const a of bons) {
    const base = URL_DO_GRUPO[a.grupo] ?? "https://www.facebook.com/groups";
    const temLink = Boolean(a.link);
    if (!temLink) semLink++;
    const link = a.link ?? `${base}#p-${hash12(a.grupo + "|" + a.texto)}`;

    // ⚠️ Só monta o nome com o que foi RECONHECIDO. Jogar o texto cru em
    // `veiculo` traria "RECIEN IMPORTADO 20 MILLONES" para dentro do campo que
    // a tabela de preço agrupa.
    const veiculo = [a.marca, a.modelo, a.ano].filter(Boolean).join(" ");

    const { error } = await supabase.from("opportunities").upsert({
      fonte: "FACEBOOK_GRUPO",
      pais: "PY",
      link_origem: link,
      veiculo,
      ano: a.ano ? String(a.ano) : null,
      preco: a.preco,
      moeda: a.moeda,
      procedencia: a.procedencia,
      // ⚠️ cidade NULA de propósito: post de grupo não declara localização, e
      // chutar a cidade do grupo misturaria mercados — foi o erro que marcou 9
      // anúncios de Pedro Juan como "Foz do Iguaçu".
      cidade: null,
      estado: null,
      fipe_valor: null,
      margem_percentual: null,
      classificacao: null,
      descricao: a.texto,
      foto_principal: null,
      fotos_secundarias: [],
      origem_tipo: "descoberta",
      status: "descoberta",
      atributos_olx: {
        grupo: { label: "Grupo", value: a.grupo },
        link_exato: { label: "Link do post exato", value: temLink ? "sim" : "não" },
        leitura_preco: { label: "Como li o preço", value: a.confianca ?? "—" },
        ...(a.aceitaTroca ? { aceita_troca: { label: "Aceita troca", value: "Sim" } } : {}),
      },
      ultimo_visto: new Date().toISOString(),
    }, { onConflict: "link_origem" });

    if (error) { erros++; console.log(`  ✗ ${veiculo}: ${error.message.slice(0, 70)}`); }
    else { gravados++; console.log(`  ✓ ${veiculo.padEnd(28)} ${a.moeda} ${Number(a.preco).toLocaleString("es-PY")}${temLink ? "" : "  (sem link exato)"}`); }
  }

  console.log(`\n${gravados} gravados · ${erros} erro(s) · ${semLink} sem permalink`);
  const { count } = await supabase.from("opportunities")
    .select("id", { count: "exact", head: true }).eq("fonte", "FACEBOOK_GRUPO");
  console.log(`total de FACEBOOK_GRUPO na base: ${count}`);
}

main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
