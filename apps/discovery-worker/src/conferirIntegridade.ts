import "dotenv/config";
import { supabase } from "./supabaseClient.js";
const { count: total } = await supabase.from("opportunities").select("id",{count:"exact",head:true}).eq("pais","PY");
const { count: comModelo } = await supabase.from("opportunities").select("id",{count:"exact",head:true}).eq("pais","PY").not("modelo","is",null);
const { count: comFoto } = await supabase.from("opportunities").select("id",{count:"exact",head:true}).eq("pais","PY").not("foto_principal","is",null);
const { count: duplicados } = await supabase.from("opportunities").select("id",{count:"exact",head:true}).eq("pais","PY").is("veiculo_bruto",null).not("modelo","is",null);
console.log(`PY total: ${total}  |  com modelo: ${comModelo}  |  com foto: ${comFoto}`);
console.log(`normalizados sem veiculo_bruto (sinal de regravação indevida): ${duplicados}`);
