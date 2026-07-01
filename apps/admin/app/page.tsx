import type { Metadata } from "next";
import {
  Board,
  buscarEstadosDisponiveis,
  contarOportunidades,
  podeAcessarAba,
  type Aba,
  type FiltrosBoard,
  type Ordem,
} from "@/components/DiscoveriesBoard";
import { BoardArea } from "@/components/BoardArea";
import { DetectorLocalizacao } from "@/components/DetectorLocalizacao";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { SelecaoMultiplaProvider } from "@/components/SelecaoMultiplaProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { CLASSIFICACOES, type Classificacao } from "@/lib/classificacao";
import { obterCoordsUsuario, obterEstadoDetectado, obterEstadoPreferido } from "@/lib/geolocalizacao";
import { UFS } from "@/lib/mascaras";
import { buscarConfigSeo, buscarFotoDestaque } from "@/lib/seo";
import { obterUsuarioAtual } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function generateMetadata(): Promise<Metadata> {
  const [config, foto] = await Promise.all([buscarConfigSeo("home"), buscarFotoDestaque({})]);
  if (!config) return {};

  return {
    title: config.titulo || undefined,
    description: config.descricao || undefined,
    openGraph: {
      title: config.titulo || undefined,
      description: config.descricao || undefined,
      images: foto ? [foto] : undefined,
    },
    twitter: {
      title: config.titulo || undefined,
      description: config.descricao || undefined,
      images: foto ? [foto] : undefined,
    },
  };
}

const ORDENS_VALIDAS: Ordem[] = ["recente", "margem", "menor_valor", "maior_valor", "proximidade"];

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
    estado?: string;
    precoMin?: string;
    precoMax?: string;
    ordem?: string;
    anunciante?: string;
    pagina?: string;
  }>;
}) {
  const { aba, classificacao, busca, estado, precoMin, precoMax, ordem, anunciante, pagina } = await searchParams;
  const usuario = await obterUsuarioAtual();
  const ABAS_VALIDAS: Aba[] = ["descobertas", "enviadas", "aprovadas", "rejeitadas", "favoritos"];
  const abaSolicitada: Aba = ABAS_VALIDAS.includes(aba as Aba) ? (aba as Aba) : "aprovadas";
  // Acesso direto via URL a uma aba de gestão sem ser admin cai para a
  // vitrine pública — defesa em profundidade além do filtro da Sidebar.
  const abaAtiva: Aba = podeAcessarAba(abaSolicitada, usuario) ? abaSolicitada : "aprovadas";
  const classificacaoAtiva = CLASSIFICACOES.includes(classificacao as Classificacao)
    ? (classificacao as Classificacao)
    : undefined;
  // Precedência do estado: param `estado` na URL > cookie de preferência
  // (última escolha manual) > detecção por IP (só na 1ª visita). O cookie faz
  // a escolha manual sobreviver à navegação — antes, ao voltar de um anúncio
  // (o "Voltar" é <Link href="/"> sem param) a página recaía no GEO e
  // sobrescrevia a escolha do usuário (ver lib/estadoPreferido.ts).
  const estadoPreferido =
    abaAtiva === "aprovadas" && estado === undefined ? await obterEstadoPreferido() : null;
  const estadoEfetivo = estado ?? estadoPreferido ?? undefined;
  // "BR" é o sentinela de "Brasil" escolhido de propósito (limpar o
  // filtro) — diferente de ausência, que dispara a detecção por IP abaixo.
  const estadoExplicito = estadoEfetivo === "BR" ? null : UFS.includes(estadoEfetivo ?? "") ? estadoEfetivo : undefined;
  const estadoDetectado =
    abaAtiva === "aprovadas" && estadoEfetivo === undefined ? await obterEstadoDetectado() : null;
  const estadoAtivo = estadoExplicito === null ? undefined : estadoExplicito ?? estadoDetectado ?? undefined;
  const anuncianteAtivo = anunciante === "profissional" || anunciante === "particular" ? anunciante : undefined;
  const paginaAtiva = Math.max(1, paraNumero(pagina) ?? 1);

  // "Perto de mim" é uma opção manual no dropdown "Ordenar por" (não mais
  // o padrão automático — ficava invisível pro usuário e parecia que o
  // filtro de estado estava "travado", já que o Brasil inteiro mostrava só
  // resultados da própria região). Só existe com coordenada resolvida
  // (cookie do navegador ou IP via Vercel — ver lib/geolocalizacao.ts).
  const coordsUsuario = abaAtiva === "aprovadas" ? await obterCoordsUsuario() : null;
  const proximidadeDisponivel = Boolean(coordsUsuario);
  const ordemAtiva: Ordem = ORDENS_VALIDAS.includes(ordem as Ordem) ? (ordem as Ordem) : "recente";

  const filtros: FiltrosBoard = {
    classificacao: classificacaoAtiva,
    busca: busca || undefined,
    estado: estadoAtivo,
    estadoBR: estadoExplicito === null,
    precoMin: paraNumero(precoMin),
    precoMax: paraNumero(precoMax),
    anunciante: anuncianteAtivo,
    ordem: ordemAtiva,
    lat: ordemAtiva === "proximidade" ? coordsUsuario?.lat : undefined,
    lng: ordemAtiva === "proximidade" ? coordsUsuario?.lng : undefined,
  };

  const [contagens, estadosDisponiveis] = await Promise.all([
    contarOportunidades(usuario),
    buscarEstadosDisponiveis(abaAtiva, usuario),
  ]);

  return (
    <NavegacaoProvider>
      <SelecaoMultiplaProvider>
        <DetectorLocalizacao />
        <TopBar
          aba={abaAtiva}
          busca={filtros.busca}
          estado={filtros.estado}
          estadosDisponiveis={estadosDisponiveis}
          usuario={usuario}
        />
        <div className="layout">
          <Sidebar
            abaAtiva={abaAtiva}
            contagens={contagens}
            role={usuario?.role ?? null}
            usuarioLogado={Boolean(usuario)}
          />
          <main className="conteudo">
            <BoardArea>
              <Board
                aba={abaAtiva}
                filtros={filtros}
                usuario={usuario}
                pagina={paginaAtiva}
                estadosDisponiveis={estadosDisponiveis}
                proximidadeDisponivel={proximidadeDisponivel}
              />
            </BoardArea>
          </main>
        </div>
      </SelecaoMultiplaProvider>
    </NavegacaoProvider>
  );
}
