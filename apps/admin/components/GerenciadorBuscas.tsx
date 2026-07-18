"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { BellRing, Loader2, Plus, Trash2, Zap, CalendarClock, ChevronDown, BellPlus, ListChecks, Inbox, Clock } from "lucide-react";
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
  estados,
  recebidos,
}: {
  buscas: BuscaSalvaRow[];
  marcas: string[];
  estados: string[];
  recebidos: AlertaRecebidoRow[];
}) {
  const [estado, acao] = useFormState(criarBuscaSalva, ESTADO_INICIAL);
  const [precoMax, setPrecoMax] = useState("");
  const [precoMin, setPrecoMin] = useState("");
  const [kmMax, setKmMax] = useState("");
  const [frequencia, setFrequencia] = useState("na_hora");
  const [formKey, setFormKey] = useState(0);
  // Accordions: os boxes recolhem pra organizar a visão (produto premium).
  const [criarAberto, setCriarAberto] = useState(true);
  const [listaAberta, setListaAberta] = useState(true);
  const [recebidosAberto, setRecebidosAberto] = useState(true);

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
          <h1 className="buscas-titulo">Buscas salvas</h1>
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
            {/* Marca — obrigatório */}
            <label className="buscas-campo">
              <span className="buscas-label">
                Marca <em className="buscas-obrig">*</em>
              </span>
              <input
                name="marca"
                list="lista-marcas"
                required
                placeholder="Ex.: Renault"
                className="buscas-input"
                autoComplete="off"
              />
              <datalist id="lista-marcas">
                {marcas.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </label>

            {/* Modelo — opcional */}
            <label className="buscas-campo">
              <span className="buscas-label">Modelo</span>
              <input name="modelo" placeholder="Ex.: Duster (opcional)" className="buscas-input" autoComplete="off" />
            </label>

            {/* Preço máx — obrigatório */}
            <label className="buscas-campo">
              <span className="buscas-label">
                Preço máximo <em className="buscas-obrig">*</em>
              </span>
              <div className="buscas-prefixo">
                <span>R$</span>
                <input
                  inputMode="numeric"
                  required
                  value={mascararMilhar(precoMax)}
                  onChange={(e) => setPrecoMax(e.target.value)}
                  onBlur={() => setPrecoMax(assumirMilhares(precoMax))}
                  placeholder="80.000"
                  className="buscas-input"
                />
              </div>
              <input type="hidden" name="preco_max" value={precoMax.replace(/\D/g, "")} />
            </label>

            {/* Preço mín — opcional */}
            <label className="buscas-campo">
              <span className="buscas-label">Preço mínimo</span>
              <div className="buscas-prefixo">
                <span>R$</span>
                <input
                  inputMode="numeric"
                  value={mascararMilhar(precoMin)}
                  onChange={(e) => setPrecoMin(e.target.value)}
                  onBlur={() => setPrecoMin(assumirMilhares(precoMin))}
                  placeholder="opcional"
                  className="buscas-input"
                />
              </div>
              <input type="hidden" name="preco_min" value={precoMin.replace(/\D/g, "")} />
            </label>

            {/* Estado — opcional (vazio = Brasil) */}
            <label className="buscas-campo">
              <span className="buscas-label">Estado</span>
              <select name="estado" className="buscas-input" defaultValue="">
                <option value="">Brasil inteiro</option>
                {estados.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </label>

            {/* Ano — opcional */}
            <label className="buscas-campo">
              <span className="buscas-label">Ano (de / até)</span>
              <div className="buscas-dupla">
                <input name="ano_min" inputMode="numeric" maxLength={4} placeholder="2015" className="buscas-input" />
                <input name="ano_max" inputMode="numeric" maxLength={4} placeholder="2024" className="buscas-input" />
              </div>
            </label>

            {/* KM máx — opcional */}
            <label className="buscas-campo">
              <span className="buscas-label">KM máximo</span>
              <input
                inputMode="numeric"
                value={mascararMilhar(kmMax)}
                onChange={(e) => setKmMax(e.target.value)}
                placeholder="100.000 (opcional)"
                className="buscas-input"
              />
              <input type="hidden" name="km_max" value={kmMax.replace(/\D/g, "")} />
            </label>

            {/* Margem mín — opcional */}
            <label className="buscas-campo">
              <span className="buscas-label">Margem mínima</span>
              <div className="buscas-sufixo">
                <input name="margem_min" inputMode="decimal" placeholder="opcional" className="buscas-input" />
                <span>% abaixo da FIPE</span>
              </div>
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
            <ul className="buscas-lista buscas-accordion-corpo">
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
            <ul className="buscas-recebidos buscas-accordion-corpo">
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
          // eslint-disable-next-line @next/next/no-img-element
          <img src={rec.foto} alt="" className="buscas-rec-foto" loading="lazy" />
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
