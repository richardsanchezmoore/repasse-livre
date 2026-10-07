import "dotenv/config";
import { supabase, lerConfig } from "./supabaseClient.js";

/** O worker fala com o banco NOVO pela API (supabase-js), nao so pelo pooler? */
const { count, error } = await supabase
  .from("opportunities").select("id", { count: "exact", head: true }).eq("pais", "PY");
console.log(error ? `API REST: ❌ ${error.message}` : `API REST: ✅ ${count} oportunidades PY`);

const regioes = await lerConfig("FACEBOOK_REGIOES");
const faixas = await lerConfig("FACEBOOK_FAIXAS_PRECO");
console.log(`config: ${regioes ? JSON.parse(regioes).length : 0} praças · ${faixas ? faixas.split(",").length : 0} faixas`);
console.log(`OLX_ATIVO=${await lerConfig("OLX_ATIVO")} · FACEBOOK_ATIVO=${await lerConfig("FACEBOOK_ATIVO")}`);
