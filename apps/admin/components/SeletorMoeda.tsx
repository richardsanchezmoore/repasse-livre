"use client";

import { useEffect, useRef, useState } from "react";
import { MOEDAS_FIXAS, MOEDAS_OPCIONAIS, lerMoedaEscolhida, escolherMoeda, type CodigoMoeda } from "@/lib/moeda";
import { useTextos } from "@/lib/useIdioma";

/**
 * SELETOR DE MOEDA — ícone pequeno, caixinha que abre, escolha que vale no site.
 *
 * ★★ Desenho do Gustavo (10/10/2026): *"seletor de moeda é perfeito, e pode ser
 * um pequeno ícone com 'escolher moeda' e um popbox abre"*, e depois *"serão
 * duas moedas sempre expostas e duas no 'Escolher Moeda'"*.
 *
 * Por isso a caixinha NÃO lista quatro moedas: guarani e dólar não são opção,
 * são o par da praça e aparecem sempre no card. A caixinha escolhe a TERCEIRA
 * linha, opcional — real ou peso — e "Ninguna" desliga.
 *
 * ⚠️ O QUE ELE RESOLVE: antes o site convertia tudo para REAL, em todo card,
 * para servir a um público minoritário num site paraguaio. O seletor inverte a
 * relação — quem precisa de outra moeda escolhe UMA VEZ, e os outros não pagam
 * espaço por isso. Daí o padrão ser "Ninguna".
 *
 * ⚠️⚠️ SOBRE O PESO: a cotação vem da taxa OFICIAL. A Argentina tem histórico
 * de mercado paralelo, e quando o vão é grande o número mostrado não é o que o
 * argentino realmente consegue trocar. Por isso a caixinha avisa — é o mesmo
 * princípio do "≈" do guarani: referência, nunca promessa.
 *
 * ⚠️ A escolha vive em localStorage, que pode LANÇAR em janela privada ou com
 * dados de site bloqueados. Toda leitura e escrita vai em try/catch, e a falta
 * dela cai em "nenhuma" em vez de quebrar a página.
 */
export function SeletorMoeda() {
  const tx = useTextos();
  const [aberto, setAberto] = useState(false);
  const [extra, setExtra] = useState<CodigoMoeda | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  // ⚠️ Só depois de montar: no servidor não existe localStorage, e ler ali
  // daria divergência de hidratação.
  useEffect(() => { setExtra(lerMoedaEscolhida()); }, []);

  // Fecha ao clicar fora — caixinha que só fecha no próprio botão irrita.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const escolher = (m: CodigoMoeda | null) => {
    escolherMoeda(m);
    setExtra(m);
    setAberto(false);
  };

  return (
    <div className="seletor-moeda" ref={caixa}>
      <button
        type="button"
        className="seletor-moeda-botao"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="true"
        title={tx("escolherMoeda")}
      >
        <span aria-hidden="true">💱</span>
        <span className="seletor-moeda-codigo">{extra ?? "₲/$"}</span>
      </button>

      {aberto && (
        <div className="seletor-moeda-popover" role="dialog" aria-label={tx("escolherMoeda")}>
          {/* ★ As fixas aparecem como INFORMAÇÃO, não como botão: o leitor precisa
              entender por que já vê duas moedas antes de escolher a terceira. */}
          <p className="seletor-moeda-titulo">{tx("moedaAnunciada")}</p>
          <p className="seletor-moeda-fixas">
            {MOEDAS_FIXAS.map((m) => `${m.simbolo} ${m.nome}`).join("  ·  ")}
          </p>

          <p className="seletor-moeda-titulo">{tx("verTambemEm")}</p>
          <ul className="seletor-moeda-lista">
            {MOEDAS_OPCIONAIS.map((m) => (
              <li key={m.codigo}>
                <button
                  type="button"
                  className={m.codigo === extra ? "ativo" : undefined}
                  onClick={() => escolher(m.codigo)}
                >
                  <span className="seletor-moeda-simbolo">{m.simbolo}</span>
                  <span>{m.nome}</span>
                  {m.codigo === extra && <span className="seletor-moeda-check" aria-hidden="true">✓</span>}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className={extra === null ? "ativo" : undefined}
                onClick={() => escolher(null)}
              >
                <span className="seletor-moeda-simbolo">—</span>
                <span>{tx("nenhumaMoedaExtra")}</span>
                {extra === null && <span className="seletor-moeda-check" aria-hidden="true">✓</span>}
              </button>
            </li>
          </ul>

          {/* ⚠️ O aviso do peso não é letra miúda defensiva: é a mesma honestidade
              do "≈" no guarani. Taxa oficial ≠ o que se troca na rua. */}
          <p className="seletor-moeda-nota">{tx("avisoMoeda")}</p>
        </div>
      )}
    </div>
  );
}
