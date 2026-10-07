import "dotenv/config";
import { supabase } from "./supabaseClient.js";

for (const [marca, modelo, ano] of [["Toyota","Vitz","2010"],["Toyota","Vitz","2007"],["Toyota","Ractis","2011"]] as const) {
  const { data } = await supabase.from("opportunities")
    .select("preco, moeda, km, cidade, veiculo_bruto, fonte, link_origem")
    .eq("pais","PY").eq("marca",marca).eq("modelo",modelo).eq("ano",ano).order("preco");
  console.log(`\n=== ${marca} ${modelo} ${ano} (n=${(data??[]).length}) ===`);
  for (const o of data ?? []) {
    console.log(`  ${String(Number(o.preco).toLocaleString("es-PY")).padStart(13)} ${o.moeda}  km=${String(o.km ?? "—").padStart(7)}  ${String(o.cidade ?? "?").slice(0,16).padEnd(16)} ${String(o.fonte).slice(0,9).padEnd(9)} ${String(o.veiculo_bruto ?? "").slice(0,46)}`);
  }
}
