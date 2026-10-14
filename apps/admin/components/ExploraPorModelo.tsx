import Link from "next/link";
import { buscarModelosDestaque, type ModeloDestaque } from "@/lib/modelosDestaque";
import { caminhoNoIdioma, t, IDIOMA_PADRAO, type Idioma } from "@/lib/idioma";
import { SIMBOLO_MOEDA } from "@/lib/moeda";

/**
 * ═══ A FILEIRA DE MODELOS, logo abaixo dos KPI ═══
 *
 * ★★ Pedido do Gustavo (12/10/2026): entrar direto no carro em vez de começar
 * preenchendo filtro. A lista vem da contagem viva da base — ver
 * `lib/modelosDestaque.ts`, que explica por que não pode vir de palpite.
 *
 * ★★★ O QUE SEPARA ISTO DE UM CARROSSEL BONITO: cada cartão carrega o NÚMERO.
 * Quantos anúncios vivos e, quando a tabela já cobre o modelo, a faixa das
 * medianas com os anos a que ela se refere. É o dado que ninguém mais tem no
 * Paraguai; sem ele, a fileira seria só navegação enfeitada.
 *
 * ⚠️ A FOTO É DO ANÚNCIO MAIS RECENTE DAQUELE MODELO, re-hospedada no nosso
 * bucket, e não um ícone desenhado. Desenhar um ícone por modelo foi
 * considerado e não fecha a conta aqui: a base tem 228 modelos distintos, e a
 * frota paraguaia é JDM de vinte anos — a silhueta de um Vitz, de um Ractis e
 * de um Funcargo é o mesmo borrão em 120px. A foto real é reconhecível na hora,
 * sai de graça e se atualiza sozinha. Se um dia houver biblioteca de ícones,
 * troca-se só o `<img>` daqui.
 *
 * ⚠️ `loading="lazy"` em todas: a fileira rola na horizontal e quase nunca é
 * vista inteira — carregar 14 fotos de saída atrasaria a listagem, que é o que
 * o visitante veio ver.
 */

/**
 * Faixa compacta. "₲ 17.000.000 – 44.000.000" não cabe num cartão de 150px, e
 * quebrar o número em duas linhas é pior do que abreviar.
 */
function faixaCompacta(ref: NonNullable<ModeloDestaque["referencia"]>, unidadeMilhoes: string, unidadeMilhares: string): string {
  const simbolo = SIMBOLO_MOEDA[ref.moeda as keyof typeof SIMBOLO_MOEDA] ?? ref.moeda;
  const guarani = ref.moeda === "PYG";
  const divisor = guarani ? 1_000_000 : 1_000;
  const unidade = guarani ? unidadeMilhoes : unidadeMilhares;
  const corta = (v: number) => {
    const n = v / divisor;
    // Uma casa só abaixo de 10 — "4,5 mi" informa, "4,53 mi" só ocupa espaço.
    return n < 10 ? n.toLocaleString("es-PY", { maximumFractionDigits: 1 }) : Math.round(n).toLocaleString("es-PY");
  };
  const valores = ref.min === ref.max ? corta(ref.min) : `${corta(ref.min)}–${corta(ref.max)}`;
  return `${simbolo} ${valores} ${unidade}`;
}

export async function ExploraPorModelo({
  idioma = IDIOMA_PADRAO,
  modeloAtivo,
}: { idioma?: Idioma; modeloAtivo?: string } = {}) {
  const tx = t(idioma);
  const modelos = await buscarModelosDestaque();
  // ⚠️ Sem dado, não renderiza nada. Uma seção vazia com título é pior do que
  // seção nenhuma — anuncia uma funcionalidade que não entrega.
  if (modelos.length < 4) return null;

  const base = caminhoNoIdioma("/", idioma);
  const href = (m: string) => `${base}${base.endsWith("/") ? "" : "/"}?modelo=${encodeURIComponent(m)}`;

  /**
   * ★★ DENTRO DE UM MODELO, A FILEIRA ENCOLHE PARA CHIPS.
   *
   * ⚠️ Pedido do Gustavo (14/10/2026), olhando a própria tela: *"ao entrar na
   * categoria/modelo o slider segue dominando o topo"*. E é um defeito de
   * verdade — quem já escolheu o Sportage não precisa de nove fotos grandes
   * de outros carros antes de ver os Sportage. A descoberta já cumpriu o
   * papel dela; o que resta é a porta para trocar de modelo.
   *
   * ⚠️ Encolher e não SUMIR: sumir deixaria o visitante preso no modelo, com
   * o botão de voltar do navegador como única saída.
   */
  if (modeloAtivo) {
    const atual = modeloAtivo.toLowerCase();
    return (
      <section className="explora-modelos explora-modelos-compacto" aria-labelledby="explora-modelos-titulo">
        <h2 id="explora-modelos-titulo" className="explora-modelos-titulo-compacto">
          {tx("exploraPorModelo")}
        </h2>
        <div className="explora-modelos-chips">
          {modelos.map((m) => (
            <Link
              key={m.modelo}
              href={href(m.modelo)}
              className={`chip-modelo-link ${m.modelo === atual ? "chip-modelo-link-ativo" : ""}`}
            >
              {m.rotulo}
              <span className="chip-modelo-link-n">{m.n}</span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="explora-modelos" aria-labelledby="explora-modelos-titulo">
      <div className="explora-modelos-cabecalho">
        <h2 id="explora-modelos-titulo" className="explora-modelos-titulo">
          {tx("exploraPorModelo")}
        </h2>
        <span className="explora-modelos-sub">{tx("exploraPorModeloSub")}</span>
      </div>

      <div className="explora-modelos-fila">
        {modelos.map((m) => (
          <Link
            key={m.modelo}
            href={href(m.modelo)}
            className="modelo-card"
            title={m.rotulo}
          >
            <span className="modelo-card-foto">
              {m.foto ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={m.foto} alt={m.rotulo} loading="lazy" />
              ) : (
                <span className="modelo-card-foto-vazia" aria-hidden />
              )}
            </span>
            <span className="modelo-card-nome">{m.rotulo}</span>
            <span className="modelo-card-n">
              {m.n} {tx("anunciosCurto")}
            </span>
            {m.referencia ? (
              <span className="modelo-card-ref">
                {faixaCompacta(m.referencia, tx("unidadeMilhoes"), tx("unidadeMilhares"))}
                {m.referencia.anoMin > 0 && (
                  <span className="modelo-card-anos">
                    {m.referencia.anoMin === m.referencia.anoMax
                      ? m.referencia.anoMin
                      : `${m.referencia.anoMin}–${m.referencia.anoMax}`}
                  </span>
                )}
              </span>
            ) : (
              <span className="modelo-card-ref modelo-card-ref-vazia">{tx("semReferenciaAinda")}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
