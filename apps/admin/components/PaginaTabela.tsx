import Link from "next/link";
import { buscarTabelaCompleta, anosOferecidos } from "@/lib/tabelaPagina";
import { NavegadorTabela } from "@/components/NavegadorTabela";
import { RodapeGlobal } from "@/components/RodapeGlobal";
import { CabecalhoTabela } from "@/components/CabecalhoTabela";

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
  const { mes, modelos } = await buscarTabelaCompleta();

  // ⚠️ Os anos são calculados AQUI, no servidor, uma vez — e não no cliente a
  // cada clique. `anosOferecidos` expande a faixa da geração em anos, e fazer
  // isso por render desperdiça trabalho em toda troca de marca.
  const anosPorModelo: Record<string, ReturnType<typeof anosOferecidos>> = {};
  for (const m of modelos) anosPorModelo[`${m.marca}|${m.modelo}`] = anosOferecidos(m);

  return (
    <>
      <CabecalhoTabela mes={mes} vazia={modelos.length === 0} />
      <main className="tabela-pagina">
        {modelos.length > 0 && <NavegadorTabela modelos={modelos} anosPorModelo={anosPorModelo} />}
      </main>
      <RodapeGlobal />
    </>
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
