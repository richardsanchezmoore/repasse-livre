import { createClient } from "@supabase/supabase-js";
import { offerIdDaUrl } from "./caktoUrl";

// O ID da oferta na Cakto é DADO DO PRODUTO, não credencial — mora no painel.
// Trocar de produto/conta vira só colar o LINK de checkout no painel: o offer id
// é EXTRAÍDO da URL automaticamente (um campo só). Resolvido SEMPRE no servidor
// (o cliente não pode forjar uma oferta mais barata).
// Ordem: extrai da cakto_url (fonte única) → cakto_offer_id manual (override) → env → default.
export async function offerIdAtivo() {
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (u, o = {}) => fetch(u, { ...o, cache: "no-store" }) },
    });
    const { data } = await admin.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
    const kit = data?.valor?.kit || {};
    const daUrl = offerIdDaUrl(kit.cakto_url);
    if (daUrl) return daUrl;
    if (kit.cakto_offer_id) return String(kit.cakto_offer_id).trim();
  } catch { /* cai no fallback */ }
  return (process.env.CAKTO_OFFER_ID || "3fowby7").trim();
}
