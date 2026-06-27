"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import Script from "next/script";
import { AlertTriangle, BadgeCheck, Sparkles } from "lucide-react";
import { enviarOportunidade, type ResultadoEnvio } from "@/app/enviar/actions";
import { DropzoneFotos, type FotoEnviada } from "@/components/DropzoneFotos";
import { EstadoEnvioFormulario } from "@/components/EstadoEnvioFormulario";
import { BotaoEnviarFormulario } from "@/components/BotaoEnviarFormulario";
import { calcularMargemPercentual, ehElegivel, classificar } from "@/lib/margin";
import { ROTULO_CLASSIFICACAO } from "@/lib/classificacao";
import { PERFIS_REMETENTE, ROTULO_PERFIL_REMETENTE } from "@/lib/perfilRemetente";
import { MOTIVOS_VENDA, ROTULO_MOTIVO_VENDA } from "@/lib/motivoVenda";
import { UFS, apenasDigitos, formatarMoeda, formatarWhatsapp } from "@/lib/mascaras";
import type { FipeOpcao } from "@/lib/fipe";

const ESTADO_INICIAL: ResultadoEnvio = { erro: null, sucesso: false };

const NIVEIS_CLASSIFICACAO = [
  { margem: 10, rotulo: "Prata" },
  { margem: 15, rotulo: "Ouro" },
  { margem: 20, rotulo: "Diamante" },
];

const OPCOES_OPCIONAIS = ["Ar Condicionado", "Direção Hidráulica/Elétrica", "Vidros Elétricos", "Travas Elétricas"];

const OPCOES_SINISTRO_LEILAO = ["Leilão", "Sinistro", "Não", "Não sei"];

function alternarItem(lista: string[], item: string): string[] {
  return lista.includes(item) ? lista.filter((v) => v !== item) : [...lista, item];
}

function formatarMoedaValor(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function buscarFipe(query: string): Promise<FipeOpcao[]> {
  const resp = await fetch(`/api/fipe?${query}`);
  if (!resp.ok) return [];
  return resp.json();
}

async function buscarValorFipeApi(query: string): Promise<{ valor?: number; erro?: string }> {
  const resp = await fetch(`/api/fipe?${query}`);
  const dados = await resp.json();
  if (!resp.ok) return { erro: dados.erro ?? "Falha ao consultar a FIPE." };
  return dados;
}

type CampoTocado = Record<string, boolean>;
type Erros = Record<string, string | null>;

export function FormularioEnvio({
  siteKeyTurnstile,
  nomeInicial,
  whatsappInicial,
}: {
  siteKeyTurnstile: string;
  nomeInicial?: string | null;
  whatsappInicial?: string | null;
}) {
  const [estado, acao] = useFormState(enviarOportunidade, ESTADO_INICIAL);

  const [marcas, setMarcas] = useState<FipeOpcao[]>([]);
  const [modelos, setModelos] = useState<FipeOpcao[]>([]);
  const [anos, setAnos] = useState<FipeOpcao[]>([]);

  const [marcaCode, setMarcaCode] = useState("");
  const [marcaNome, setMarcaNome] = useState("");
  const [modeloCode, setModeloCode] = useState("");
  const [modeloNome, setModeloNome] = useState("");
  const [anoCode, setAnoCode] = useState("");
  const [anoNome, setAnoNome] = useState("");
  const [valorFipe, setValorFipe] = useState<number | null>(null);
  const [erroFipe, setErroFipe] = useState<string | null>(null);
  const [carregandoFipe, setCarregandoFipe] = useState(false);
  const [precoDigitos, setPrecoDigitos] = useState("");
  const [cidade, setCidade] = useState("");
  const [estadoUf, setEstadoUf] = useState("");
  const [cambio, setCambio] = useState("");
  const [kmDigitos, setKmDigitos] = useState("");
  const [fotos, setFotos] = useState<FotoEnviada[]>([]);
  const [whatsappDigitos, setWhatsappDigitos] = useState(whatsappInicial ?? "");
  const [nomeRemetente, setNomeRemetente] = useState(nomeInicial ?? "");
  const [perfilRemetente, setPerfilRemetente] = useState("");
  const [motivoVenda, setMotivoVenda] = useState("");
  const [descricao, setDescricao] = useState("");
  const [opcionais, setOpcionais] = useState<string[]>([]);
  const [sinistroLeilao, setSinistroLeilao] = useState<string[]>([]);

  const [tocado, setTocado] = useState<CampoTocado>({});

  useEffect(() => {
    buscarFipe("recurso=marcas").then(setMarcas);
  }, []);

  useEffect(() => {
    if (fotos.length > 0) marcarTocado("foto");
  }, [fotos.length]);

  useEffect(() => {
    setModelos([]);
    setModeloCode("");
    if (!marcaCode) return;
    buscarFipe(`recurso=modelos&marca=${marcaCode}`).then(setModelos);
  }, [marcaCode]);

  useEffect(() => {
    setAnos([]);
    setAnoCode("");
    setValorFipe(null);
    if (!marcaCode || !modeloCode) return;
    buscarFipe(`recurso=anos&marca=${marcaCode}&modelo=${modeloCode}`).then(setAnos);
  }, [marcaCode, modeloCode]);

  useEffect(() => {
    setValorFipe(null);
    setErroFipe(null);
    if (!marcaCode || !modeloCode || !anoCode) return;
    setCarregandoFipe(true);
    buscarValorFipeApi(`recurso=valor&marca=${marcaCode}&modelo=${modeloCode}&ano=${anoCode}`)
      .then((resultado) => {
        if (typeof resultado.valor === "number") {
          setValorFipe(resultado.valor);
        } else {
          setErroFipe(resultado.erro ?? "Não foi possível consultar a FIPE para esse veículo.");
        }
      })
      .finally(() => setCarregandoFipe(false));
  }, [marcaCode, modeloCode, anoCode]);

  const preco = Number(precoDigitos || 0);

  const margem = useMemo(() => {
    if (!valorFipe || !preco) return null;
    return calcularMargemPercentual(preco, valorFipe);
  }, [preco, valorFipe]);

  const precoMaximoElegivel = valorFipe ? Math.floor(valorFipe * 0.95) : null;

  function marcarTocado(campo: string) {
    setTocado((anterior) => ({ ...anterior, [campo]: true }));
  }

  const erros: Erros = {
    marcaCode: marcaCode ? null : "Selecione a marca.",
    modeloCode: modeloCode ? null : "Selecione o modelo.",
    anoCode: anoCode ? null : "Selecione o ano.",
    preco: preco > 0 ? null : "Informe um preço válido.",
    estadoUf: estadoUf ? null : "Selecione o estado.",
    foto: !fotos.some((f) => f.status === "ok")
      ? "Envie ao menos uma foto do veículo."
      : fotos.some((f) => f.status === "enviando")
        ? "Aguarde o envio das fotos terminar."
        : null,
    whatsapp: /^\d{10,11}$/.test(whatsappDigitos) ? null : "Informe um WhatsApp válido com DDD.",
    perfilRemetente: perfilRemetente ? null : "Selecione seu perfil.",
    motivoVenda: motivoVenda ? null : "Selecione o motivo da venda.",
  };

  const margemInsuficiente = margem !== null && !ehElegivel(margem);
  const formularioValido = Object.values(erros).every((e) => e === null) && margem !== null && !margemInsuficiente;

  function erroVisivel(campo: string): string | null {
    return tocado[campo] ? erros[campo] : null;
  }

  const classificacaoPreview = margem !== null && !margemInsuficiente ? classificar(margem) : null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />

      {estado.sucesso ? (
        <p className="formulario-sucesso">
          Oportunidade enviada com sucesso! Nossa equipe vai revisar em breve.
        </p>
      ) : (
        <form
          action={acao}
          className="formulario-envio"
          onSubmit={() =>
            setTocado({
              marcaCode: true,
              modeloCode: true,
              anoCode: true,
              preco: true,
              estadoUf: true,
              foto: true,
              whatsapp: true,
              perfilRemetente: true,
              motivoVenda: true,
            })
          }
        >
          <EstadoEnvioFormulario />

          {estado.erro && <p className="formulario-erro">{estado.erro}</p>}

          <input type="hidden" name="veiculo" value={`${marcaNome} ${modeloNome}`.trim()} />

          <label className="campo">
            <select
              value={marcaCode}
              onChange={(e) => {
                setMarcaCode(e.target.value);
                setMarcaNome(e.target.options[e.target.selectedIndex]?.text ?? "");
              }}
              onBlur={() => marcarTocado("marcaCode")}
            >
              <option value="">Marca</option>
              {marcas.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name}
                </option>
              ))}
            </select>
            {erroVisivel("marcaCode") && <small className="campo-erro">{erroVisivel("marcaCode")}</small>}
          </label>
          <input type="hidden" name="marcaCode" value={marcaCode} />

          <label className="campo">
            <select
              value={modeloCode}
              onChange={(e) => {
                setModeloCode(e.target.value);
                setModeloNome(e.target.options[e.target.selectedIndex]?.text ?? "");
              }}
              onBlur={() => marcarTocado("modeloCode")}
              disabled={!marcaCode}
              title={!marcaCode ? "Selecione a marca primeiro" : undefined}
            >
              <option value="">{marcaCode ? "Modelo" : "Selecione a marca primeiro"}</option>
              {modelos.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name}
                </option>
              ))}
            </select>
            {erroVisivel("modeloCode") && <small className="campo-erro">{erroVisivel("modeloCode")}</small>}
          </label>
          <input type="hidden" name="modeloCode" value={modeloCode} />
          <input type="hidden" name="modeloNome" value={modeloNome} />

          <label className="campo">
            <select
              value={anoCode}
              onChange={(e) => {
                setAnoCode(e.target.value);
                setAnoNome(e.target.options[e.target.selectedIndex]?.text ?? "");
              }}
              onBlur={() => marcarTocado("anoCode")}
              disabled={!modeloCode}
              title={!modeloCode ? "Selecione o modelo primeiro" : undefined}
            >
              <option value="">{modeloCode ? "Ano" : "Selecione o modelo primeiro"}</option>
              {anos.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.name}
                </option>
              ))}
            </select>
            {erroVisivel("anoCode") && <small className="campo-erro">{erroVisivel("anoCode")}</small>}
          </label>
          <input type="hidden" name="anoCode" value={anoCode} />
          <input type="hidden" name="anoNome" value={anoNome} />

          {carregandoFipe && <p className="formulario-fipe-carregando">Consultando a tabela FIPE…</p>}

          {erroFipe && <small className="campo-erro">{erroFipe}</small>}

          {valorFipe !== null && (
            <div className="formulario-fipe">
              <BadgeCheck size={20} strokeWidth={2} className="formulario-fipe-icone" />
              <span>
                Valor na tabela FIPE:{" "}
                <strong>{valorFipe.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
              </span>
            </div>
          )}

          <label className="campo">
            <input
              inputMode="numeric"
              value={precoDigitos ? `R$ ${formatarMoeda(precoDigitos)}` : ""}
              onChange={(e) => setPrecoDigitos(apenasDigitos(e.target.value))}
              onBlur={() => marcarTocado("preco")}
              placeholder="Preço de venda"
            />
            {erroVisivel("preco") && <small className="campo-erro">{erroVisivel("preco")}</small>}
          </label>
          <input type="hidden" name="preco" value={precoDigitos} />

          {margem !== null && (
            <div className={`formulario-margem ${margemInsuficiente ? "formulario-margem-baixa" : "formulario-margem-ok"}`}>
              {margemInsuficiente ? (
                <AlertTriangle size={20} strokeWidth={2} className="formulario-margem-icone" />
              ) : (
                <BadgeCheck size={20} strokeWidth={2} className="formulario-margem-icone" />
              )}
              <span>
                {margemInsuficiente
                  ? margem < 0
                    ? `Valor acima da FIPE! Preço máximo aceito: ${precoMaximoElegivel?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Mínimo aceito é de 5% abaixo!`
                    : `Margem de ${margem.toFixed(1)}% — abaixo do mínimo de 5%. Preço máximo aceito: ${precoMaximoElegivel?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`
                  : `Margem de ${margem.toFixed(1)}% abaixo da FIPE — Sua classificação é: ${classificacaoPreview ? ROTULO_CLASSIFICACAO[classificacaoPreview] : ""}.`}
              </span>
            </div>
          )}

          {!margemInsuficiente && margem !== null && valorFipe !== null && (
            <div className="formulario-incentivo">
              <Sparkles size={20} strokeWidth={2} className="formulario-incentivo-icone" />
              <div>
                <p className="formulario-incentivo-titulo">
                  Quanto maior seu desconto, mais chance de achar um comprador imediato.
                </p>
                <ul className="formulario-incentivo-lista">
                  {NIVEIS_CLASSIFICACAO.filter((nivel) => nivel.margem > margem).map((nivel) => (
                    <li key={nivel.rotulo}>
                      Se o valor for {formatarMoedaValor(valorFipe * (1 - nivel.margem / 100))} (desconto de{" "}
                      {nivel.margem}%) — Sua classificação será: <strong>{nivel.rotulo}</strong>.
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <label className="campo">
            <input
              inputMode="numeric"
              value={formatarMoeda(kmDigitos)}
              onChange={(e) => setKmDigitos(apenasDigitos(e.target.value))}
              placeholder="KM Atual"
            />
          </label>
          <input type="hidden" name="km" value={kmDigitos} />

          <div className="campo">
            <span className="campo-titulo-grupo">Opcionais</span>
            <div className="campo-checkboxes">
              {OPCOES_OPCIONAIS.map((opcao) => (
                <label key={opcao} className="campo-checkbox">
                  <input
                    type="checkbox"
                    checked={opcionais.includes(opcao)}
                    onChange={() => setOpcionais((atual) => alternarItem(atual, opcao))}
                  />
                  {opcao}
                </label>
              ))}
            </div>
          </div>
          <input type="hidden" name="opcionaisJson" value={JSON.stringify(opcionais)} />

          <div className="campo">
            <span className="campo-titulo-grupo">Sinistro ou Leilão?</span>
            <div className="campo-checkboxes">
              {OPCOES_SINISTRO_LEILAO.map((opcao) => (
                <label key={opcao} className="campo-checkbox">
                  <input
                    type="checkbox"
                    checked={sinistroLeilao.includes(opcao)}
                    onChange={() => setSinistroLeilao((atual) => alternarItem(atual, opcao))}
                  />
                  {opcao}
                </label>
              ))}
            </div>
          </div>
          <input type="hidden" name="sinistroLeilaoJson" value={JSON.stringify(sinistroLeilao)} />

          <label className="campo">
            <select value={cambio} onChange={(e) => setCambio(e.target.value)}>
              <option value="">Câmbio</option>
              <option value="Manual">Manual</option>
              <option value="Automático">Automático</option>
            </select>
          </label>
          <input type="hidden" name="cambio" value={cambio} />

          <label className="campo">
            <span>Fotos do veículo</span>
            <DropzoneFotos fotos={fotos} onChange={setFotos} />
            {erroVisivel("foto") && <small className="campo-erro">{erroVisivel("foto")}</small>}
          </label>
          <input
            type="hidden"
            name="fotoPrincipalUrl"
            value={fotos.find((f) => f.status === "ok" && f.principal)?.url ?? ""}
          />
          <input
            type="hidden"
            name="fotosSecundariasJson"
            value={JSON.stringify(
              fotos.filter((f) => f.status === "ok" && !f.principal).map((f) => f.url)
            )}
          />

          <label className="campo">
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="(Opcional) Descreva detalhes, pneus fracos, motor precisa revisar, lataria boa..."
              rows={3}
            />
          </label>
          <input type="hidden" name="descricao" value={descricao} />

          <span className="campo-titulo-grupo">Seus Dados</span>
          <label className="campo">
            <input
              name="nomeRemetente"
              value={nomeRemetente}
              onChange={(e) => setNomeRemetente(e.target.value)}
              placeholder="Seu nome"
            />
          </label>

          <label className="campo">
            <input
              inputMode="numeric"
              value={formatarWhatsapp(whatsappDigitos)}
              onChange={(e) => setWhatsappDigitos(apenasDigitos(e.target.value))}
              onBlur={() => marcarTocado("whatsapp")}
              placeholder="Whats: (51) 99999-9999"
            />
            {erroVisivel("whatsapp") && <small className="campo-erro">{erroVisivel("whatsapp")}</small>}
          </label>
          <input type="hidden" name="whatsapp" value={whatsappDigitos} />

          <label className="campo">
            <select value={estadoUf} onChange={(e) => setEstadoUf(e.target.value)} onBlur={() => marcarTocado("estadoUf")}>
              <option value="">Estado (UF)</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
            {erroVisivel("estadoUf") && <small className="campo-erro">{erroVisivel("estadoUf")}</small>}
          </label>
          <input type="hidden" name="estado" value={estadoUf} />

          <label className="campo">
            <input name="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" />
          </label>

          <label className="campo">
            <select
              value={perfilRemetente}
              onChange={(e) => setPerfilRemetente(e.target.value)}
              onBlur={() => marcarTocado("perfilRemetente")}
            >
              <option value="">Seu Perfil de Anunciante?</option>
              {PERFIS_REMETENTE.map((perfil) => (
                <option key={perfil} value={perfil}>
                  {ROTULO_PERFIL_REMETENTE[perfil]}
                </option>
              ))}
            </select>
            {erroVisivel("perfilRemetente") && <small className="campo-erro">{erroVisivel("perfilRemetente")}</small>}
          </label>
          <input type="hidden" name="perfilRemetente" value={perfilRemetente} />

          <label className="campo">
            <select
              value={motivoVenda}
              onChange={(e) => setMotivoVenda(e.target.value)}
              onBlur={() => marcarTocado("motivoVenda")}
            >
              <option value="">Motivo da venda</option>
              {MOTIVOS_VENDA.map((motivo) => (
                <option key={motivo} value={motivo}>
                  {ROTULO_MOTIVO_VENDA[motivo]}
                </option>
              ))}
            </select>
            {erroVisivel("motivoVenda") && <small className="campo-erro">{erroVisivel("motivoVenda")}</small>}
          </label>
          <input type="hidden" name="motivoVenda" value={motivoVenda} />

          <div
            className="cf-turnstile"
            data-sitekey={siteKeyTurnstile}
            data-callback="onTurnstileSuccess"
          />
          <input type="hidden" name="turnstileToken" id="turnstileToken" />
          <Script id="turnstile-callback" strategy="afterInteractive">
            {`function onTurnstileSuccess(token) { document.getElementById('turnstileToken').value = token; }`}
          </Script>

          <BotaoEnviarFormulario desabilitado={!formularioValido} />
        </form>
      )}
    </>
  );
}
