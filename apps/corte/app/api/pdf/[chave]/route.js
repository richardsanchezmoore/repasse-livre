import { criarSupabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ehAdmin } from "@/lib/admin";
import { acessosDaUsuaria, temAcesso } from "@/lib/acessos";

/** Download do PDF de um material — GATEADO. Só quem está logado E tem acesso
 *  (Kit/assinatura, conforme material.acesso) baixa. O arquivo vive num bucket
 *  PRIVADO (corte-pdfs); a URL do storage nunca é exposta — servimos o stream
 *  via service role. Evita "baixar só pelo link". */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "corte-pdfs";

export async function GET(_req, { params }) {
  const chave = String(params?.chave || "");
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) return new Response("Faça login para baixar.", { status: 401 });

  const { data: m } = await sb
    .from("corte_materiais")
    .select("titulo, acesso, pdf_path")
    .eq("chave", chave)
    .eq("ativo", true)
    .maybeSingle();
  if (!m?.pdf_path) return new Response("PDF indisponível.", { status: 404 });

  const [acessos, admin] = await Promise.all([acessosDaUsuaria(sb, user.id), ehAdmin(sb, user.id)]);
  if (!admin && !temAcesso(acessos, m.acesso)) return new Response("Acesso restrito.", { status: 403 });

  // baixa do bucket privado com service role e devolve como anexo
  const adm = supabaseAdmin();
  const { data: file, error } = await adm.storage.from(BUCKET).download(m.pdf_path);
  if (error || !file) return new Response("Falha ao obter o arquivo.", { status: 500 });

  const buf = Buffer.from(await file.arrayBuffer());
  // Registra o download (cruzar com estorno: "pagou, baixou e pediu reembolso").
  // Não loga admin (testes). Await pra não ser descartado no teardown do serverless.
  if (!admin) {
    try { await adm.from("corte_eventos").insert({ user_id: user.id, tipo: "pdf_baixado", referencia: chave }); }
    catch (e) { console.error("[pdf] log falhou:", e?.message); }
  }
  const nome = (chave.replace(/[^\w-]+/g, "-") || "material") + ".pdf";
  return new Response(buf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${nome}"`,
      "cache-control": "private, no-store",
    },
  });
}
