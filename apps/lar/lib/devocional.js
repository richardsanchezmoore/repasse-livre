import { supabaseAdmin } from "./supabaseAdmin";
import { gerarDevocional } from "./marta";

function hojeISO() { return new Date().toISOString().slice(0, 10); }

/** Devocional do dia — o MESMO pra todas, gerado UMA vez por dia e cacheado em
 *  lar_config (chave devocional:AAAA-MM-DD). Custo: 1 chamada de API por dia no total. */
export async function devocionalDeHoje() {
  const chave = "devocional:" + hojeISO();
  const admin = supabaseAdmin();
  const { data } = await admin.from("lar_config").select("valor").eq("chave", chave).maybeSingle();
  if (data?.valor?.reflexao) return data.valor;

  const dev = await gerarDevocional();
  if (!dev) return null;
  await admin.from("lar_config").upsert(
    { chave, valor: dev, atualizado_em: new Date().toISOString() },
    { onConflict: "chave" }
  );
  return dev;
}
