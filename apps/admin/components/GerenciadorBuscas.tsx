"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { BellRing, Loader2, Plus, Trash2, Zap, CalendarClock, ChevronDown, BellPlus, ListChecks, Inbox, Clock } from "lucide-react";
import { ImagemThumbnail } from "@/components/ImagemThumbnail";
import {
  criarBuscaSalva,
  alternarBuscaSalva,
  apagarBuscaSalva,
  type ResultadoBusca,
} from "@/lib/buscasSalvas";

export interface BuscaSalvaRow {
  id: string;
  nome: string | null;
  marca: string;
  modelo: string | null;
  preco_min: number | null;
  preco_max: number;
  estado: string | null;
  ano_min: number | null;
  ano_max: number | null;
  km_max: number | null;
  margem_min: number | null;
  frequencia: string;
  ativo: boolean;
  criado_em: string;
}

/** Um alerta que já foi ENVIADO ao usuário (card na aba "Alertas Recebidos"). */
export interface AlertaRecebidoRow {
  id: string;
  veiculo: string;
  ano: string | null;
  cidade: string | null;
  estado: string | null;
  preco: number;
  fipeValor: number | null;
  margem: number | null;
  foto: string | null;
  href: string;
  recebidoEm: string;
}

const ESTADO_INICIAL: ResultadoBusca = { erro: null, sucesso: false };

const FMT_MILHAR = new Intl.NumberFormat("pt-BR");
function mascararMilhar(digitos: string): string {
  const so = digitos.replace(/\D/g, "");
  return so ? FMT_MILHAR.format(Number(so)) : "";
}
function reais(n: number | null): string {
  return n != null ? `R$ ${FMT_MILHAR.format(n)}` : "";
}
/**
 * "Adiciona os zeros" pro usuário cru: num campo de PREÇO DE CARRO, um valor abaixo
 * de 1.000 nunca é literal (ninguém alerta por um carro de R$ 80) — então quem digita
 * "80" quis dizer 80 mil. No blur, multiplicamos por 1.000. Quem digita o valor cheio
 * ("80.000") já cai em >= 1.000 e não é tocado. Escopo: só preço (KM/margem ficam como estão).
 */
function assumirMilhares(valor: string): string {
  const n = Number(valor.replace(/\D/g, ""));
  return n > 0 && n < 1000 ? String(n * 1000) : valor;
}

function BotaoCriar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="buscas-criar-btn" disabled={pending}>
      {pending ? (
        <>
          <Loader2 size={17} strokeWidth={2} className="buscas-spinner" /> Salvando…
        </>
      ) : (
        <>
          <Plus size={17} strokeWidth={2.4} /> Criar alerta
        </>
      )}
    </button>
  );
}

export function GerenciadorBuscas({
  buscas,
  marcas,
  modelos,
  cidades,
  recebidos,
}: {
  buscas: BuscaSalvaRow[];
  marcas: string[];
  /** ★ Modelos da BASE — ver a nota do formulário. */
  modelos: string[];
  /** ★ Cidades da vitrine, não praças cadastradas: ver buscarListaCidades. */
  cidades: string[];
  recebidos: AlertaRecebidoRow[];
}) {
  const [estado, acao] = useFormState(criarBuscaSalva, ESTADO_INICIAL);
  const [moeda, setMoeda] = useState<"PYG" | "USD">("PYG");
  const [precoMax, setPrecoMax] = useState("");
  const [precoMin, setPrecoMin] = useState("");
  const [kmMax, setKmMax] = useState("");
  const [frequencia, setFrequencia] = useState("na_hora");
  const [formKey, setFormKey] = useState(0);
  // Accordions: os boxes nascem FECHADOS (visão limpa; o usuário abre o que quer).
  const [criarAberto, setCriarAberto] = useState(false);
  const [listaAberta, setListaAberta] = useState(false);
  const [recebidosAberto, setRecebidosAberto] = useState(false);

  // Só no SUCESSO limpamos tudo: zera os campos controlados e remonta o form (key++)
  // pra também limpar os não-controlados (marca, modelo, ano…). Em caso de erro de
  // validação, o que o usuário digitou fica. useFormState devolve um objeto novo a
  // cada submit, então este effect dispara em toda resposta da action.
  useEffect(() => {
    if (estado.sucesso) {
      setPrecoMax("");
      setPrecoMin("");
      setKmMax("");
      setFrequencia("na_hora");
      setFormKey((k) => k + 1);
    }
  }, [estado]);

  return (
    <div className="buscas">
      <header className="buscas-cabecalho">
        <span className="buscas-icone">
          <BellRing size={22} strokeWidth={1.9} />
        </span>
        <div>
          <h1 className="buscas-titulo">Alertas de Mercado</h1>
          <p className="buscas-sub">
            Diga o carro que você procura. Quando um anúncio novo bater com a busca, avisamos por e-mail —
            antes da concorrência.
          </p>
        </div>
      </header>

      {/* ── FORMULÁRIO (accordion) ── */}
      <section className="buscas-card">
        <button
          type="button"
          className="buscas-accordion"
          aria-expanded={criarAberto}
          onClick={() => setCriarAberto((v) => !v)}
        >
          <span className="buscas-accordion-titulo">
            <BellPlus size={17} strokeWidth={2.2} /> Criar Novo Alerta
          </span>
          <ChevronDown size={20} className={`buscas-accordion-seta ${criarAberto ? "aberto" : ""}`} />
        </button>
        {criarAberto && (
        <form key={formKey} action={acao} className="buscas-form buscas-accordion-corpo">
          {estado.erro && <p className="buscas-erro">{estado.erro}</p>}
          {estado.sucesso && <p className="buscas-ok">Alerta criado! Você será avisado quando entrar um carro assim.</p>}

          <div className="buscas-grid">
            {/* Marca — obrigatória */}
            <label className="buscas-campo">
              <span className="buscas-label">
                Marca <em className="buscas-obrig">*</em>
              </span>
              <input
                name="marca"
                list="lista-marcas"
                required
                placeholder="Ej.: Toyota"
                className="buscas-input"
                autoComplete="off"
              />
              <datalist id="lista-marcas">
                {marcas.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </label>

            {/* ★★ Modelo com SUGESTÃO da base. Antes era campo livre com
                "Ex.: Duster" — um modelo brasileiro que não existe aqui, e
                qualquer coisa digitada errada virava um alerta que nunca
                dispara. A lista vem dos modelos que o normalizador reconhece,
                então o que o usuário escolhe é o que a base tem. */}
            <label className="buscas-campo">
              <span className="buscas-label">Modelo</span>
              <input
                name="modelo"
                list="lista-modelos"
                placeholder="Ej.: Vitz (opcional)"
                className="buscas-input"
                autoComplete="off"
              />
              <datalist id="lista-modelos">
                {modelos.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </label>

            {/* ★★★ MOEDA — ver a migração 0100. Sem ela, "50.000.000" era
                comparado cru contra anúncios em dólar. */}
            <label className="buscas-campo">
              <span className="buscas-label">Moneda</span>
              <select
                name="moeda"
                className="buscas-input"
                value={moeda}
                onChange={(e) => setMoeda(e.target.value === "USD" ? "USD" : "PYG")}
              >
                <option value="PYG">Guaraníes (₲)</option>
                <option value="USD">Dólares (US$)</option>
              </select>
            </label>

            {/* Preço máx — obrigatório */}
            <label className="buscas-campo">
              <span className="buscas-label">
                Precio máximo <em className="buscas-obrig">*</em>
              </span>
              <div className="buscas-prefixo">
                <span>{moeda === "USD" ? "US$" : "₲"}</span>
                <input
                  inputMode="numeric"
                  required
                  value={mascararMilhar(precoMax)}
                  onChange={(e) => setPrecoMax(e.target.value)}
                  placeholder={moeda === "USD" ? "12.000" : "60.000.000"}
                  className="buscas-input"
                />
              </div>
              <input type="hidden" name="preco_max" value={precoMax.replace(/\D/g, "")} />
            </label>

            {/* Preço mín — opcional */}
            <label className="buscas-campo">
              <span className="buscas-label">Precio mínimo</span>
              <div className="buscas-prefixo">
                <span>{moeda === "USD" ? "US$" : "₲"}</span>
                <input
                  inputMode="numeric"
                  value={mascararMilhar(precoMin)}
                  onChange={(e) => setPrecoMin(e.target.value)}
                  placeholder="opcional"
                  className="buscas-input"
                />
              </div>
              <input type="hidden" name="preco_min" value={precoMin.replace(/\D/g, "")} />
            </label>

            {/* ★ CIDADE, não "estado". O select antigo listava UFs brasileiras
                e a ação recusava qualquer valor paraguaio. */}
            <label className="buscas-campo">
              <span className="buscas-label">Ciudad</span>
              <select name="cidade" className="buscas-input" defaultValue="">
                <option value="">Todo el Paraguay</option>
                {cidades.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            {/* Ano — opcional */}
            <label className="buscas-campo">
              <span className="buscas-label">Año (de / hasta)</span>
              <div className="buscas-dupla">
                <input name="ano_min" inputMode="numeric" maxLength={4} placeholder="2010" className="buscas-input" />
                <input name="ano_max" inputMode="numeric" maxLength={4} placeholder="2024" className="buscas-input" />
              </div>
            </label>

            {/* KM máx — opcional */}
            <label className="buscas-campo">
              <span className="buscas-label">Kilometraje máximo</span>
              <input
                inputMode="numeric"
                value={mascararMilhar(kmMax)}
                onChange={(e) => setKmMax(e.target.value)}
                placeholder="100.000 (opcional)"
                className="buscas-input"
              />
              <input type="hidden" name="km_max" value={kmMax.replace(/\D/g, "")} />
              {/* ⚠️ MEDIDO: só 32% dos anúncios trazem quilometragem — o
                  Facebook raramente preenche o campo. Um filtro de km descarta
                  os outros 68% em silêncio, e é melhor avisar antes que deixar
                  o usuário concluir que o alerta não funciona. */}
              <span className="buscas-dica">Solo 1 de cada 3 avisos informa el kilometraje; filtrar por él deja los demás afuera.</span>
            </label>

            {/* ★★★ MARGEM CONTRA A NOSSA TABELA — era "% abaixo da FIPE", que
                no Paraguai não existe e nunca casava nada. Ver matching.ts. */}
            <label className="buscas-campo">
              <span className="buscas-label">Debajo de la tabla</span>
              <div className="buscas-sufixo">
                <input name="margem_min" inputMode="decimal" placeholder="opcional" className="buscas-input" />
                <span>% abajo de la referencia</span>
              </div>
              <span className="buscas-dica">Nuestra tabla de precios del mercado paraguayo — no una tabla extranjera.</span>
            </label>
          </div>

          {/* Frequência */}
          <fieldset className="buscas-freq">
            <legend className="buscas-label">Como quer ser avisado?</legend>
            <div className="buscas-freq-opcoes">
              <label className={`buscas-freq-op ${frequencia === "na_hora" ? "buscas-freq-op-sel" : ""}`}>
                <input
                  type="radio"
                  name="frequencia"
                  value="na_hora"
                  checked={frequencia === "na_hora"}
                  onChange={() => setFrequencia("na_hora")}
                />
                <span className="buscas-freq-topo">
                  <Zap size={16} strokeWidth={2.2} /> Na hora
                </span>
                <span className="buscas-freq-desc">Ideal pra contactar o mais rápido e não perder o carro.</span>
              </label>

              <label className={`buscas-freq-op ${frequencia === "diario" ? "buscas-freq-op-sel" : ""}`}>
                <input
                  type="radio"
                  name="frequencia"
                  value="diario"
                  checked={frequencia === "diario"}
                  onChange={() => setFrequencia("diario")}
                />
                <span className="buscas-freq-topo">
                  <CalendarClock size={16} strokeWidth={2.2} /> Resumo diário
                </span>
                <span className="buscas-freq-desc">
                  Veículos comuns entram várias vezes por dia; junte tudo num e-mail só.
                </span>
              </label>
            </div>
          </fieldset>

          <BotaoCriar />
        </form>
        )}
      </section>

      {/* ── LISTA (accordion) ── */}
      <section className="buscas-card">
        <button
          type="button"
          className="buscas-accordion"
          aria-expanded={listaAberta}
          onClick={() => setListaAberta((v) => !v)}
        >
          <span className="buscas-accordion-titulo">
            <ListChecks size={17} strokeWidth={2.2} /> Alertas Criados
            {buscas.length > 0 && <span className="buscas-contador">{buscas.length}</span>}
          </span>
          <ChevronDown size={20} className={`buscas-accordion-seta ${listaAberta ? "aberto" : ""}`} />
        </button>
        {listaAberta &&
          (buscas.length === 0 ? (
            <p className="buscas-vazio buscas-accordion-corpo">Você ainda não tem alertas. Crie o primeiro acima. 👆</p>
          ) : (
            <ul className="buscas-lista">
              {buscas.map((b) => (
                <ItemBusca key={b.id} busca={b} reais={reais} />
              ))}
            </ul>
          ))}
      </section>

      {/* ── RECEBIDOS (accordion) ── */}
      <section className="buscas-card">
        <button
          type="button"
          className="buscas-accordion"
          aria-expanded={recebidosAberto}
          onClick={() => setRecebidosAberto((v) => !v)}
        >
          <span className="buscas-accordion-titulo">
            <Inbox size={17} strokeWidth={2.2} /> Alertas Recebidos
            {recebidos.length > 0 && <span className="buscas-contador">{recebidos.length}</span>}
          </span>
          <ChevronDown size={20} className={`buscas-accordion-seta ${recebidosAberto ? "aberto" : ""}`} />
        </button>
        {recebidosAberto &&
          (recebidos.length === 0 ? (
            <p className="buscas-vazio buscas-accordion-corpo">
              Nenhum aviso ainda. Quando um carro bater com um dos seus alertas, ele aparece aqui — e no seu e-mail.
            </p>
          ) : (
            <ul className="buscas-recebidos">
              {recebidos.map((r) => (
                <ItemRecebido key={`${r.id}-${r.recebidoEm}`} rec={r} reais={reais} />
              ))}
            </ul>
          ))}
      </section>
    </div>
  );
}

function ItemRecebido({ rec, reais }: { rec: AlertaRecebidoRow; reais: (n: number | null) => string }) {
  const local = [rec.cidade, rec.estado].filter(Boolean).join(" - ");
  return (
    <li className="buscas-rec">
      <Link href={rec.href} className="buscas-rec-link">
        {rec.foto ? (
          <ImagemThumbnail url={rec.foto} alt={rec.veiculo} className="buscas-rec-foto" />
        ) : (
          <span className="buscas-rec-foto buscas-rec-foto-vazia" />
        )}
        <span className="buscas-rec-info">
          <span className="buscas-rec-titulo">{rec.veiculo}</span>
          <span className="buscas-rec-sub">
            {rec.ano ? `${rec.ano}` : ""}
            {rec.ano && local ? " · " : ""}
            {local}
          </span>
          <span className="buscas-rec-precos">
            <strong>{reais(rec.preco)}</strong>
            {rec.fipeValor != null && <span className="buscas-rec-fipe">FIPE {reais(rec.fipeValor)}</span>}
            {rec.margem != null && (
              <span className="buscas-rec-margem">{rec.margem.toFixed(1)}% abaixo</span>
            )}
          </span>
          <span className="buscas-rec-quando">
            <Clock size={12} strokeWidth={2} /> recebido em {rec.recebidoEm}
          </span>
        </span>
      </Link>
    </li>
  );
}

function ItemBusca({ busca: b, reais }: { busca: BuscaSalvaRow; reais: (n: number | null) => string }) {
  const [pendente, iniciar] = useTransition();

  const chips: string[] = [];
  if (b.preco_min != null) chips.push(`de ${reais(b.preco_min)}`);
  chips.push(`até ${reais(b.preco_max)}`);
  chips.push(b.estado ?? "Brasil");
  if (b.ano_min != null || b.ano_max != null) chips.push(`${b.ano_min ?? "…"}–${b.ano_max ?? "…"}`);
  if (b.km_max != null) chips.push(`≤ ${new Intl.NumberFormat("pt-BR").format(b.km_max)} km`);
  if (b.margem_min != null) chips.push(`≥ ${b.margem_min}% FIPE`);

  return (
    <li className={`buscas-item ${b.ativo ? "" : "buscas-item-off"}`}>
      <div className="buscas-item-info">
        <div className="buscas-item-titulo">
          {b.marca}
          {b.modelo ? ` ${b.modelo}` : ""}
          <span className={`buscas-freq-tag ${b.frequencia === "na_hora" ? "buscas-freq-tag-hora" : ""}`}>
            {b.frequencia === "na_hora" ? "na hora" : "diário"}
          </span>
        </div>
        <div className="buscas-item-chips">
          {chips.map((c, i) => (
            <span key={i} className="buscas-chip">
              {c}
            </span>
          ))}
        </div>
      </div>
      <div className="buscas-item-acoes">
        <button
          type="button"
          className={`buscas-toggle ${b.ativo ? "buscas-toggle-on" : ""}`}
          disabled={pendente}
          aria-label={b.ativo ? "Pausar alerta" : "Ativar alerta"}
          onClick={() => iniciar(() => alternarBuscaSalva(b.id, !b.ativo))}
        >
          <span className="buscas-toggle-bolinha" />
        </button>
        <button
          type="button"
          className="buscas-apagar"
          disabled={pendente}
          aria-label="Apagar alerta"
          onClick={() => {
            if (confirm("Apagar esta busca salva?")) iniciar(() => apagarBuscaSalva(b.id));
          }}
        >
          <Trash2 size={16} strokeWidth={2} />
        </button>
      </div>
    </li>
  );
}
