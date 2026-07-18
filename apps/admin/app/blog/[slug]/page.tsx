import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogShell } from "@/components/BlogShell";
import { ArtigoPost } from "@/components/ArtigoPost";
import { buscarPostPublicadoPorSlug, listarSlugsPostsPublicados } from "@/lib/cms";
import { URL_BASE_SITE } from "@/lib/site";

export const revalidate = 3600;

// Pré-renderiza os posts publicados no build; novos entram via revalidação (ISR).
export async function generateStaticParams() {
  const slugs = await listarSlugsPostsPublicados();
  return slugs.map((slug) => ({ slug }));
}

const FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await buscarPostPublicadoPorSlug(params.slug);
  if (!post) return { title: "Post não encontrado" };
  const titulo = post.seoTitle || post.titulo;
  const descricao = post.seoDescription || post.resumo || undefined;
  const url = `${URL_BASE_SITE}/blog/${post.slug}`;
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: titulo,
      description: descricao,
      url,
      images: post.capaUrl ? [{ url: post.capaUrl }] : undefined,
      publishedTime: post.publicadoEm ?? undefined,
      modifiedTime: post.atualizadoEm,
    },
    twitter: {
      card: post.capaUrl ? "summary_large_image" : "summary",
      title: titulo,
      description: descricao,
      images: post.capaUrl ? [post.capaUrl] : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await buscarPostPublicadoPorSlug(params.slug);
  if (!post) notFound();

  const url = `${URL_BASE_SITE}/blog/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.titulo,
    description: post.seoDescription || post.resumo || undefined,
    image: post.capaUrl || undefined,
    datePublished: post.publicadoEm || undefined,
    dateModified: post.atualizadoEm,
    author: { "@type": "Organization", name: "Repasse Livre" },
    publisher: {
      "@type": "Organization",
      name: "Repasse Livre",
      logo: { "@type": "ImageObject", url: `${URL_BASE_SITE}/logo.svg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  return (
    <BlogShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArtigoPost
        titulo={post.titulo}
        capaUrl={post.capaUrl}
        capaAlt={post.capaAlt}
        dataLabel={post.publicadoEm ? FMT.format(new Date(post.publicadoEm)) : null}
        conteudoHtml={post.conteudoHtml}
      />
    </BlogShell>
  );
}
