import type { Metadata } from "next";
import Link from "next/link";
import { BlogShell } from "@/components/BlogShell";
import { listarPostsPublicados } from "@/lib/cms";

// ISR: o blog muda devagar; revalida de hora em hora (e na hora via revalidatePath
// ao publicar). Estático — sem cookies/headers, não cai em dinâmico (lição do not-found).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog",
  description: "Dicas, análises de mercado e novidades do Repasse Livre — comprar e vender carros melhor.",
  alternates: { canonical: "/blog" },
};

const FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

export default async function BlogPage() {
  const posts = await listarPostsPublicados();

  return (
    <BlogShell>
      <h1 className="blog-titulo-pagina">Blog</h1>
      <p className="blog-sub-pagina">Análises de mercado, dicas de compra e novidades da plataforma.</p>

      {posts.length === 0 ? (
        <p className="blog-vazio">Ainda não temos posts publicados. Volte em breve. 🚗</p>
      ) : (
        <div className="blog-grid">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="blog-card">
              {p.capaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.capaUrl} alt={p.capaAlt ?? ""} className="blog-card-capa" loading="lazy" />
              ) : (
                <span className="blog-card-capa blog-card-capa-vazia" />
              )}
              <span className="blog-card-corpo">
                <span className="blog-card-titulo">{p.titulo}</span>
                {p.resumo && <span className="blog-card-resumo">{p.resumo}</span>}
                {p.publicadoEm && <span className="blog-card-data">{FMT.format(new Date(p.publicadoEm))}</span>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </BlogShell>
  );
}
