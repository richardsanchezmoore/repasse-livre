import { Calendar, Check, Gauge, MapPin, MessageCircle, ExternalLink, Tag, ShieldAlert, Settings2 } from "lucide-react";
import { ROTULO_CLASSIFICACAO, CLASSE_CLASSIFICACAO, type Classificacao } from "@/lib/classificacao";
import { ROTULO_MOTIVO_VENDA } from "@/lib/motivoVenda";
import { ROTULO_PERFIL_REMETENTE, type PerfilRemetente } from "@/lib/perfilRemetente";
import { formatarDataCaptura, formatarKm, formatarMoeda } from "@/lib/formatadores";
import { formatarWhatsapp } from "@/lib/mascaras";
import { urlOportunidade } from "@/lib/site";
import { GaleriaFotos } from "./GaleriaFotos";
import { BotaoCompartilharPagina } from "./BotaoCompartilharPagina";
import type { Oportunidade } from "@/lib/types";

const CLASSE_FONTE: Record<string, string> = {
  OLX: "selo-fonte-olx",
  Webmotors: "selo-fonte-webmotors",
  "Mercado Livre": "selo-fonte-mercadolivre",
};

export function PaginaOportunidade({ oportunidade }: { oportunidade: Oportunidade }) {
  // Dedupe defensivo: oportunidades antigas podem ter `fotos_secundarias`
  // sem link de fato (ex.: repetindo a foto principal) — sem isso, o
  // slider mostraria "fotos" repetidas em vez de só a foto captada.
  const fotos = [...new Set(
    [oportunidade.foto_principal, ...oportunidade.fotos_secundarias].filter((url): url is string => !!url)
  )];
  const classificacao = oportunidade.classificacao as Classificacao | null;
  const classeFonte = CLASSE_FONTE[oportunidade.fonte] ?? "selo-fonte-generico";
  const classeClassificacao = classificacao
    ? CLASSE_CLASSIFICACAO[classificacao] ?? "selo-classificacao-oportunidade"
    : "selo-classificacao-oportunidade";
  const diferencaValor =
    oportunidade.fipe_valor !== null ? oportunidade.fipe_valor - oportunidade.preco : null;
  const ehInsercaoDireta = oportunidade.origem_tipo === "insercao_direta";
  const titulo =
    ehInsercaoDireta && oportunidade.versao ? oportunidade.versao : oportunidade.veiculo;

  // Atributos opcionais da OLX (cor, combustível, portas etc.) — só os que
  // o anunciante preencheu chegam aqui (ver olxService.ts no worker).
  // Os mais "ficha técnica" (tipo, cor, combustível, portas, direção,
  // potência) entram na <dl> ao lado de ano/km/câmbio; o resto (único dono,
  // troca, documentação) entra como chips na seção "Detalhes".
  const atributos = oportunidade.atributos_olx ?? {};
  const CHAVES_FICHA: readonly string[] = ["cartype", "carcolor", "fuel", "doors", "car_steering", "motorpower"];
  // Os atributos fora da ficha técnica são todos booleanos (único dono,
  // aceita troca, documentação etc.) — só vale mostrar os "Sim": um "Não"
  // pra cada um deles é ruído (ex.: "Com multas: Não"), não informação que
  // ajuda a decisão de compra.
  const detalhesExtras = Object.entries(atributos).filter(
    ([chave, atributo]) => !CHAVES_FICHA.includes(chave) && atributo.value === "Sim"
  );

  return (
    <article className="pagina-oportunidade">
      <GaleriaFotos fotos={fotos} alt={titulo} />

      <div className="pagina-oportunidade-corpo">
        <div className="pagina-oportunidade-selos">
          <span className={`selo-fonte selo-fonte-inline ${classeFonte}`}>{oportunidade.fonte}</span>
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
        </div>

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

        <dl className="pagina-oportunidade-ficha">
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
          <div className="pagina-oportunidade-ficha-item">
            <dt>
              <MapPin size={13} strokeWidth={1.75} className="icone-inline" /> Local
            </dt>
            <dd>
              {oportunidade.cidade ?? "—"} · {oportunidade.estado ?? "—"}
            </dd>
          </div>
          {CHAVES_FICHA.map((chave) => {
            const atributo = atributos[chave];
            if (!atributo) return null;
            return (
              <div key={chave} className="pagina-oportunidade-ficha-item">
                <dt>{atributo.label}</dt>
                <dd>{atributo.value}</dd>
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
            <p className="pagina-oportunidade-descricao">{oportunidade.descricao}</p>
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
          <a
            href={`https://wa.me/55${oportunidade.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="botao-whatsapp-pagina"
          >
            <MessageCircle size={18} strokeWidth={2} />
            Falar com {oportunidade.nome_remetente || "o vendedor"} no WhatsApp
            <span className="botao-whatsapp-pagina-numero">{formatarWhatsapp(oportunidade.whatsapp)}</span>
          </a>
        )}

        {!oportunidade.link_origem.startsWith("insercao-direta:") && (
          <a href={oportunidade.link_origem} target="_blank" rel="noreferrer" className="link-origem">
            <span className="link-origem-texto">
              <ExternalLink size={14} strokeWidth={1.75} className="icone-inline" /> Abrir anúncio original
            </span>
            <span aria-hidden="true">›</span>
          </a>
        )}

        <BotaoCompartilharPagina oportunidade={oportunidade} url={urlOportunidade(oportunidade.id)} />
      </div>
    </article>
  );
}
