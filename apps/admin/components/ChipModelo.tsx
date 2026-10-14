"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { useTextos } from "@/lib/useIdioma";

/**
 * O selo do modelo filtrado, com o X para sair.
 *
 * ⚠️⚠️ SEM ISTO A FILEIRA DE MODELOS VIRA UMA ARMADILHA: o visitante clica em
 * "Toyota Vitz", a vitrine encolhe de 3.300 para 82 carros e NADA na tela diz
 * por quê — ele conclui que o site tem pouco anúncio e vai embora. O selo é a
 * metade obrigatória do recurso, não um enfeite.
 *
 * ⚠️ `useSearchParams` obriga Suspense no prerender estático, e esquecer isso
 * já deixou o build quebrado por horas (a /tabla). Por isso a fronteira fica
 * AQUI DENTRO: quem usar o componente não precisa lembrar.
 */
function Selo({ modelo }: { modelo: string }) {
  const caminho = usePathname();
  const params = useSearchParams();
  const tx = useTextos();

  const limpo = new URLSearchParams(params.toString());
  limpo.delete("modelo");
  limpo.delete("pagina"); // a paginação do filtro antigo não vale mais
  const query = limpo.toString();

  /**
   * ⚠️⚠️ EM /modelos/<slug> O MODELO NÃO ESTÁ NA QUERY, está no CAMINHO —
   * tirar o parâmetro deixaria o X sem efeito nenhum, e um botão que não faz
   * nada é pior que botão nenhum. Ali a saída é voltar para a listagem.
   */
  const dentroDaRota = caminho.includes("/modelos/");
  const destino = dentroDaRota
    ? (caminho.startsWith("/pt/") ? "/pt" : "/") + (query ? `?${query}` : "")
    : `${caminho}${query ? `?${query}` : ""}`;

  const rotulo = modelo.replace(/(^|[\s-])([a-zà-ú])/g, (_, antes, letra) => antes + letra.toUpperCase());

  return (
    <div className="chip-modelo-barra">
      <span className="chip-modelo">
        <span className="chip-modelo-rotulo">{tx("filtrandoModelo")}:</span>
        <strong>{rotulo}</strong>
        <Link href={destino} className="chip-modelo-x" aria-label={tx("limparFiltro")}>
          <X size={14} strokeWidth={2.6} />
        </Link>
      </span>
    </div>
  );
}

export function ChipModelo({ modelo }: { modelo: string }) {
  return (
    <Suspense fallback={null}>
      <Selo modelo={modelo} />
    </Suspense>
  );
}
