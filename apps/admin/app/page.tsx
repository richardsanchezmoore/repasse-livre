import { Board, contarOportunidades, type Aba, type FiltrosBoard, type Ordem } from "@/components/DiscoveriesBoard";
import { BoardArea } from "@/components/BoardArea";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { CLASSIFICACOES, type Classificacao } from "@/lib/classificacao";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const ORDENS_VALIDAS: Ordem[] = ["recente", "margem", "menor_valor", "maior_valor"];

function paraNumero(valor: string | undefined): number | undefined {
  if (!valor) return undefined;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : undefined;
}

export default async function CentralDeOportunidadesPage({
  searchParams,
}: {
  searchParams: Promise<{
    aba?: string;
    classificacao?: string;
    busca?: string;
    precoMin?: string;
    precoMax?: string;
    ordem?: string;
  }>;
}) {
  const { aba, classificacao, busca, precoMin, precoMax, ordem } = await searchParams;
  const ABAS_VALIDAS: Aba[] = ["descobertas", "enviadas", "aprovadas", "rejeitadas", "favoritos"];
  const abaAtiva: Aba = ABAS_VALIDAS.includes(aba as Aba) ? (aba as Aba) : "descobertas";
  const classificacaoAtiva = CLASSIFICACOES.includes(classificacao as Classificacao)
    ? (classificacao as Classificacao)
    : undefined;
  const ordemAtiva = ORDENS_VALIDAS.includes(ordem as Ordem) ? (ordem as Ordem) : "recente";

  const filtros: FiltrosBoard = {
    classificacao: classificacaoAtiva,
    busca: busca || undefined,
    precoMin: paraNumero(precoMin),
    precoMax: paraNumero(precoMax),
    ordem: ordemAtiva,
  };

  const contagens = await contarOportunidades();

  return (
    <NavegacaoProvider>
      <div className="layout">
        <Sidebar abaAtiva={abaAtiva} contagens={contagens} />
        <main className="conteudo">
          <TopBar
            aba={abaAtiva}
            busca={filtros.busca}
            precoMin={filtros.precoMin}
            precoMax={filtros.precoMax}
            ordem={ordemAtiva}
          />
          <BoardArea>
            <Board aba={abaAtiva} filtros={filtros} />
          </BoardArea>
        </main>
      </div>
    </NavegacaoProvider>
  );
}
