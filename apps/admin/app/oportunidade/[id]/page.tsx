import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buscarOportunidadePorId, contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { PaginaOportunidade } from "@/components/PaginaOportunidade";
import { Sidebar } from "@/components/Sidebar";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { urlOportunidade } from "@/lib/site";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const oportunidade = await buscarOportunidadePorId(id);
  if (!oportunidade) return {};

  const titulo =
    oportunidade.origem_tipo === "insercao_direta" && oportunidade.versao
      ? oportunidade.versao
      : oportunidade.veiculo;
  const descricao = `${oportunidade.margem_percentual?.toFixed(1)}% abaixo da FIPE — ${
    oportunidade.cidade ?? ""
  } ${oportunidade.estado ?? ""}`.trim();

  return {
    title: `${titulo} — Repasse Livre`,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      url: urlOportunidade(oportunidade.id),
      images: oportunidade.foto_principal ? [oportunidade.foto_principal] : [],
    },
  };
}

export default async function PaginaOportunidadeRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [oportunidade, usuario] = await Promise.all([buscarOportunidadePorId(id), obterUsuarioAtual()]);

  if (!oportunidade) {
    notFound();
  }

  const contagens = await contarOportunidades(usuario);

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar
          abaAtiva="aprovadas"
          contagens={contagens}
          role={usuario?.role ?? null}
          usuarioLogado={Boolean(usuario)}
        />
        <main className="conteudo pagina-oportunidade-conteudo">
          <Link href="/" className="pagina-oportunidade-voltar">
            <ArrowLeft size={16} strokeWidth={2} /> Voltar para as oportunidades
          </Link>
          <PaginaOportunidade oportunidade={oportunidade} />
        </main>
      </div>
    </NavegacaoProvider>
  );
}
