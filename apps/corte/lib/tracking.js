import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Guarda os sinais de atribuição (fbp/fbc/fbclid/utm) ligados ao order_id no momento
// da compra (quando o navegador está presente). O webhook lê depois pra enriquecer o
// Purchase do Meta CAPI. Best-effort: nunca derruba o fluxo de pagamento.
export async function salvarTracking(orderId, dados) {
  if (!orderId) return;
  const limpo = {};
  for (const k of ["email", "valor", "fbp", "fbc", "fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    if (dados?.[k] != null && dados[k] !== "") limpo[k] = dados[k];
  }
  try {
    await supabaseAdmin()
      .from("corte_tracking")
      .upsert({ order_id: String(orderId), ...limpo }, { onConflict: "order_id" });
  } catch (e) {
    console.error("[tracking] salvar falhou:", e?.message);
  }
}

export async function lerTracking(orderId) {
  if (!orderId) return null;
  try {
    const { data } = await supabaseAdmin()
      .from("corte_tracking")
      .select("*")
      .eq("order_id", String(orderId))
      .maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}
