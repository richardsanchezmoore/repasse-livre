"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";

/**
 * Registra um evento de comportamento (busca/filtro, visualização de
 * oportunidade, clique no WhatsApp — ver migration 0020_eventos_analytics.sql)
 * pra alimentar relatórios futuros (Frente 2 do roadmap). Fire-and-forget:
 * nunca lança erro pro chamador, analytics não pode quebrar a experiência
 * de quem está navegando.
 */
export async function registrarEvento(
  tipo: "busca" | "visualizacao_oportunidade" | "clique_whatsapp",
  payload: Record<string, unknown> = {},
  opportunityId?: string
): Promise<void> {
  try {
    const usuario = await obterUsuarioAtual();
    const { error } = await supabaseAdmin.from("eventos_analytics").insert({
      tipo,
      payload,
      opportunity_id: opportunityId ?? null,
      usuario_id: usuario?.id ?? null,
    });
    if (error) {
      console.error(`[eventos-analytics] Falha ao registrar evento "${tipo}":`, error.message);
    }
  } catch (erro) {
    console.error(`[eventos-analytics] Falha ao registrar evento "${tipo}":`, erro);
  }
}
