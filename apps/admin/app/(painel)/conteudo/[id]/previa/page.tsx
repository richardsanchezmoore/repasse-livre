import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Eye } from "lucide-react";
import { BlogShell } from "@/components/BlogShell";
import { ArtigoPost } from "@/components/ArtigoPost";
import { buscarPostPorIdAdmin } from "@/lib/cms";
import { obterUsuarioAtual } from "@/lib/supabase-server";

// Prévia do post pra QUALQUER status (rascunho incluso) — só admin (guarda do (painel)).
// O /blog público dá 404 em rascunho; aqui o autor vê exatamente como vai sair no ar.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

export default async function PreviaPostPage({ params }: { params: { id: string } }) {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return null;

  const post = await buscarPostPorIdAdmin(params.id);
  if (!post) notFound();

  const dataLabel = post.publicadoEm ? FMT.format(new Date(post.publicadoEm)) : null;

  return (
    <>
      <div className="previa-barra">
        <span className="previa-barra-tag"><Eye size={14} strokeWidth={2.2} /> Prévia</span>
        <span className={`previa-barra-status previa-status-${post.status}`}>
          {post.status === "publicado" ? "Publicado" : "Rascunho — ainda não está no ar"}
        </span>
        <Link href={`/conteudo/${post.id}`} className="previa-barra-voltar">
          <ChevronLeft size={15} /> Voltar ao editor
        </Link>
      </div>
      <BlogShell>
        <ArtigoPost
          titulo={post.titulo}
          capaUrl={post.capaUrl}
          capaAlt={post.capaAlt}
          dataLabel={dataLabel}
          conteudoHtml={post.conteudoHtml}
        />
      </BlogShell>
    </>
  );
}
