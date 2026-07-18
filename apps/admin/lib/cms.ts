import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Camada de leitura do CMS próprio (páginas institucionais + blog). Server-only:
 * lê via service role (RLS deny-all nas tabelas). As páginas/posts públicos são
 * servidos por Server Components com ISR; a ESCRITA (editor Tiptap) vem em server
 * actions do admin. Ver a memória do CMS/blog.
 */

export interface PaginaCms {
  slug: string;
  titulo: string;
  conteudoHtml: string;
  seoTitle: string | null;
  seoDescription: string | null;
  atualizadoEm: string;
}

export interface PostCms {
  id: string;
  slug: string;
  titulo: string;
  resumo: string | null;
  conteudoHtml: string;
  capaUrl: string | null;
  capaAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: "rascunho" | "publicado";
  publicadoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

/** Só os campos que a LISTA do blog precisa (sem o HTML inteiro). */
export interface PostResumoCms {
  slug: string;
  titulo: string;
  resumo: string | null;
  capaUrl: string | null;
  capaAlt: string | null;
  publicadoEm: string | null;
}

interface PaginaRow {
  slug: string;
  titulo: string;
  conteudo_html: string;
  seo_title: string | null;
  seo_description: string | null;
  atualizado_em: string;
}
interface PostRow {
  id: string;
  slug: string;
  titulo: string;
  resumo: string | null;
  conteudo_html: string;
  capa_url: string | null;
  capa_alt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: "rascunho" | "publicado";
  publicado_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

function mapearPagina(r: PaginaRow): PaginaCms {
  return {
    slug: r.slug,
    titulo: r.titulo,
    conteudoHtml: r.conteudo_html,
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
    atualizadoEm: r.atualizado_em,
  };
}
function mapearPost(r: PostRow): PostCms {
  return {
    id: r.id,
    slug: r.slug,
    titulo: r.titulo,
    resumo: r.resumo,
    conteudoHtml: r.conteudo_html,
    capaUrl: r.capa_url,
    capaAlt: r.capa_alt,
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
    status: r.status,
    publicadoEm: r.publicado_em,
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
  };
}

const CAMPOS_PAGINA = "slug, titulo, conteudo_html, seo_title, seo_description, atualizado_em";
const CAMPOS_POST =
  "id, slug, titulo, resumo, conteudo_html, capa_url, capa_alt, seo_title, seo_description, status, publicado_em, criado_em, atualizado_em";

/** Página institucional por slug (ex.: 'termos'). null se não existe. */
export async function buscarPaginaPorSlug(slug: string): Promise<PaginaCms | null> {
  const { data } = await supabaseAdmin.from("paginas").select(CAMPOS_PAGINA).eq("slug", slug).maybeSingle();
  return data ? mapearPagina(data as PaginaRow) : null;
}

/** Post PUBLICADO por slug — o público só vê publicado (rascunho = 404). */
export async function buscarPostPublicadoPorSlug(slug: string): Promise<PostCms | null> {
  const { data } = await supabaseAdmin
    .from("posts")
    .select(CAMPOS_POST)
    .eq("slug", slug)
    .eq("status", "publicado")
    .maybeSingle();
  return data ? mapearPost(data as PostRow) : null;
}

/** Lista dos posts publicados, mais recentes primeiro (pra /blog). */
export async function listarPostsPublicados(): Promise<PostResumoCms[]> {
  const { data } = await supabaseAdmin
    .from("posts")
    .select("slug, titulo, resumo, capa_url, capa_alt, publicado_em")
    .eq("status", "publicado")
    .order("publicado_em", { ascending: false });
  return (data ?? []).map((r) => {
    const row = r as Pick<PostRow, "slug" | "titulo" | "resumo" | "capa_url" | "capa_alt" | "publicado_em">;
    return {
      slug: row.slug,
      titulo: row.titulo,
      resumo: row.resumo,
      capaUrl: row.capa_url,
      capaAlt: row.capa_alt,
      publicadoEm: row.publicado_em,
    };
  });
}

/** Slugs dos posts publicados — pra generateStaticParams e o sitemap. */
export async function listarSlugsPostsPublicados(): Promise<string[]> {
  const { data } = await supabaseAdmin.from("posts").select("slug").eq("status", "publicado");
  return (data ?? []).map((r) => (r as { slug: string }).slug);
}

// ── Leituras do ADMIN (incluem rascunhos + o conteudo_json pro editor) ──────────────

export interface PostAdminItem {
  id: string;
  titulo: string;
  slug: string;
  status: "rascunho" | "publicado";
  publicadoEm: string | null;
  atualizadoEm: string;
}

/** Lista TODOS os posts (rascunho + publicado) pro painel, mais recentes primeiro. */
export async function listarPostsAdmin(): Promise<PostAdminItem[]> {
  const { data } = await supabaseAdmin
    .from("posts")
    .select("id, titulo, slug, status, publicado_em, atualizado_em")
    .order("atualizado_em", { ascending: false });
  return (data ?? []).map((r) => {
    const row = r as { id: string; titulo: string; slug: string; status: "rascunho" | "publicado"; publicado_em: string | null; atualizado_em: string };
    return { id: row.id, titulo: row.titulo, slug: row.slug, status: row.status, publicadoEm: row.publicado_em, atualizadoEm: row.atualizado_em };
  });
}

export interface PostEditorData {
  id: string;
  titulo: string;
  slug: string;
  resumo: string | null;
  conteudoJson: unknown;
  capaUrl: string | null;
  capaAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: "rascunho" | "publicado";
}

/** Post completo (com conteudo_json) pro editor. null se não existe. */
export async function buscarPostParaEditor(id: string): Promise<PostEditorData | null> {
  const { data } = await supabaseAdmin
    .from("posts")
    .select("id, titulo, slug, resumo, conteudo_json, capa_url, capa_alt, seo_title, seo_description, status")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const r = data as {
    id: string; titulo: string; slug: string; resumo: string | null; conteudo_json: unknown;
    capa_url: string | null; capa_alt: string | null; seo_title: string | null; seo_description: string | null;
    status: "rascunho" | "publicado";
  };
  return {
    id: r.id, titulo: r.titulo, slug: r.slug, resumo: r.resumo, conteudoJson: r.conteudo_json,
    capaUrl: r.capa_url, capaAlt: r.capa_alt, seoTitle: r.seo_title, seoDescription: r.seo_description, status: r.status,
  };
}
