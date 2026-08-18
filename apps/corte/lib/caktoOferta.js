import { createClient } from "@supabase/supabase-js";

// O ID da oferta na Cakto é DADO DO PRODUTO, não credencial — mora no painel
// (corte_config.planos.kit.cakto_offer_id). Trocar de produto/projeto vira só
// editar o painel, sem mexer em env. Resolvido SEMPRE no servidor (o cliente
// não pode forjar uma oferta mais barata).
// Ordem: painel → env CAKTO_OFFER_ID (fallback) → default.
export async function offerIdAtivo() {
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (u, o = {}) => fetch(u, { ...o, cache: "no-store" }) },
    });
    const { data } = await admin.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
    const id = data?.valor?.kit?.cakto_offer_id;
    if (id) return String(id).trim();
  } catch { /* cai no fallback */ }
  return (process.env.CAKTO_OFFER_ID || "3fowby7").trim();
}
