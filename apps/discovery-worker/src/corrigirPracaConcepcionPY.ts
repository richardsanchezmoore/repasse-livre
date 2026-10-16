import "dotenv/config";
import { supabase, lerConfig } from "./supabaseClient.js";

/**
 * ★★★ A PRAÇA "CONCEPCIÓN" É A DO CHILE — achado em 16/10/2026.
 *
 * ⚠️⚠️ A URL configurada era `/marketplace/concepcion/carros/`: um slug de
 * NOME, sem id de localidade. O Facebook resolve nome ambíguo para a cidade
 * maior, e Concepción do Chile tem 220 mil habitantes contra 80 mil da
 * paraguaia. Varremos o Chile por dias sem notar.
 *
 * ★ COMO APARECEU: medindo a sobreposição entre praças (`fb_buscas`), Asunción
 * e Luque devolviam 100% os mesmos ids, e Concepción devolvia 100% ids que
 * NENHUMA outra praça via — 1.989 em 19 rodadas. Praça vizinha que não
 * compartilha nada com ninguém não é praça vizinha.
 *
 * ★★ A CONFIRMAÇÃO veio do texto e do preço, nessa ordem:
 *
 *   "BENCINERO" (no Paraguai se diz nafta) · "se puede ver en Santiago centro"
 *   "permiso de circulación" · "revisión técnica" · "comuna"
 *
 *   mediana de Concepción: ₲11.500.000
 *   mediana de TODAS as outras:  ₲40 a 58 milhões
 *
 * Um Kia Seltos 2022 a "$13.490.000" é CLP 13,5 milhões (uns US$ 14 mil, preço
 * certo no Chile) e entrou como ₲13.490.000 — uns US$ 1.800. Todo modelo que
 * existe nos dois países teve a mediana puxada para baixo por isto.
 *
 * ⚠️ A CORREÇÃO É DE DADO, NÃO DE DOMÍNIO (regra do Gustavo, do Auto Radar:
 * separar eras por dado, nunca por domínio). Esses anúncios são fatos
 * VERDADEIROS sobre o Chile e falsos sobre o Paraguai:
 *
 *   1. `opportunities.pais` → 'CL'. A coluna já existe e o site inteiro filtra
 *      por `PAIS_DO_SITE`, então isto os tira de TODA consulta de uma vez —
 *      vitrine, contagens, sitemap, alertas — sem apagar uma linha.
 *   2. `py_observacoes_preco.pais` → 'CL' (migração 0099). A mediana sai do
 *      livro, e o livro sobrevive ao anúncio de propósito: sem isto o preço
 *      chileno seguiria na tabela com os anúncios já fora do ar.
 *   3. A praça sai de `FACEBOOK_REGIOES`, senão a próxima volta repõe tudo.
 *
 * ⚠️ `cidade = 'Concepción'` identifica o grupo com segurança porque a cidade
 * do anúncio vem do NOME DA PRAÇA (`localDaRegiao`), não do texto: só quem
 * veio dessa praça tem esse valor.
 *
 * ⚠️ Para RESTAURAR a praça depois, com id de localidade correto, o valor
 * antigo da config é impresso inteiro antes de qualquer escrita.
 *
 * Uso: npx tsx src/corrigirPracaConcepcionPY.ts [--aplicar]
 */
const APLICAR = process.argv.includes("--aplicar");
const CIDADE = "Concepción";

const idDoLink = (link: string | null): string | null =>
  String(link ?? "").match(/\/item\/(\d+)/)?.[1] ?? null;

async function main() {
  const alvos: any[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, veiculo, preco, moeda, status, link_origem")
      .eq("pais", "PY")
      .eq("cidade", CIDADE)
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    alvos.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const aprovados = alvos.filter((a) => a.status === "aprovada").length;
  const comPreco = alvos.filter((a) => a.preco != null);
  const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

  console.log(`${alvos.length} anúncios da praça "${CIDADE}" · ${aprovados} publicados`);
  console.log(`mediana em guarani: ₲${med(comPreco.filter((a) => a.moeda === "PYG").map((a) => Number(a.preco))).toLocaleString("es-PY")}`);

  const reg = await lerConfig("FACEBOOK_REGIOES");
  const lista = JSON.parse(String(reg ?? "[]")) as Array<{ nome: string; url: string }>;
  const sobra = lista.filter((r) => !/concepci/i.test(r.nome));
  console.log(`\npraças: ${lista.length} → ${sobra.length}`);
  console.log(`\n⚠️ VALOR ANTIGO DA CONFIG (para restaurar com id de localidade correto):`);
  console.log(JSON.stringify(lista.find((r) => /concepci/i.test(r.nome))));

  if (!APLICAR) {
    console.log(`\n⚠️ SECO. Nada foi gravado. Para aplicar:  --aplicar`);
    return;
  }

  // 1) o país dos anúncios
  let mexidos = 0;
  for (let i = 0; i < alvos.length; i += 100) {
    const lote = alvos.slice(i, i + 100).map((a) => a.id);
    const { data, error } = await supabase.from("opportunities").update({ pais: "CL" }).in("id", lote).select("id");
    if (error) { console.log(`  ✗ ${error.message.slice(0, 70)}`); continue; }
    mexidos += (data ?? []).length;
  }

  // 2) o país das observações
  const itemIds = alvos.map((a) => idDoLink(a.link_origem)).filter(Boolean) as string[];
  let obs = 0;
  // ⚠️ Lotes de 50: `in` com centenas de ids estoura a URL do PostgREST e
  // falha com erro que não diz o motivo.
  for (let i = 0; i < itemIds.length; i += 50) {
    const lote = itemIds.slice(i, i + 50);
    const { data, error } = await supabase.from("py_observacoes_preco").update({ pais: "CL" }).in("item_id", lote).select("id");
    if (error) { console.log(`  ✗ livro: ${error.message.slice(0, 70)}`); continue; }
    obs += (data ?? []).length;
  }

  // 3) a praça sai da configuração
  const { error: eCfg } = await supabase.from("worker_config").update({ valor: JSON.stringify(sobra) }).eq("chave", "FACEBOOK_REGIOES");
  if (eCfg) console.log(`  ✗ config: ${eCfg.message.slice(0, 70)}`);

  console.log(`\n★ ${mexidos} anúncios agora são CL · ${obs} observações remarcadas · praça ${eCfg ? "NÃO" : ""} removida da varredura`);
  console.log(`  Próximo passo: npx tsx src/publicarTabelaPY.ts  (a mediana precisa ser recalculada sem o Chile)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
