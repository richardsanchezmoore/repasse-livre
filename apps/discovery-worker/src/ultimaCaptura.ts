import "dotenv/config";
import { supabase } from "./supabaseClient.js";
const { data } = await supabase.from("opportunities").select("data_captura").eq("pais","PY").order("data_captura",{ascending:false}).limit(1);
console.log("último anúncio salvo:", data?.[0]?.data_captura ?? "(nenhum)");
const { count } = await supabase.from("opportunities").select("id",{count:"exact",head:true}).eq("pais","PY");
console.log("total PY:", count);
