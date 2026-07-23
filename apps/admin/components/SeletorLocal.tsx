"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useNavegacao } from "./NavegacaoProvider";
import { regioesDoEstado } from "@/lib/regioes";
import type { Aba } from "./DiscoveriesBoard";

/**
 * Filtro de REGIÃO/CIDADE dentro do estado selecionado — aparece ao lado do seletor de
 * estado. Regiões (metrópoles, ver lib/regioes.ts) agrupam cidades vizinhas; cidade é o
 * refino exato. Seta ?regiao= OU ?cidade= (mutuamente exclusivos) e zera a paginação.
 */
export function SeletorLocal({
  aba,
  estadoAtivo,
  regiaoAtiva,
  cidadeAtiva,
  cidadesDoEstado,
}: {
  aba: Aba;
  estadoAtivo: string;
  regiaoAtiva?: string;
  cidadeAtiva?: string;
  cidadesDoEstado: string[];
}) {
  const { navegar } = useNavegacao();
  const searchParams = useSearchParams();
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const regioes = regioesDoEstado(estadoAtivo);

  function navegarCom(mut: (p: URLSearchParams) => void) {
    setAberto(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("aba", aba);
    params.delete("pagina");
    params.delete("regiao");
    params.delete("cidade");
    mut(params);
    navegar(`/?${params.toString()}`);
  }

  const rotulo = cidadeAtiva ?? regiaoAtiva ?? "Toda a região";
  const nenhum = !regiaoAtiva && !cidadeAtiva;

  return (
    <div className="seletor-estado-breadcrumb" ref={containerRef}>
      <button
        type="button"
        className="seletor-estado-gatilho"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-label="Filtrar por região ou cidade"
      >
        <strong>{rotulo}</strong>
        <ChevronDown size={15} strokeWidth={2.5} className={aberto ? "seletor-estado-seta-aberta" : ""} />
      </button>

      {aberto && (
        <div className="seletor-estado-lista seletor-local-lista">
          <button
            type="button"
            onClick={() => navegarCom(() => {})}
            className={`seletor-estado-opcao ${nenhum ? "seletor-estado-opcao-ativa" : ""}`}
          >
            Todo o {estadoAtivo}
          </button>

          {regioes.length > 0 && <div className="seletor-local-grupo">Regiões</div>}
          {regioes.map((r) => (
            <button
              key={r.nome}
              type="button"
              onClick={() => navegarCom((p) => p.set("regiao", r.nome))}
              className={`seletor-estado-opcao ${regiaoAtiva === r.nome ? "seletor-estado-opcao-ativa" : ""}`}
            >
              {r.nome}
            </button>
          ))}

          {cidadesDoEstado.length > 0 && <div className="seletor-local-grupo">Cidades</div>}
          {cidadesDoEstado.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => navegarCom((p) => p.set("cidade", c))}
              className={`seletor-estado-opcao ${cidadeAtiva === c ? "seletor-estado-opcao-ativa" : ""}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
