import { NextResponse } from "next/server";
import { conversar } from "@/lib/marta";
import { criarSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }
  const pergunta = String(body?.pergunta || "");

  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user || null;

  let familia = null, historico = [];
  if (user) {
    const [{ data: fam }, { data: conv }] = await Promise.all([
      sb.from("lar_familia").select("*").eq("user_id", user.id).maybeSingle(),
      sb.from("lar_conversa").select("mensagens").eq("user_id", user.id).maybeSingle(),
    ]);
    familia = fam || null;
    historico = Array.isArray(conv?.mensagens) ? conv.mensagens : [];
  }

  const r = await conversar({ pergunta, familia, historico });
  if (!r.ok) return NextResponse.json({ ok: false, erro: r.erro }, { status: 502 });

  // memória: guarda o turno (fica salvo, ela lembra depois)
  if (user) {
    const novo = [
      ...historico,
      { papel: "user", texto: pergunta.slice(0, 800) },
      { papel: "marta", texto: String(r.resposta).slice(0, 800) },
    ].slice(-20);
    await sb.from("lar_conversa").upsert(
      { user_id: user.id, mensagens: novo, atualizado_em: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  }

  return NextResponse.json(r);
}
