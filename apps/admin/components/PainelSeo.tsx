"use client";

import { useState, useTransition } from "react";
import { salvarConfigSeo } from "@/app/actions";
import { VARIAVEIS_SEO, type ConfigSeoPagina } from "@/lib/seoVariaveis";

const PAGINAS: Array<{ chave: string; rotulo: string; ajudaExtra: string }> = [
  { chave: "home", rotulo: "Home", ajudaExtra: "Página inicial — não tem variáveis dinâmicas." },
  {
    chave: "cidade",
    rotulo: "Página de cidade",
    ajudaExtra: 'Variáveis disponíveis: $cidade (ex.: "Recife Pernambuco") e $tags. URL: /carros/recife-pe/.',
  },
  {
    chave: "estado",
    rotulo: "Página de estado",
    ajudaExtra: 'Variáveis disponíveis: $estado (ex.: "Pernambuco") e $tags. URL: /carros/pernambuco/.',
  },
  {
    chave: "marca",
    rotulo: "Página de marca",
    ajudaExtra:
      'Variáveis disponíveis: $tag (ex.: "Volkswagen"), $cidade ou $estado (conforme o nível da página). URL: /carros/volkswagen, /carros/pernambuco/volkswagen ou /carros/recife-pe/volkswagen.',
  },
  {
    chave: "modelo",
    rotulo: "Página de modelo",
    ajudaExtra:
      'Variáveis disponíveis: $tag (marca, ex.: "Chevrolet"), $modelo (ex.: "Onix"), $cidade ou $estado (conforme o nível). URL: /carros/recife-pe/chevrolet/onix.',
  },
  {
    chave: "produto",
    rotulo: "Página individual (anúncio)",
    ajudaExtra: "Variáveis disponíveis: $title_ad, $description_ad, $tag, $cidade, $estado.",
  },
];

export function PainelSeo({ configs }: { configs: ConfigSeoPagina[] }) {
  const [pendente, iniciarTransicao] = useTransition();
  const [salvandoChave, setSalvandoChave] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const configAtual = (chave: string): ConfigSeoPagina | undefined => configs.find((c) => c.chave === chave);

  const [valores, setValores] = useState<Record<string, { titulo: string; descricao: string }>>(
    Object.fromEntries(
      PAGINAS.map((pagina) => {
        const atual = configAtual(pagina.chave);
        return [pagina.chave, { titulo: atual?.titulo ?? "", descricao: atual?.descricao ?? "" }];
      })
    )
  );

  function alterarCampo(chave: string, campo: "titulo" | "descricao", valor: string) {
    setValores((anterior) => ({ ...anterior, [chave]: { ...anterior[chave], [campo]: valor } }));
  }

  function salvarPagina(chave: string) {
    setErro(null);
    setMensagem(null);
    setSalvandoChave(chave);
    iniciarTransicao(async () => {
      try {
        await salvarConfigSeo(chave, valores[chave]);
        setMensagem(`SEO da página "${chave}" salvo.`);
      } catch (erroCapturado) {
        setErro(erroCapturado instanceof Error ? erroCapturado.message : "Falha ao salvar SEO.");
      } finally {
        setSalvandoChave(null);
      }
    });
  }

  return (
    <div className="worker-painel">
      {erro && <p className="campo-erro">{erro}</p>}
      {mensagem && <p className="worker-mensagem">{mensagem}</p>}

      <section className="worker-secao">
        <h2 className="worker-secao-titulo">Mapa de variáveis</h2>
        <p className="worker-config-ajuda">
          Use estas variáveis no título/descrição de qualquer página abaixo — cada uma só funciona nas páginas
          indicadas na ajuda correspondente.
        </p>
        <div className="seo-variaveis-tabela">
          {VARIAVEIS_SEO.map((variavel) => (
            <div key={variavel.nome} className="seo-variaveis-linha">
              <code>${variavel.nome}</code>
              <span>{variavel.descricao}</span>
            </div>
          ))}
        </div>
      </section>

      {PAGINAS.map((pagina) => (
        <section key={pagina.chave} className="worker-secao">
          <h2 className="worker-secao-titulo">{pagina.rotulo}</h2>
          <p className="worker-config-ajuda">{pagina.ajudaExtra}</p>
          <div className="worker-config-grade">
            <div className="worker-config-campo">
              <label className="worker-config-rotulo" htmlFor={`seo-titulo-${pagina.chave}`}>
                Título
              </label>
              <div className="worker-config-linha">
                <input
                  id={`seo-titulo-${pagina.chave}`}
                  type="text"
                  className="worker-config-input"
                  value={valores[pagina.chave]?.titulo ?? ""}
                  onChange={(evento) => alterarCampo(pagina.chave, "titulo", evento.target.value)}
                />
              </div>
              <p className="worker-config-ajuda">Deixe em branco para usar o título padrão do site.</p>
            </div>

            <div className="worker-config-campo">
              <label className="worker-config-rotulo" htmlFor={`seo-descricao-${pagina.chave}`}>
                Descrição
              </label>
              <div className="worker-config-linha">
                <input
                  id={`seo-descricao-${pagina.chave}`}
                  type="text"
                  className="worker-config-input"
                  value={valores[pagina.chave]?.descricao ?? ""}
                  onChange={(evento) => alterarCampo(pagina.chave, "descricao", evento.target.value)}
                />
              </div>
              <p className="worker-config-ajuda">Aparece nos resultados de busca e ao compartilhar o link.</p>
            </div>

            <div className="worker-config-campo">
              <button
                type="button"
                className="worker-config-salvar"
                disabled={pendente && salvandoChave === pagina.chave}
                onClick={() => salvarPagina(pagina.chave)}
              >
                {pendente && salvandoChave === pagina.chave ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
