import { Calendar, Check, Gauge, MapPin, ExternalLink, Tag, ShieldAlert, Settings2 } from "lucide-react";
import { ROTULO_CLASSIFICACAO, CLASSE_CLASSIFICACAO, type Classificacao } from "@/lib/classificacao";
import { infoFonte } from "@/lib/fonte";
import { ROTULO_MOTIVO_VENDA } from "@/lib/motivoVenda";
import { ROTULO_PERFIL_REMETENTE, type PerfilRemetente } from "@/lib/perfilRemetente";
import { formatarDataCaptura, formatarKm, formatarMoeda } from "@/lib/formatadores";
import { ocultarTelefonesNaDescricao } from "@/lib/mascaras";
import { urlOportunidade } from "@/lib/site";
import { lerAtributo, chavesFonte, type CampoCanonico } from "@/lib/atributos";
import { BotaoWhatsapp } from "./BotaoWhatsapp";
import { GaleriaFotos } from "./GaleriaFotos";
import { BotaoCompartilharPagina } from "./BotaoCompartilharPagina";
import { PainelComparativo } from "./PainelComparativo";
import { buscarHistoricoFipe } from "@/lib/fipeHistorico";
import { buscarReferenciaPreco } from "@/lib/referenciaPreco";
import type { Oportunidade } from "@/lib/types";

const MESES_FIPE_SELO = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/**
 * Formata o mês de referência da FIPE pro selo. Trata os dois formatos que
 * aparecem no banco: "julho de 2026" (recálculo/oficial) e "2026-06" (captação
 * antiga OLX) → ambos viram "Julho/2026".
 */
function formatarMesRefFipe(ref: string): string {
  const t = ref.trim();
  const iso = t.match(/^(\d{4})-(\d{2})/);
  if (iso) return `${MESES_FIPE_SELO[Number(iso[2]) - 1] ?? iso[2]}/${iso[1]}`;
  const compacto = t.replace(" de ", "/");
  return compacto.charAt(0).toUpperCase() + compacto.slice(1);
}

// Faixa em que a margem, após o recálculo mensal, caiu abaixo do piso de
// captação (5%) mas ainda está na base (>=3%) — mostra o aviso de negociação.
const MARGEM_PISO_CAPTACAO = 5;
const MARGEM_MINIMA_BASE = 3;

export async function PaginaOportunidade({ oportunidade }: { oportunidade: Oportunidade }) {
  const [historicoFipe, referenciaPreco] = await Promise.all([
    buscarHistoricoFipe(oportunidade.fipe_codigo, oportunidade.ano),
    buscarReferenciaPreco(oportunidade.fipe_codigo, oportunidade.ano, oportunidade.fipe_valor, oportunidade.estado),
  ]);
  // Dedupe defensivo: oportunidades antigas podem ter `fotos_secundarias`
  // sem link de fato (ex.: repetindo a foto principal) — sem isso, o
  // slider mostraria "fotos" repetidas em vez de só a foto captada.
  const fotos = [...new Set(
    [oportunidade.foto_principal, ...oportunidade.fotos_secundarias].filter((url): url is string => !!url)
  )];
  const classificacao = oportunidade.classificacao as Classificacao | null;
  const { rotulo: rotuloFonte, classe: classeFonte } = infoFonte(oportunidade.fonte);
  const classeClassificacao = classificacao
    ? CLASSE_CLASSIFICACAO[classificacao] ?? "selo-classificacao-oportunidade"
    : "selo-classificacao-oportunidade";
  const diferencaValor =
    oportunidade.fipe_valor !== null ? oportunidade.fipe_valor - oportunidade.preco : null;
  const ehInsercaoDireta = oportunidade.origem_tipo === "insercao_direta";
  const titulo =
    ehInsercaoDireta && oportunidade.versao ? oportunidade.versao : oportunidade.veiculo;

  const mesRefFipe = oportunidade.fipe_data_referencia
    ? formatarMesRefFipe(oportunidade.fipe_data_referencia)
    : null;
  // Aviso "negocie": a margem caiu pra 3-5% na virada da FIPE (preço fixo, só
  // a FIPE muda no recálculo) — sinaliza a queda e convida a negociar.
  const margemFipe = oportunidade.margem_percentual;
  const avisoQuedaFipe =
    margemFipe !== null && margemFipe >= MARGEM_MINIMA_BASE && margemFipe < MARGEM_PISO_CAPTACAO;
  // Só admin chega aqui com um anúncio não-aprovado (ver buscarOportunidadePorId):
  // sinaliza que é prévia de revisão, não a página pública.
  const ehPreviaNaoAprovada = oportunidade.status !== "aprovada";

  // Atributos opcionais da OLX (cor, combustível, portas etc.) — só os que
  // o anunciante preencheu chegam aqui (ver olxService.ts no worker).
  // Os mais "ficha técnica" (tipo, cor, combustível, portas, direção,
  // potência) entram na <dl> ao lado de ano/km/câmbio; o resto (único dono,
  // troca, documentação) entra como chips na seção "Detalhes".
  const atributos = oportunidade.atributos_olx ?? {};
  // Ficha central: rótulo fixo → campo canônico. O leitor cobre OLX (carcolor/
  // fuel/…) E Mercado Livre (cor/tipo_de_combustível/…), que usam esquemas de
  // chave/valor diferentes, e normaliza o valor (ex.: "Gasolina e álcool"→"Flex",
  // "5"→"5 portas") — antes a ficha do ML ficava vazia ou com valor cru.
  const FICHA_CENTRAL: { rotulo: string; campo: CampoCanonico }[] = [
    { rotulo: "Tipo de veículo", campo: "cartype" },
    { rotulo: "Cor", campo: "carcolor" },
    { rotulo: "Combustível", campo: "fuel" },
    { rotulo: "Portas", campo: "doors" },
    { rotulo: "Direção", campo: "car_steering" },
    { rotulo: "Potência do motor", campo: "motorpower" },
  ];
  const fichaItens = FICHA_CENTRAL.map(({ rotulo, campo }) => {
    const value = lerAtributo(atributos, campo);
    return value ? { rotulo, value } : null;
  }).filter((x): x is { rotulo: string; value: string } => x !== null);
  const CHAVES_CENTRAIS = chavesFonte(FICHA_CENTRAL.map((f) => f.campo));
  // Os atributos fora da ficha central são todos booleanos (único dono,
  // aceita troca, documentação etc.) — só vale mostrar os "Sim": um "Não"
  // pra cada um deles é ruído (ex.: "Com multas: Não"), não informação que
  // ajuda a decisão de compra.
  const detalhesExtras = Object.entries(atributos).filter(
    ([chave, atributo]) => !CHAVES_CENTRAIS.has(chave) && atributo.value === "Sim"
  );

  return (
    <article className="pagina-oportunidade">
      {ehPreviaNaoAprovada && (
        <div className="previa-nao-aprovada">
          <strong>Prévia de revisão</strong> — anúncio ainda em Descobertas, visível só para admin. Não
          está público até ser aprovado.
        </div>
      )}
      <GaleriaFotos fotos={fotos} alt={titulo} />

      <div className="pagina-oportunidade-corpo">
        <div className="pagina-oportunidade-selos">
          <span className={`selo-fonte selo-fonte-inline ${classeFonte}`}>{rotuloFonte}</span>
          {classificacao && (
            <span className={`selo-classificacao ${classeClassificacao} selo-classificacao-inline`}>
              {ROTULO_CLASSIFICACAO[classificacao]}
            </span>
          )}
        </div>

        <h1 className="pagina-oportunidade-titulo">{titulo}</h1>
        {ehInsercaoDireta && oportunidade.versao && oportunidade.versao !== oportunidade.veiculo && (
          <p className="pagina-oportunidade-subtitulo">{oportunidade.veiculo}</p>
        )}

        <div className="destaque-margem">
          <p className="destaque-margem-valor-rotulo">Ganho</p>
          <p className="destaque-margem-valor">{formatarMoeda(diferencaValor)}</p>
          <p className="destaque-margem-percentual">
            <span className="destaque-margem-percentual-rotulo">Margem de</span>{" "}
            {oportunidade.margem_percentual?.toFixed(1)}%{" "}
            <span className="destaque-margem-percentual-rotulo">abaixo da FIPE</span>
          </p>
          {mesRefFipe && <span className="selo-mes-fipe">FIPE ref. {mesRefFipe}</span>}
        </div>

        {avisoQuedaFipe && (
          <div className="aviso-queda-fipe">
            <span className="aviso-queda-fipe-icone" aria-hidden>⚡</span>
            <p>
              <strong>Atenção:</strong> este anúncio teve queda de margem pela atualização da FIPE
              deste mês, que foi negativa para esse modelo. Ainda está abaixo da tabela — aproveite e
              negocie o valor, alertando o proprietário de que a FIPE caiu!
            </p>
          </div>
        )}

        <div className="precos-grupo precos-grupo-pagina">
          <div className="linha-preco linha-preco-anuncio">
            <span className="preco-rotulo">Oferta</span>
            <span className="preco-valor">{formatarMoeda(oportunidade.preco)}</span>
          </div>
          <div className="linha-preco linha-preco-fipe">
            <span className="preco-rotulo">FIPE</span>
            <span>{formatarMoeda(oportunidade.fipe_valor)}</span>
          </div>
        </div>

        <PainelComparativo
          historico={historicoFipe}
          referencia={referenciaPreco}
          precoAnuncio={oportunidade.preco}
          fipeValor={oportunidade.fipe_valor}
          mesRef={mesRefFipe}
        />

        <dl className="pagina-oportunidade-ficha">
          <div className="pagina-oportunidade-ficha-item pagina-oportunidade-ficha-item-linha">
            <dt>
              <MapPin size={13} strokeWidth={1.75} className="icone-inline" /> Cidade
            </dt>
            <dd>
              {oportunidade.cidade ?? "—"} · {oportunidade.estado ?? "—"}
            </dd>
          </div>
          <div className="pagina-oportunidade-ficha-item">
            <dt>
              <Calendar size={13} strokeWidth={1.75} className="icone-inline" /> Ano
            </dt>
            <dd>{oportunidade.ano ?? "—"}</dd>
          </div>
          <div className="pagina-oportunidade-ficha-item">
            <dt>
              <Gauge size={13} strokeWidth={1.75} className="icone-inline" /> KM
            </dt>
            <dd>{formatarKm(oportunidade.km)}</dd>
          </div>
          {oportunidade.cambio && (
            <div className="pagina-oportunidade-ficha-item">
              <dt>
                <Settings2 size={13} strokeWidth={1.75} className="icone-inline" /> Câmbio
              </dt>
              <dd>{oportunidade.cambio}</dd>
            </div>
          )}
          {fichaItens.map((item) => {
            return (
              <div key={item.rotulo} className="pagina-oportunidade-ficha-item">
                <dt>{item.rotulo}</dt>
                <dd>{item.value}</dd>
              </div>
            );
          })}
        </dl>

        {detalhesExtras.length > 0 && (
          <div className="pagina-oportunidade-secao">
            <h2>Detalhes</h2>
            <div className="pagina-oportunidade-chips">
              {detalhesExtras.map(([chave, atributo]) => (
                <span key={chave} className="pagina-oportunidade-chip">
                  <Check size={14} strokeWidth={2.5} className="icone-inline" /> {atributo.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {oportunidade.opcionais.length > 0 && (
          <div className="pagina-oportunidade-secao">
            <h2>Opcionais</h2>
            <div className="pagina-oportunidade-chips">
              {oportunidade.opcionais.map((opcao) => (
                <span key={opcao} className="pagina-oportunidade-chip">
                  {opcao}
                </span>
              ))}
            </div>
          </div>
        )}

        {oportunidade.sinistro_leilao.length > 0 && (
          <div className="pagina-oportunidade-secao">
            <h2>
              <ShieldAlert size={14} strokeWidth={1.75} className="icone-inline" /> Sinistro ou leilão
            </h2>
            <div className="pagina-oportunidade-chips">
              {oportunidade.sinistro_leilao.map((opcao) => (
                <span key={opcao} className="pagina-oportunidade-chip">
                  {opcao}
                </span>
              ))}
            </div>
          </div>
        )}

        {oportunidade.descricao && (
          <div className="pagina-oportunidade-secao">
            <h2>Descrição</h2>
            <p className="pagina-oportunidade-descricao">
              {ehInsercaoDireta
                ? oportunidade.descricao
                : ocultarTelefonesNaDescricao(oportunidade.descricao).map((segmento, indice) =>
                    segmento.tipo === "telefone" ? (
                      <span
                        key={indice}
                        className="telefone-oculto"
                        title="Contato disponível apenas no anúncio original"
                      >
                        telefone oculto
                      </span>
                    ) : (
                      <span key={indice}>{segmento.valor}</span>
                    )
                  )}
            </p>
          </div>
        )}

        {oportunidade.motivo_venda && (
          <p className="motivo-venda">
            <Tag size={14} strokeWidth={1.75} className="icone-inline" /> Motivo da venda:{" "}
            {ROTULO_MOTIVO_VENDA[oportunidade.motivo_venda]}
          </p>
        )}

        {ehInsercaoDireta && oportunidade.perfil_remetente && (
          <p className="motivo-venda">
            <Tag size={14} strokeWidth={1.75} className="icone-inline" /> Perfil do vendedor:{" "}
            {ROTULO_PERFIL_REMETENTE[oportunidade.perfil_remetente as PerfilRemetente]}
          </p>
        )}

        <p className="pagina-oportunidade-data">
          Publicado em {formatarDataCaptura(oportunidade.data_publicacao_origem ?? oportunidade.data_captura)}
        </p>

        {oportunidade.whatsapp && (
          <BotaoWhatsapp
            opportunityId={oportunidade.id}
            whatsapp={oportunidade.whatsapp}
            nomeRemetente={oportunidade.nome_remetente}
          />
        )}

        {!oportunidade.link_origem.startsWith("insercao-direta:") && (
          <a href={oportunidade.link_origem} target="_blank" rel="noreferrer" className="link-origem">
            <span className="link-origem-texto">
              <ExternalLink size={14} strokeWidth={1.75} className="icone-inline" /> Abrir anúncio original
            </span>
            <span aria-hidden="true">›</span>
          </a>
        )}

        <BotaoCompartilharPagina oportunidade={oportunidade} url={urlOportunidade(oportunidade)} />
      </div>
    </article>
  );
}
