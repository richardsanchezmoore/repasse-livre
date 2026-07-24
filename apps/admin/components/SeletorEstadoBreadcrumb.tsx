"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useNavegacao } from "./NavegacaoProvider";
import { salvarEstadoPreferido } from "@/lib/estadoPreferido";
import type { Aba } from "./DiscoveriesBoard";

/**
 * Versão "imediata" do filtro de estado, no próprio cabeçalho da lista —
 * no mobile (75% do tráfego) o seletor de UF da busca só aparece depois de
 * abrir a lupa, então esse atalho evita esse clique extra.
 */
export function SeletorEstadoBreadcrumb({
  aba,
  titulo,
  estadoAtivo,
  estadosDisponiveis,
}: {
  aba: Aba;
  titulo: string;
  estadoAtivo?: string;
  estadosDisponiveis: string[];
}) {
  const { navegar } = useNavegacao();
  const searchParams = useSearchParams();
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function selecionarEstado(novoEstado: string | undefined) {
    setAberto(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("aba", aba);
    params.delete("pagina");
    // Região/cidade pertencem a UM estado — ao trocar o estado, o recorte
    // anterior vira lixo cross-state (ex.: "RS + Grande Curitiba"). Zera os
    // dois pra não ficar "travado" no estado errado. Ver
    // project_repasse_livre_filtro_regiao_cidade_front.
    params.delete("regiao");
    params.delete("cidade");
    // "BR" explícito (não ausência do param) ao escolher "Brasil" — sem
    // isso, a página detecta o estado por geolocalização de novo no
    // próximo carregamento (ver app/page.tsx), e "Brasil" nunca
    // conseguiria mostrar o país inteiro de fato.
    // Persiste a escolha pra sobreviver à navegação (ex.: voltar de um
    // anúncio) com prioridade sobre o GEO — ver lib/estadoPreferido.ts.
    salvarEstadoPreferido(novoEstado || "BR");
    params.set("estado", novoEstado || "BR");
    navegar(`/?${params.toString()}`);
  }

  return (
    <div className="seletor-estado-breadcrumb" ref={containerRef}>
      <button
        type="button"
        className="seletor-estado-gatilho"
        onClick={() => setAberto((aberto) => !aberto)}
        aria-expanded={aberto}
        aria-label="Filtrar por estado"
      >
        {titulo} no <strong>{estadoAtivo || "Brasil"}</strong>
        <ChevronDown size={15} strokeWidth={2.5} className={aberto ? "seletor-estado-seta-aberta" : ""} />
      </button>

      {aberto && (
        <div className="seletor-estado-lista">
          <button
            type="button"
            onClick={() => selecionarEstado(undefined)}
            className={`seletor-estado-opcao ${!estadoAtivo ? "seletor-estado-opcao-ativa" : ""}`}
          >
            Brasil
          </button>
          {estadosDisponiveis.map((uf) => (
            <button
              key={uf}
              type="button"
              onClick={() => selecionarEstado(uf)}
              className={`seletor-estado-opcao ${estadoAtivo === uf ? "seletor-estado-opcao-ativa" : ""}`}
            >
              {uf}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
