"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2, Plus, Trash2, MapPin, Car, Copy } from "lucide-react";
import { salvarConfigWorker } from "@/app/actions";

/**
 * Aba "Motor de Busca" — configuração das FONTES de captação que dependem de URL
 * (hoje: Facebook Marketplace). Tudo aqui, ZERO hardcode: se o FB mudar os filtros,
 * troca no painel. Modelo: cada REGIÃO é uma URL-base "crua" (região+raio+locale) e
 * os LIMITES (preço/ano/ordem) são campos globais que compõem a URL final. Ver
 * project_repasse_livre_facebook_marketplace_motor_descoberta.
 */

interface Regiao {
  nome: string; // só a CIDADE (a UF vai no campo próprio)
  url: string;
  raio: string; // km — o FB prioriza o centro; raio menor + vários centros cobre melhor
  uf: string; // estado — organiza o painel em abas e entra no slug (cidade-uf)
}

const RAIOS = ["80", "100", "250", "500"];
const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

/** MESMA lógica do worker (facebookMain.slug). */
function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** FACEBOOK_REGIAO = slug da cidade + UF → único entre estados (Santa Maria RS ≠ Santa Maria SC). */
function slugRegiao(r: Regiao): string {
  return [slugify(r.nome), r.uf ? r.uf.toLowerCase() : ""].filter(Boolean).join("-");
}

function lerRegioes(bruto: string | undefined): Regiao[] {
  try {
    const v = JSON.parse(bruto ?? "[]");
    if (!Array.isArray(v)) return [];
    return v
      .filter((r) => typeof r?.url === "string")
      .map((r) => {
        let nome = String(r.nome ?? "");
        let uf = String(r.uf ?? "");
        // Migra formato antigo: UF no fim do nome ("Porto Alegre RS") → campo próprio.
        const m = nome.match(/\s+([A-Za-z]{2})$/);
        if (!uf && m && UFS.includes(m[1].toUpperCase())) {
          uf = m[1].toUpperCase();
          nome = nome.slice(0, m.index).trim();
        }
        return { nome, url: r.url, raio: String(r.raio ?? r.url.match(/radius=(\d+)/i)?.[1] ?? "250"), uf };
      });
  } catch {
    return [];
  }
}

function Interruptor({ ligado, onToggle }: { ligado: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      onClick={onToggle}
      style={{ width: 46, height: 26, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: ligado ? "#16a34a" : "#cbd5e1", position: "relative", flexShrink: 0 }}
    >
      <span style={{ position: "absolute", top: 3, left: ligado ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.15s ease", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

const rotuloCampo = { display: "block", fontSize: 12.5, fontWeight: 600, color: "#6b7280", marginBottom: 5 } as const;
const inputEstilo = { width: "100%", padding: "9px 12px", fontSize: 13.5, border: "1px solid #d1d5db", borderRadius: 9, outline: "none" } as const;

export function PainelMotorBusca({ configs }: { configs: Record<string, string> }) {
  const [ativo, setAtivo] = useState(configs["FACEBOOK_ATIVO"] === "true");
  const [minPreco, setMinPreco] = useState(configs["FACEBOOK_FILTRO_MIN_PRECO"] ?? "15000");
  const [maxPreco, setMaxPreco] = useState(configs["FACEBOOK_FILTRO_MAX_PRECO"] ?? "400000");
  const [minAno, setMinAno] = useState(configs["FACEBOOK_FILTRO_MIN_ANO"] ?? "1995");
  const [sort, setSort] = useState(configs["FACEBOOK_FILTRO_SORT"] ?? "creation_time_descend");
  const [regioes, setRegioes] = useState<Regiao[]>(() => lerRegioes(configs["FACEBOOK_REGIOES"]));
  const [salvando, iniciar] = useTransition();
  const [salvo, setSalvo] = useState(false);
  const marcarSujo = () => setSalvo(false);

  // Abas por ESTADO (evita a tripa longa). Aba "" = regiões ainda sem UF (mostradas como "?").
  const ufsPresentes = useMemo(() => [...new Set(regioes.map((r) => r.uf || ""))], [regioes]);
  const [ufAtiva, setUfAtiva] = useState<string>(() => regioes.find((r) => r.uf)?.uf ?? "RS");
  const abas = useMemo(
    () => [...new Set([...ufsPresentes, ufAtiva])].sort((a, b) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b))),
    [ufsPresentes, ufAtiva]
  );

  function salvarTudo() {
    const limpas = regioes.filter((r) => r.nome.trim() && r.url.trim());
    iniciar(async () => {
      await Promise.all([
        salvarConfigWorker("FACEBOOK_ATIVO", ativo ? "true" : "false"),
        salvarConfigWorker("FACEBOOK_FILTRO_MIN_PRECO", minPreco.trim()),
        salvarConfigWorker("FACEBOOK_FILTRO_MAX_PRECO", maxPreco.trim()),
        salvarConfigWorker("FACEBOOK_FILTRO_MIN_ANO", minAno.trim()),
        salvarConfigWorker("FACEBOOK_FILTRO_SORT", sort),
        salvarConfigWorker("FACEBOOK_REGIOES", JSON.stringify(limpas)),
      ]);
      setRegioes(limpas);
      setSalvo(true);
    });
  }

  // Prévia da URL final composta (base + raio da região + filtros globais). MESMA lógica do
  // worker (montarUrlBuscaFacebook): sobrescreve qualquer radius= colado na URL.
  function urlComposta(base: string, raio: string): string {
    const b = base.trim().replace(/([?&])radius=\d+/i, "$1").replace(/&{2,}/g, "&").replace(/[?&]$/, "");
    if (!b) return "";
    const sep = b.includes("?") ? "&" : "?";
    const p = new URLSearchParams({ radius: raio, minPrice: minPreco, maxPrice: maxPreco, minYear: minAno, sortBy: sort, topLevelVehicleType: "car_truck" });
    return `${b}${sep}${p.toString()}`;
  }
  const previa = useMemo(
    () => (regioes[0]?.url ? urlComposta(regioes[0].url, regioes[0].raio) : ""),
    [regioes, minPreco, maxPreco, minAno, sort]
  );

  return (
    <div style={{ padding: "0 0 8px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Car size={20} strokeWidth={1.9} />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Facebook Marketplace</h2>
        </div>
        <Interruptor ligado={ativo} onToggle={() => { setAtivo((v) => !v); marcarSujo(); }} />
      </header>
      <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14, lineHeight: 1.5 }}>
        Captação por <strong>região</strong>. Cole a URL-base “crua” de cada região (com raio e locale) e defina os
        <strong> limites</strong> abaixo — eles compõem a URL final. Se o FB mudar os filtros, é só ajustar aqui.
      </p>

      {/* Limites globais (compõem a URL de todas as regiões) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 8 }}>
        <div>
          <label style={rotuloCampo}>Preço mínimo (R$)</label>
          <input style={inputEstilo} inputMode="numeric" value={minPreco} onChange={(e) => { setMinPreco(e.target.value); marcarSujo(); }} placeholder="15000" />
        </div>
        <div>
          <label style={rotuloCampo}>Preço máximo (R$)</label>
          <input style={inputEstilo} inputMode="numeric" value={maxPreco} onChange={(e) => { setMaxPreco(e.target.value); marcarSujo(); }} placeholder="400000" />
        </div>
        <div>
          <label style={rotuloCampo}>Ano mínimo</label>
          <input style={inputEstilo} inputMode="numeric" value={minAno} onChange={(e) => { setMinAno(e.target.value); marcarSujo(); }} placeholder="1995" />
        </div>
        <div>
          <label style={rotuloCampo}>Ordenação</label>
          <select style={inputEstilo} value={sort} onChange={(e) => { setSort(e.target.value); marcarSujo(); }}>
            <option value="creation_time_descend">Mais recentes</option>
            <option value="best_match">Melhor correspondência</option>
            <option value="price_ascend">Menor preço</option>
            <option value="distance_ascend">Mais próximos</option>
          </select>
        </div>
      </div>
      <p style={{ margin: "2px 0 18px", fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>
        Preço mín. tira motinhos/carrinhos velhos <em>e</em> as iscas de loja (o “preço” delas é a entrada baixa).
        Ano mín. 1995 corta ônibus/motorhome antigos. “Mais recentes” prioriza anúncios frescos.
      </p>

      {/* Regiões — em ABAS por estado (UF) pra não virar tripa longa com muitas regiões. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
          <MapPin size={16} strokeWidth={2} /> Regiões ({regioes.length})
        </h3>
        <button
          type="button"
          onClick={() => { setRegioes((r) => [...r, { nome: "", url: "", raio: "250", uf: ufAtiva }]); marcarSujo(); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 13, fontWeight: 600, color: "#059669", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, cursor: "pointer" }}
        >
          <Plus size={14} /> Adicionar {ufAtiva ? `em ${ufAtiva}` : "região"}
        </button>
      </div>

      {/* Abas por estado + adicionar novo estado */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 12, borderBottom: "1px solid #e5e7eb", paddingBottom: 8 }}>
        {abas.map((uf) => {
          const n = regioes.filter((r) => r.uf === uf).length;
          const ativa = uf === ufAtiva;
          return (
            <button
              key={uf}
              type="button"
              onClick={() => setUfAtiva(uf)}
              title={uf === "" ? "Regiões ainda sem estado definido" : undefined}
              style={{ padding: "5px 12px", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", border: `1px solid ${ativa ? "#059669" : uf === "" ? "#fca5a5" : "#e5e7eb"}`, background: ativa ? "#ecfdf5" : "#fff", color: ativa ? "#059669" : uf === "" ? "#dc2626" : "#6b7280" }}
            >
              {uf || "? sem UF"}{n > 0 && <span style={{ fontWeight: 500, opacity: 0.7 }}> ({n})</span>}
            </button>
          );
        })}
        <select
          value=""
          aria-label="Adicionar estado"
          onChange={(e) => { if (e.target.value) setUfAtiva(e.target.value); }}
          style={{ padding: "5px 8px", fontSize: 12.5, border: "1px dashed #cbd5e1", borderRadius: 8, color: "#6b7280", cursor: "pointer", background: "#fff" }}
        >
          <option value="">+ estado</option>
          {UFS.filter((u) => !abas.includes(u)).map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>
        O FB prioriza o <strong>centro</strong> do raio e abre por escassez. Prefira <strong>raio menor + vários
        centros</strong> por estado (ex.: no RS: Porto Alegre + Passo Fundo + Santa Maria, cada um 250km).
      </p>

      {regioes.filter((r) => r.uf === ufAtiva).length === 0 && (
        <p style={{ margin: "4px 0 12px", fontSize: 13, color: "#9ca3af" }}>Nenhuma região em {ufAtiva || "“sem UF”"}. Use “Adicionar” e cole a URL-base do Marketplace.</p>
      )}

      {regioes.map((r, i) =>
        r.uf === ufAtiva ? (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                style={{ ...inputEstilo, flex: "0 0 128px" }}
                value={r.nome}
                placeholder="Passo Fundo"
                onChange={(e) => { const n = [...regioes]; n[i] = { ...n[i], nome: e.target.value }; setRegioes(n); marcarSujo(); }}
              />
              <input
                style={{ ...inputEstilo, flex: 1, minWidth: 150, fontFamily: "ui-monospace, monospace", fontSize: 12.5 }}
                value={r.url}
                placeholder="https://web.facebook.com/marketplace/<cidade-ou-id>/vehicles/?exact=false&locale=pt_BR"
                onChange={(e) => { const n = [...regioes]; n[i] = { ...n[i], url: e.target.value }; setRegioes(n); marcarSujo(); }}
              />
              <select
                style={{ ...inputEstilo, flex: "0 0 62px" }}
                value={r.uf}
                aria-label="Estado (UF)"
                onChange={(e) => { const n = [...regioes]; n[i] = { ...n[i], uf: e.target.value }; setRegioes(n); marcarSujo(); }}
              >
                {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <select
                style={{ ...inputEstilo, flex: "0 0 84px" }}
                value={r.raio}
                aria-label="Raio (km)"
                onChange={(e) => { const n = [...regioes]; n[i] = { ...n[i], raio: e.target.value }; setRegioes(n); marcarSujo(); }}
              >
                {RAIOS.map((km) => <option key={km} value={km}>{km} km</option>)}
              </select>
              <button
                type="button"
                aria-label="Remover"
                onClick={() => { setRegioes((rs) => rs.filter((_, j) => j !== i)); marcarSujo(); }}
                style={{ padding: 9, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, cursor: "pointer", color: "#dc2626", flexShrink: 0 }}
              >
                <Trash2 size={16} />
              </button>
            </div>
            {r.nome.trim() && (
              <div style={{ marginTop: 4, marginLeft: 2, display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#9ca3af" }}>
                <span>
                  Tarefa local → <code style={{ color: "#6b7280", background: "#f1f5f9", padding: "1px 6px", borderRadius: 5, fontFamily: "ui-monospace, monospace" }}>run-fb.cmd {slugRegiao(r)}</code>
                </span>
                <button
                  type="button"
                  aria-label="Copiar slug"
                  onClick={() => navigator.clipboard?.writeText(slugRegiao(r))}
                  style={{ display: "inline-flex", alignItems: "center", padding: 3, background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af" }}
                >
                  <Copy size={13} />
                </button>
              </div>
            )}
          </div>
        ) : null
      )}

      {previa && (
        <div style={{ marginTop: 12, padding: "10px 12px", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 9 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.3 }}>Prévia da 1ª região (URL final varrida)</span>
          <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "#475569", fontFamily: "ui-monospace, monospace", wordBreak: "break-all", lineHeight: 1.5 }}>{previa}</p>
        </div>
      )}

      <button
        type="button"
        onClick={salvarTudo}
        disabled={salvando}
        style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", fontSize: 14, fontWeight: 700, color: "#fff", background: salvando ? "#6b7280" : "#059669", border: "none", borderRadius: 10, cursor: salvando ? "default" : "pointer" }}
      >
        {salvando ? <Loader2 size={16} className="animate-spin" /> : salvo ? <Check size={16} /> : null}
        {salvando ? "Salvando…" : salvo ? "Salvo" : "Salvar configurações"}
      </button>
    </div>
  );
}
