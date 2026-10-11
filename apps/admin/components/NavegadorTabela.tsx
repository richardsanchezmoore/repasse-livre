"use client";

import { useMemo, useState } from "react";
import { useTextos } from "@/lib/useIdioma";
import { formatarNaMoeda } from "@/lib/moeda";
import type { ModeloDaTabela } from "@/lib/tabelaPagina";
import type { LinhaReferencia } from "@/lib/tabelaReferencia";

/**
 * MARCA → MODELO → ANO, os três passos que o Gustavo desenhou.
 *
 * ★★★ *"o usuário irá selecionar Marca/Modelo/Ano... devemos manter separados a
 * seleção"*. A escolha é SEMPRE por ano, mesmo quando a referência por trás é
 * agrupada — quem tem um Vitz 2008 na mão procura "2008", não "XP90", e não
 * saber o código da geração não pode ser motivo para não achar o preço.
 *
 * ⚠️ O n NÃO aparece. Decisão dele: *"mostrar ofertas (11 ofertas) enfraquece...
 * não devemos mostrar"*. Mas o RÓTULO DE ESCOPO fica — *"o rótulo de escopo pode
 * ficar"* —, porque saber contra o que se compara é o que sustenta o número.
 *
 * ⚠️ Navegação toda em memória: a tabela inteira vem numa leitura só. Consultar
 * o banco a cada clique de marca seria uma ida por clique, e já estouramos o
 * egress uma vez por bem menos que isso.
 */
export function NavegadorTabela({
  modelos,
  anosPorModelo,
}: {
  modelos: ModeloDaTabela[];
  /** Pré-calculado no servidor: `anosOferecidos` por "marca|modelo". */
  anosPorModelo: Record<string, { ano: number; linha: LinhaReferencia }[]>;
}) {
  const tx = useTextos();
  const [marca, setMarca] = useState<string | null>(null);
  const [modelo, setModelo] = useState<string | null>(null);
  const [ano, setAno] = useState<number | null>(null);

  const marcas = useMemo(
    () => [...new Set(modelos.map((m) => m.marca))].sort((a, b) => a.localeCompare(b)),
    [modelos],
  );
  const modelosDaMarca = useMemo(
    () => modelos.filter((m) => m.marca === marca),
    [modelos, marca],
  );
  const anos = marca && modelo ? (anosPorModelo[`${marca}|${modelo}`] ?? []) : [];
  const escolhido = anos.find((a) => a.ano === ano) ?? null;

  const titulo = (t: string) => <p className="tabela-passo-titulo">{t}</p>;

  return (
    <div className="tabela-nav">
      {/* ─── 1. marca ─── */}
      <section className="tabela-passo">
        {titulo(tx("escolhaMarca"))}
        <div className="tabela-chips">
          {marcas.map((m) => (
            <button
              key={m}
              type="button"
              className={`tabela-chip${m === marca ? " ativo" : ""}`}
              onClick={() => { setMarca(m === marca ? null : m); setModelo(null); setAno(null); }}
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      {/* ─── 2. modelo ─── */}
      {marca && (
        <section className="tabela-passo">
          {titulo(tx("escolhaModelo"))}
          <div className="tabela-chips">
            {modelosDaMarca.map((m) => (
              <button
                key={m.modelo}
                type="button"
                className={`tabela-chip${m.modelo === modelo ? " ativo" : ""}`}
                onClick={() => { setModelo(m.modelo === modelo ? null : m.modelo); setAno(null); }}
              >
                {/* ⚠️ O modelo é guardado em minúscula (chave de casamento).
                    Capitaliza só na exibição — mexer no dado quebraria o selo. */}
                <span className="tabela-chip-modelo">{m.modelo}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ─── 3. ano ─── */}
      {marca && modelo && (
        <section className="tabela-passo">
          {titulo(tx("escolhaAno"))}
          <div className="tabela-chips tabela-chips-anos">
            {anos.map(({ ano: a }) => (
              <button
                key={a}
                type="button"
                className={`tabela-chip tabela-chip-ano${a === ano ? " ativo" : ""}`}
                onClick={() => setAno(a === ano ? null : a)}
              >
                {a}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ─── o resultado ─── */}
      {escolhido && <Resultado marca={marca!} modelo={modelo!} ano={escolhido.ano} linha={escolhido.linha} />}
    </div>
  );
}

function Resultado({
  marca,
  modelo,
  ano,
  linha,
}: {
  marca: string;
  modelo: string;
  ano: number;
  linha: LinhaReferencia;
}) {
  const tx = useTextos();

  // ★ O rótulo de escopo: contra o que este número foi calculado.
  const escopo =
    linha.escopo === "geracao"
      ? linha.intervalo_anos ? `${tx("referenciaDe")} ${linha.intervalo_anos}` : tx("referenciaGeracao")
      : linha.anos_agrupados
        ? (() => { const a = linha.anos_agrupados.split("+"); return `${tx("referenciaAgrupada")} ${a[0]}–${a[a.length - 1]}`; })()
        : `${tx("referenciaDe")} ${linha.chave}`;

  return (
    <section className="tabela-resultado">
      <p className="tabela-resultado-carro">
        {marca} <span className="tabela-resultado-modelo">{modelo}</span> {ano}
      </p>

      <p className="tabela-resultado-rotulo">{tx("precoReferencia")}</p>
      <p className="tabela-resultado-valor">{formatarNaMoeda(linha.mediana, linha.moeda)}</p>
      <p className="tabela-resultado-escopo">{escopo}</p>

      {/* ★★ A FAIXA É O QUE NOS SEPARA DO CARDEN. Ele publica a "média" de UM
          anúncio como se fosse mercado. Mostrar onde mora o miolo diz, sem
          precisar do n, que isto saiu de um conjunto — e admite que preço de
          carro usado é faixa, não ponto. */}
      {linha.q1 != null && linha.q3 != null && (
        <div className="tabela-faixa">
          <span className="tabela-faixa-rotulo">{tx("faixaMercado")}</span>
          <span className="tabela-faixa-valores">
            {formatarNaMoeda(linha.q1, linha.moeda)} — {formatarNaMoeda(linha.q3, linha.moeda)}
          </span>
        </div>
      )}

      {/* ⚠️ Linha fraca (3 ou 4 ofertas) ENTRA na página, mas avisada. No card
          ela não aparece: lá o selo é uma porcentagem, e porcentagem sobre
          amostra pequena promete precisão que não existe. Aqui há espaço para
          mostrar a faixa e dizer que o dado ainda é fino. */}
      {linha.confianca !== "boa" && <p className="tabela-aviso-fraco">{tx("dadoFraco")}</p>}
    </section>
  );
}
