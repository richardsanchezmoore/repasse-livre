import "dotenv/config";
import { supabase } from "./supabaseClient.js";
const { data } = await supabase.from("opportunities")
  .select("id, veiculo_bruto, descricao, preco, km, cidade, link_origem")
  .eq("pais","PY").eq("marca","Toyota").eq("modelo","Vitz").eq("ano","2007");
for (const o of data ?? []) {
  console.log(`\n₲${Number(o.preco).toLocaleString("es-PY")} · km=${o.km} · ${o.cidade}`);
  console.log(`  titulo: ${String(o.veiculo_bruto ?? "").slice(0,70)}`);
  console.log(`  desc:   ${String(o.descricao ?? "(vazia)").replace(/\s+/g," ").slice(0,90)}`);
  console.log(`  link:   ...${String(o.link_origem).slice(-20)}`);
}
