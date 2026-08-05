"use server";

import { criarSupabaseServer } from "@/lib/supabaseServer";

/** Segunda-feira da semana atual (chave do cardápio), em ISO (YYYY-MM-DD). */
function segundaDaSemana(base = new Date()) {
  const d = new Date(base);
  const desde = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - desde);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/** Salva o cardápio + a lista de compras da semana (a mãe volta e consulta). */
export async function salvarCardapio({ dias, recado, lista }) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) return { erro: "Entre na sua conta pra salvar." };
  if (!Array.isArray(dias) || !dias.length) return { erro: "Nada pra salvar ainda." };

  const semana = segundaDaSemana();
  const c = await sb.from("lar_cardapio").upsert(
    { user_id: user.id, inicio_semana: semana, dados: { dias, recado: recado || "" } },
    { onConflict: "user_id,inicio_semana" }
  );
  if (c.error) return { erro: c.error.message };

  const l = await sb.from("lar_lista_compras").upsert(
    { user_id: user.id, inicio_semana: semana, itens: Array.isArray(lista) ? lista : [] },
    { onConflict: "user_id,inicio_semana" }
  );
  if (l.error) return { erro: l.error.message };

  return { ok: true };
}
