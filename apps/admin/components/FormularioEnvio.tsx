"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import Script from "next/script";
import { enviarOportunidade, type ResultadoEnvio } from "@/app/enviar/actions";
import { calcularMargemPercentual, ehElegivel, classificar } from "@/lib/margin";
import { ROTULO_CLASSIFICACAO } from "@/lib/classificacao";
import { PERFIS_REMETENTE, ROTULO_PERFIL_REMETENTE } from "@/lib/perfilRemetente";
import { UFS, apenasDigitos, formatarMoeda, formatarWhatsapp } from "@/lib/mascaras";
import type { FipeOpcao } from "@/lib/fipe";

const ESTADO_INICIAL: ResultadoEnvio = { erro: null, sucesso: false };
const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;

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

export function FormularioEnvio({ siteKeyTurnstile }: { siteKeyTurnstile: string }) {
  const [estado, acao] = useFormState(enviarOportunidade, ESTADO_INICIAL);

  const [marcas, setMarcas] = useState<FipeOpcao[]>([]);
  const [modelos, setModelos] = useState<FipeOpcao[]>([]);
  const [anos, setAnos] = useState<FipeOpcao[]>([]);

  const [veiculo, setVeiculo] = useState("");
  const [marcaCode, setMarcaCode] = useState("");
  const [modeloCode, setModeloCode] = useState("");
  const [anoCode, setAnoCode] = useState("");
  const [anoNome, setAnoNome] = useState("");
  const [valorFipe, setValorFipe] = useState<number | null>(null);
  const [erroFipe, setErroFipe] = useState<string | null>(null);
  const [carregandoFipe, setCarregandoFipe] = useState(false);
  const [precoDigitos, setPrecoDigitos] = useState("");
  const [cidade, setCidade] = useState("");
  const [estadoUf, setEstadoUf] = useState("");
  const [cambio, setCambio] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [whatsappDigitos, setWhatsappDigitos] = useState("");
  const [perfilRemetente, setPerfilRemetente] = useState("");

  const [tocado, setTocado] = useState<CampoTocado>({});

  useEffect(() => {
    buscarFipe("recurso=marcas").then(setMarcas);
  }, []);

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
    veiculo: veiculo.trim().length >= 3 ? null : "Informe o veículo (mínimo 3 caracteres).",
    marcaCode: marcaCode ? null : "Selecione a marca.",
    modeloCode: modeloCode ? null : "Selecione o modelo.",
    anoCode: anoCode ? null : "Selecione o ano.",
    preco: preco > 0 ? null : "Informe um preço válido.",
    estadoUf: estadoUf ? null : "Selecione o estado.",
    foto: !foto
      ? "Envie uma foto do veículo."
      : foto.size > TAMANHO_MAXIMO_FOTO
        ? "A foto deve ter no máximo 5MB."
        : null,
    whatsapp: /^\d{10,11}$/.test(whatsappDigitos) ? null : "Informe um WhatsApp válido com DDD.",
    perfilRemetente: perfilRemetente ? null : "Selecione seu perfil.",
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
              veiculo: true,
              marcaCode: true,
              modeloCode: true,
              anoCode: true,
              preco: true,
              estadoUf: true,
              foto: true,
              whatsapp: true,
              perfilRemetente: true,
            })
          }
        >
          {estado.erro && <p className="formulario-erro">{estado.erro}</p>}

          <label className="campo">
            <span>Veículo</span>
            <input
              name="veiculo"
              value={veiculo}
              onChange={(e) => setVeiculo(e.target.value)}
              onBlur={() => marcarTocado("veiculo")}
              placeholder="Ex: Civic EXL 2020"
            />
            {erroVisivel("veiculo") && <small className="campo-erro">{erroVisivel("veiculo")}</small>}
          </label>

          <label className="campo">
            <span>Marca</span>
            <select
              value={marcaCode}
              onChange={(e) => setMarcaCode(e.target.value)}
              onBlur={() => marcarTocado("marcaCode")}
            >
              <option value="">Selecione</option>
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
            <span>Modelo</span>
            <select
              value={modeloCode}
              onChange={(e) => setModeloCode(e.target.value)}
              onBlur={() => marcarTocado("modeloCode")}
              disabled={!marcaCode}
            >
              <option value="">Selecione</option>
              {modelos.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name}
                </option>
              ))}
            </select>
            {erroVisivel("modeloCode") && <small className="campo-erro">{erroVisivel("modeloCode")}</small>}
          </label>
          <input type="hidden" name="modeloCode" value={modeloCode} />

          <label className="campo">
            <span>Ano</span>
            <select
              value={anoCode}
              onChange={(e) => {
                setAnoCode(e.target.value);
                setAnoNome(e.target.options[e.target.selectedIndex]?.text ?? "");
              }}
              onBlur={() => marcarTocado("anoCode")}
              disabled={!modeloCode}
            >
              <option value="">Selecione</option>
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

          {erroFipe && <p className="campo-erro">{erroFipe}</p>}

          {valorFipe !== null && (
            <p className="formulario-fipe">
              Valor na tabela FIPE: {valorFipe.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          )}

          <label className="campo">
            <span>Preço de venda (R$)</span>
            <input
              inputMode="numeric"
              value={formatarMoeda(precoDigitos)}
              onChange={(e) => setPrecoDigitos(apenasDigitos(e.target.value))}
              onBlur={() => marcarTocado("preco")}
              placeholder="Ex: 65.000"
            />
            {erroVisivel("preco") && <small className="campo-erro">{erroVisivel("preco")}</small>}
          </label>
          <input type="hidden" name="preco" value={precoDigitos} />

          {margem !== null && (
            <p className={`formulario-margem ${margemInsuficiente ? "formulario-margem-baixa" : "formulario-margem-ok"}`}>
              {margemInsuficiente
                ? `⚠️ Margem de ${margem.toFixed(1)}% — abaixo do mínimo de 5%. Preço máximo aceito: ${precoMaximoElegivel?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`
                : `✅ Margem de ${margem.toFixed(1)}% — classificação: ${classificacaoPreview ? ROTULO_CLASSIFICACAO[classificacaoPreview] : ""}.`}
            </p>
          )}

          <label className="campo">
            <span>Cidade</span>
            <input name="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex: Porto Alegre" />
          </label>

          <label className="campo">
            <span>Estado (UF)</span>
            <select value={estadoUf} onChange={(e) => setEstadoUf(e.target.value)} onBlur={() => marcarTocado("estadoUf")}>
              <option value="">Selecione</option>
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
            <span>Câmbio</span>
            <select value={cambio} onChange={(e) => setCambio(e.target.value)}>
              <option value="">Selecione (opcional)</option>
              <option value="Manual">Manual</option>
              <option value="Automático">Automático</option>
              <option value="CVT">CVT</option>
            </select>
          </label>
          <input type="hidden" name="cambio" value={cambio} />

          <label className="campo">
            <span>Foto do veículo</span>
            <input
              name="foto"
              type="file"
              accept="image/*"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              onBlur={() => marcarTocado("foto")}
            />
            {erroVisivel("foto") && <small className="campo-erro">{erroVisivel("foto")}</small>}
          </label>

          <label className="campo">
            <span>Seu WhatsApp (com DDD)</span>
            <input
              inputMode="numeric"
              value={formatarWhatsapp(whatsappDigitos)}
              onChange={(e) => setWhatsappDigitos(apenasDigitos(e.target.value))}
              onBlur={() => marcarTocado("whatsapp")}
              placeholder="(51) 99999-9999"
            />
            {erroVisivel("whatsapp") && <small className="campo-erro">{erroVisivel("whatsapp")}</small>}
          </label>
          <input type="hidden" name="whatsapp" value={whatsappDigitos} />

          <label className="campo">
            <span>Seu perfil</span>
            <select
              value={perfilRemetente}
              onChange={(e) => setPerfilRemetente(e.target.value)}
              onBlur={() => marcarTocado("perfilRemetente")}
            >
              <option value="">Selecione</option>
              {PERFIS_REMETENTE.map((perfil) => (
                <option key={perfil} value={perfil}>
                  {ROTULO_PERFIL_REMETENTE[perfil]}
                </option>
              ))}
            </select>
            {erroVisivel("perfilRemetente") && <small className="campo-erro">{erroVisivel("perfilRemetente")}</small>}
          </label>
          <input type="hidden" name="perfilRemetente" value={perfilRemetente} />

          <div
            className="cf-turnstile"
            data-sitekey={siteKeyTurnstile}
            data-callback="onTurnstileSuccess"
          />
          <input type="hidden" name="turnstileToken" id="turnstileToken" />
          <Script id="turnstile-callback" strategy="afterInteractive">
            {`function onTurnstileSuccess(token) { document.getElementById('turnstileToken').value = token; }`}
          </Script>

          <button type="submit" className="formulario-enviar" disabled={!formularioValido}>
            Enviar oportunidade
          </button>
        </form>
      )}
    </>
  );
}
