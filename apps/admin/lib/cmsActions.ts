"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { slugify } from "@/lib/slug";
import { jsonParaHtmlSeguro } from "@/lib/tiptapHtml";

export interface ResultadoPost {
  erro: string | null;
  sucesso: boolean;
}

async function exigirAdmin() {
  const usuario = await obterUsuarioAtual();
  if (usuario?.role !== "admin") throw new Error("Apenas administradores.");
  return usuario;
}

function texto(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

/** Revalida as rotas que o post afeta (o blog público vem na Fase 3; harmless antes). */
function revalidarPost(slug: string) {
  revalidatePath("/conteudo");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
}

/**
 * Cria/edita um post do blog. Recebe o JSON do Tiptap, gera o HTML sanitizado NO
 * SERVIDOR e grava os dois. Ao publicar, carimba publicado_em (uma vez). Slug único:
 * a constraint do banco barra duplicata → devolvemos mensagem amigável. Em CRIAÇÃO,
 * redireciona pra página de edição do novo post.
 */
export async function salvarPost(_prev: ResultadoPost, formData: FormData): Promise<ResultadoPost> {
  const usuario = await exigirAdmin();

  const id = texto(formData.get("id"));
  const titulo = texto(formData.get("titulo"));
  if (!titulo) return { erro: "Informe o título.", sucesso: false };

  const slug = slugify(texto(formData.get("slug")) || titulo);
  if (!slug) return { erro: "Não consegui gerar um slug válido a partir do título.", sucesso: false };

  let doc: unknown;
  try {
    doc = JSON.parse(texto(formData.get("conteudo_json")) || "null");
  } catch {
    return { erro: "Conteúdo do editor inválido.", sucesso: false };
  }
  const html = jsonParaHtmlSeguro(doc);
  const status = texto(formData.get("status")) === "publicado" ? "publicado" : "rascunho";

  const base = {
    titulo,
    slug,
    resumo: texto(formData.get("resumo")) || null,
    conteudo_json: doc as never,
    conteudo_html: html,
    capa_url: texto(formData.get("capa_url")) || null,
    capa_alt: texto(formData.get("capa_alt")) || null,
    seo_title: texto(formData.get("seo_title")) || null,
    seo_description: texto(formData.get("seo_description")) || null,
    status,
    atualizado_em: new Date().toISOString(),
  };

  if (id) {
    // publicado_em só nasce na 1ª publicação; edições depois não mudam a data.
    const { data: atual } = await supabaseAdmin.from("posts").select("publicado_em").eq("id", id).maybeSingle();
    const publicado_em =
      status === "publicado" ? (atual?.publicado_em ?? new Date().toISOString()) : (atual?.publicado_em ?? null);
    const { error } = await supabaseAdmin.from("posts").update({ ...base, publicado_em }).eq("id", id);
    if (error) return { erro: mensagemErro(error.message), sucesso: false };
    revalidarPost(slug);
    return { erro: null, sucesso: true };
  }

  const publicado_em = status === "publicado" ? new Date().toISOString() : null;
  const { data, error } = await supabaseAdmin
    .from("posts")
    .insert({ ...base, publicado_em, autor_id: usuario.id })
    .select("id")
    .single();
  if (error) return { erro: mensagemErro(error.message), sucesso: false };
  revalidarPost(slug);
  redirect(`/conteudo/${data.id}`); // novo post → vai pra edição dele (lança NEXT_REDIRECT)
}

/** Apaga um post (chamado por form/botão). */
export async function apagarPost(id: string): Promise<void> {
  await exigirAdmin();
  const { data } = await supabaseAdmin.from("posts").select("slug").eq("id", id).maybeSingle();
  await supabaseAdmin.from("posts").delete().eq("id", id);
  revalidarPost(data?.slug ?? "");
  redirect("/conteudo");
}

function mensagemErro(msg: string): string {
  if (/duplicate key|unique/i.test(msg)) return "Já existe um post com esse endereço (slug). Mude o título ou o slug.";
  return "Não foi possível salvar. Tente de novo.";
}

/**
 * Edita uma PÁGINA institucional (termos/privacidade/exclusao-de-dados). Conjunto fixo
 * (não cria/apaga pelo painel) — só atualiza por slug. Gera o HTML sanitizado no servidor
 * e revalida a rota pública correspondente (/{slug}). atualizado_em vira a "última
 * atualização" mostrada na página (faz sentido pra texto legal).
 */
export async function salvarPagina(_prev: ResultadoPost, formData: FormData): Promise<ResultadoPost> {
  await exigirAdmin();

  const slug = texto(formData.get("slug"));
  if (!slug) return { erro: "Página inválida.", sucesso: false };
  const titulo = texto(formData.get("titulo"));
  if (!titulo) return { erro: "Informe o título.", sucesso: false };

  let doc: unknown;
  try {
    doc = JSON.parse(texto(formData.get("conteudo_json")) || "null");
  } catch {
    return { erro: "Conteúdo do editor inválido.", sucesso: false };
  }
  const html = jsonParaHtmlSeguro(doc);

  const { error } = await supabaseAdmin
    .from("paginas")
    .update({
      titulo,
      conteudo_json: doc as never,
      conteudo_html: html,
      seo_title: texto(formData.get("seo_title")) || null,
      seo_description: texto(formData.get("seo_description")) || null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("slug", slug);
  if (error) return { erro: "Não foi possível salvar. Tente de novo.", sucesso: false };

  revalidatePath(`/${slug}`);
  revalidatePath("/conteudo");
  return { erro: null, sucesso: true };
}
