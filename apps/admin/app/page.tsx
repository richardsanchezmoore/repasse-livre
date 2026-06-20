import { Board, contarOportunidades, type Aba } from "@/components/DiscoveriesBoard";
import { Sidebar } from "@/components/Sidebar";
import { CLASSIFICACOES, type Classificacao } from "@/lib/classificacao";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CentralDeOportunidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; classificacao?: string }>;
}) {
  const { aba, classificacao } = await searchParams;
  const ABAS_VALIDAS: Aba[] = ["descobertas", "enviadas", "aprovadas", "rejeitadas"];
  const abaAtiva: Aba = ABAS_VALIDAS.includes(aba as Aba) ? (aba as Aba) : "descobertas";
  const classificacaoAtiva = CLASSIFICACOES.includes(classificacao as Classificacao)
    ? (classificacao as Classificacao)
    : undefined;
  const contagens = await contarOportunidades();

  return (
    <div className="layout">
      <Sidebar abaAtiva={abaAtiva} contagens={contagens} />
      <main className="conteudo">
        <Board aba={abaAtiva} classificacao={classificacaoAtiva} />
      </main>
    </div>
  );
}
