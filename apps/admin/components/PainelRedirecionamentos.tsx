"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { apagarRedirecionamento, criarRedirecionamento } from "@/app/actions";

// Não importar ORIGEM_PADRAO_CATCH_ALL de lib/redirecionamentos.ts aqui —
// esse arquivo carrega supabaseAdmin, e este componente é "use client"
// (mesma armadilha já documentada em rastreioVariaveis.ts). É só "*", duplicar
// a constante como string literal é mais seguro do que arriscar o import.
const ORIGEM_PADRAO_CATCH_ALL = "*";

export interface RedirecionamentoLinha {
  origem: string;
  destino: string;
  criado_em: string;
}

export function PainelRedirecionamentos({
  redirecionamentos,
  redirecionamentoPadrao,
}: {
  redirecionamentos: RedirecionamentoLinha[];
  redirecionamentoPadrao: string;
}) {
  const [pendente, iniciarTransicao] = useTransition();
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [padrao, setPadrao] = useState(redirecionamentoPadrao);
  const [salvandoPadrao, setSalvandoPadrao] = useState(false);
  const [apagandoOrigem, setApagandoOrigem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  function adicionar() {
    setErro(null);
    setMensagem(null);
    iniciarTransicao(async () => {
      try {
        await criarRedirecionamento(origem, destino);
        setMensagem(`Redirecionamento de "${origem}" salvo.`);
        setOrigem("");
        setDestino("");
      } catch (erroCapturado) {
        setErro(erroCapturado instanceof Error ? erroCapturado.message : "Falha ao salvar redirecionamento.");
      }
    });
  }

  function salvarPadrao() {
    setErro(null);
    setMensagem(null);
    setSalvandoPadrao(true);
    iniciarTransicao(async () => {
      try {
        if (padrao.trim()) {
          await criarRedirecionamento(ORIGEM_PADRAO_CATCH_ALL, padrao);
          setMensagem("Redirecionamento padrão salvo.");
        } else {
          await apagarRedirecionamento(ORIGEM_PADRAO_CATCH_ALL);
          setMensagem("Redirecionamento padrão removido.");
        }
      } catch (erroCapturado) {
        setErro(erroCapturado instanceof Error ? erroCapturado.message : "Falha ao salvar redirecionamento padrão.");
      } finally {
        setSalvandoPadrao(false);
      }
    });
  }

  function apagar(origemAlvo: string) {
    setErro(null);
    setMensagem(null);
    setApagandoOrigem(origemAlvo);
    iniciarTransicao(async () => {
      try {
        await apagarRedirecionamento(origemAlvo);
      } catch (erroCapturado) {
        setErro(erroCapturado instanceof Error ? erroCapturado.message : "Falha ao apagar redirecionamento.");
      } finally {
        setApagandoOrigem(null);
      }
    });
  }

  return (
    <section className="worker-secao">
      <h2 className="worker-secao-titulo">Redirecionamentos</h2>
      <p className="worker-config-ajuda">
        Quando uma URL antiga de carro/cidade/estado/marca daria página não encontrada, cadastre aqui pra
        redirecionar (301) pra URL nova em vez de perder o link já indexado pelo Google. Use caminhos
        relativos (ex.: <code>/carros/recife-pe/civic-2015-abc123</code>).
      </p>

      {erro && <p className="campo-erro">{erro}</p>}
      {mensagem && <p className="worker-mensagem">{mensagem}</p>}

      <div className="worker-config-campo">
        <label className="worker-config-rotulo" htmlFor="redirect-padrao">
          Redirecionamento padrão (catch-all)
        </label>
        <div className="worker-config-linha">
          <input
            id="redirect-padrao"
            type="text"
            className="worker-config-input"
            placeholder="/ (home)"
            value={padrao}
            onChange={(evento) => setPadrao(evento.target.value)}
          />
          <button type="button" className="worker-config-salvar" disabled={pendente} onClick={salvarPadrao}>
            {pendente && salvandoPadrao ? "Salvando…" : "Salvar"}
          </button>
        </div>
        <p className="worker-config-ajuda">
          Pra onde mandar uma URL de carro/cidade/estado/marca que não existe mais e não tem nenhum
          redirecionamento específico nem fallback automático aplicável (ex.: apagou todos os anúncios de uma
          cidade inteira). Deixe em branco pra essas URLs caírem em 404 normal.
        </p>
      </div>

      <div className="worker-config-grade">
        <div className="worker-config-campo">
          <label className="worker-config-rotulo" htmlFor="redirect-origem">
            De (caminho antigo)
          </label>
          <input
            id="redirect-origem"
            type="text"
            className="worker-config-input"
            placeholder="/carros/recife-pe/civic-2015-abc123"
            value={origem}
            onChange={(evento) => setOrigem(evento.target.value)}
          />
        </div>
        <div className="worker-config-campo">
          <label className="worker-config-rotulo" htmlFor="redirect-destino">
            Para (caminho novo)
          </label>
          <div className="worker-config-linha">
            <input
              id="redirect-destino"
              type="text"
              className="worker-config-input"
              placeholder="/carros/recife-pe/honda-civic-2015-abc123"
              value={destino}
              onChange={(evento) => setDestino(evento.target.value)}
            />
            <button type="button" className="worker-config-salvar" disabled={pendente} onClick={adicionar}>
              {pendente && !apagandoOrigem ? "Salvando…" : "Adicionar"}
            </button>
          </div>
        </div>
      </div>

      {redirecionamentos.length === 0 ? (
        <p className="worker-config-ajuda">Nenhum redirecionamento cadastrado ainda.</p>
      ) : (
        <table className="tabela-redirecionamentos">
          <thead>
            <tr>
              <th>De</th>
              <th>Para</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {redirecionamentos.map((linha) => (
              <tr key={linha.origem}>
                <td>
                  <code>{linha.origem}</code>
                </td>
                <td>
                  <code>{linha.destino}</code>
                </td>
                <td>
                  <button
                    type="button"
                    className="botao-icone"
                    title="Remover"
                    disabled={pendente && apagandoOrigem === linha.origem}
                    onClick={() => apagar(linha.origem)}
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
