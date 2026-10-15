import Link from "next/link";
import { buscarTabelaCompleta, anosOferecidos } from "@/lib/tabelaPagina";
import { NavegadorTabela } from "@/components/NavegadorTabela";
import { CabecalhoTabela } from "@/components/CabecalhoTabela";
import { TopBar } from "@/components/TopBar";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { SelecaoMultiplaProvider } from "@/components/SelecaoMultiplaProvider";
import { buscarCidadesDisponiveis, buscarEstadosDisponiveis } from "@/components/DiscoveriesBoard";
import { obterUsuarioAtual } from "@/lib/supabase-server";

/**
 * O CORPO DA PÁGINA DA TABELA — fora do arquivo de rota.
 *
 * ⚠️ Mesmo motivo de `CentralDeOportunidades`: o Next valida os props do export
 * default de uma página e recusa qualquer prop além de params/searchParams. As
 * duas rotas (`/tabla` e `/pt/tabla`) são cascas finas sobre este componente.
 *
 * ★ Aqui não precisa receber `idioma` por prop: tudo que fala com o usuário é
 * componente de CLIENTE e lê o idioma do próprio caminho.
 */
export async function PaginaTabela() {
  const [{ mes, modelos }, usuario, estadosDisponiveis, cidadesDisponiveis] = await Promise.all([
    buscarTabelaCompleta(),
    obterUsuarioAtual(),
    buscarEstadosDisponiveis(),
    buscarCidadesDisponiveis(),
  ]);

  // ⚠️ Os anos são calculados AQUI, no servidor, uma vez — e não no cliente a
  // cada clique. `anosOferecidos` expande a faixa da geração em anos, e fazer
  // isso por render desperdiça trabalho em toda troca de marca.
  const anosPorModelo: Record<string, ReturnType<typeof anosOferecidos>> = {};
  for (const m of modelos) anosPorModelo[`${m.marca}|${m.modelo}`] = anosOferecidos(m);

  /**
   * ⚠️⚠️ O RODAPÉ SAIU DAQUI — saía DUAS VEZES na tela (print do Gustavo,
   * 14/10/2026). O `app/layout.tsx` já renderiza o `RodapeGlobal` para o site
   * inteiro, e esta página montava o seu por cima. O componente se esconde
   * sozinho no painel e nas páginas legais, então ninguém tinha notado.
   *
   * ★ E ganha o TOPBAR: a tabela é o produto, e era a única página do site sem
   * busca, sem seletor de moeda e sem o caminho de volta pelo logo. Quem
   * chegasse nela por busca do Google ficava num beco — só o "← Volver"
   * minúsculo no canto.
   */
  return (
    <NavegacaoProvider>
      <SelecaoMultiplaProvider>
        <TopBar
          aba="aprovadas"
          estadosDisponiveis={estadosDisponiveis}
          cidadesDisponiveis={cidadesDisponiveis}
          usuario={usuario}
        />
        <CabecalhoTabela mes={mes} vazia={modelos.length === 0} />
        <main className="tabela-pagina">
          {modelos.length > 0 && <NavegadorTabela modelos={modelos} anosPorModelo={anosPorModelo} />}
        </main>
      </SelecaoMultiplaProvider>
    </NavegacaoProvider>
  );
}

/** Link para a tabela, para o menu e o rodapé usarem o mesmo caminho. */
export function LinkTabela({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Link href="/tabla" className={className}>
      {children}
    </Link>
  );
}
