"use server";

import { cookies, headers } from "next/headers";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";

const COOKIE_VISITANTE = "rl_vid";
const UM_ANO_SEGUNDOS = 60 * 60 * 24 * 365;

// Bots comuns (crawler de busca, prefetch de link em apps de mensagem, headless).
// Não podem inflar a "procura" — o Copiloto de Compra usa isso como sinal de
// DEMANDA real de gente, não de robô.
const REGEX_BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discord|slack|preview|lighthouse|headless|dataprovider|python-requests|axios|curl|wget|Go-http/i;

/**
 * Visitante anônimo estável (cookie first-party `rl_vid`). Permite contar views
 * ÚNICOS (1 por visitante/anúncio/dia, deduplicado na consulta) mesmo pra quem
 * não está logado — antes só logados tinham identidade (usuario_id). Cria o
 * cookie na 1ª visita. Best-effort.
 */
async function obterVisitorId(): Promise<string | null> {
  try {
    const jar = await cookies();
    const existente = jar.get(COOKIE_VISITANTE)?.value;
    if (existente) return existente;
    const novo = randomUUID();
    jar.set(COOKIE_VISITANTE, novo, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: UM_ANO_SEGUNDOS,
      path: "/",
    });
    return novo;
  } catch {
    return null; // contexto sem cookies mutáveis — segue sem visitor_id
  }
}

async function ehBot(): Promise<boolean> {
  try {
    const ua = (await headers()).get("user-agent") ?? "";
    return REGEX_BOT.test(ua);
  } catch {
    return false;
  }
}

/**
 * Registra um evento de comportamento (busca/filtro, visualização de
 * oportunidade, clique no WhatsApp — ver migration 0020_eventos_analytics.sql)
 * pra alimentar a DEMANDA do Copiloto de Compra (Fase 3 BIA). Fire-and-forget:
 * nunca lança erro pro chamador, analytics não pode quebrar a experiência
 * de quem está navegando. Bots são descartados; o payload denormaliza
 * veiculo/estado (sobrevive à exclusão do anúncio, pra tendência de procura).
 */
export async function registrarEvento(
  tipo: "busca" | "visualizacao_oportunidade" | "clique_whatsapp" | "clique_overlay_premium" | "clique_assinar" | "clique_experimentar_demo",
  payload: Record<string, unknown> = {},
  opportunityId?: string
): Promise<void> {
  try {
    if (await ehBot()) return; // não conta robô como procura
    const [usuario, visitorId] = await Promise.all([obterUsuarioAtual(), obterVisitorId()]);
    const { error } = await supabaseAdmin.from("eventos_analytics").insert({
      tipo,
      payload,
      opportunity_id: opportunityId ?? null,
      usuario_id: usuario?.id ?? null,
      visitor_id: visitorId,
    });
    if (error) {
      console.error(`[eventos-analytics] Falha ao registrar evento "${tipo}":`, error.message);
    }
  } catch (erro) {
    console.error(`[eventos-analytics] Falha ao registrar evento "${tipo}":`, erro);
  }
}
