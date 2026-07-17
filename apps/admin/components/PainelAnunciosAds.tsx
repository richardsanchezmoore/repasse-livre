"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2, Plus, Trash2, Megaphone, Gem, ExternalLink, AlertTriangle } from "lucide-react";
import { salvarConfigWorker } from "@/app/actions";

/**
 * Bloco "Anúncios direcionados para ADS" — os anúncios com a área premium LIBERADA.
 *
 * A tese do user (17/07): o criativo da campanha é o CARRO, nunca a plataforma. A pessoa
 * não clica pra conhecer um SaaS — clica porque quer ver um bom negócio. Ao entrar, ela
 * encontra a análise completa (Referência de Preço, Copiloto, Comparativos, BIA) e SÓ
 * ENTÃO descobre a plataforma por trás. É aí que a assinatura deixa de ser impulso e
 * vira decisão lógica. Por isso todo anúncio cadastrado aqui abre o produto inteiro pro
 * visitante frio — sem isso a campanha vende uma promessa, não um produto.
 *
 * DOIS papéis, de propósito:
 *  · ÂNCORA (1 só, chave DEMO_OPPORTUNITY_ID): alimenta o modal "Experimente agora" da
 *    /planos e da /planos-slim. É o ADS-chave que conecta às páginas de venda.
 *  · CAMPANHAS (N, chave ADS_OPORTUNIDADES): os destinos dos criativos. É sobre estes
 *    que os gatilhos de overlay vão agir (a implementar).
 * Os dois ficam liberados; ver configWorker.buscarIdsLiberados (fail-closed).
 */

interface AnuncioAds {
  url: string;
  rotulo: string;
}

const RX_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
/** MESMA lógica do servidor (configWorker.extrairIdOportunidade): URL inteira ou ID cru. */
function extrairId(bruto: string): string | null {
  const m = (bruto ?? "").trim().match(RX_UUID);
  return m ? m[0] : null;
}

function lerAnuncios(bruto: string | undefined): AnuncioAds[] {
  try {
    const v: unknown = JSON.parse((bruto ?? "[]").trim() || "[]");
    if (!Array.isArray(v)) return [];
    return (v as AnuncioAds[]).map((a) => ({ url: String(a?.url ?? ""), rotulo: String(a?.rotulo ?? "") }));
  } catch {
    return [];
  }
}

const inputEstilo: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "9px 11px",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

export function PainelAnunciosAds({ configs }: { configs: Record<string, string> }) {
  const [ancora, setAncora] = useState(configs["DEMO_OPPORTUNITY_ID"] ?? "");
  const [anuncios, setAnuncios] = useState<AnuncioAds[]>(() => lerAnuncios(configs["ADS_OPORTUNIDADES"]));
  const [salvando, iniciar] = useTransition();
  const [salvo, setSalvo] = useState(false);
  const marcarSujo = () => setSalvo(false);

  const idAncora = useMemo(() => extrairId(ancora), [ancora]);

  // Um mesmo anúncio na âncora E numa campanha não quebra nada (o Set dedupa no
  // servidor), mas é engano de cadastro: avisa em vez de deixar passar calado.
  const duplicados = useMemo(() => {
    const vistos = new Map<string, number>();
    for (const a of anuncios) {
      const id = extrairId(a.url);
      if (id) vistos.set(id, (vistos.get(id) ?? 0) + 1);
    }
    const dup = new Set<string>();
    for (const [id, n] of vistos) if (n > 1 || id === idAncora) dup.add(id);
    return dup;
  }, [anuncios, idAncora]);

  const validos = anuncios.filter((a) => extrairId(a.url)).length;
  const invalidos = anuncios.filter((a) => a.url.trim() && !extrairId(a.url)).length;

  function salvarTudo() {
    // Só entra o que tem ID extraível — URL sem UUID não libera nada e viraria lixo.
    const limpos = anuncios.filter((a) => extrairId(a.url)).map((a) => ({ url: a.url.trim(), rotulo: a.rotulo.trim() }));
    iniciar(async () => {
      await Promise.all([
        salvarConfigWorker("DEMO_OPPORTUNITY_ID", ancora.trim()),
        salvarConfigWorker("ADS_OPORTUNIDADES", JSON.stringify(limpos)),
      ]);
      setAnuncios(limpos);
      setSalvo(true);
    });
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── ÂNCORA ─────────────────────────────────────── */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Gem size={16} strokeWidth={2} color="#059669" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Anúncio-âncora (o ADS-chave)</h3>
        </div>
        <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: 14, lineHeight: 1.55 }}>
          O anúncio que aparece no modal <strong>“Experimente agora”</strong> da <code>/planos</code> e da{" "}
          <code>/planos-slim</code> — é a ponte entre a campanha e as páginas de venda. Cole a{" "}
          <strong>URL</strong> do anúncio (ou o ID cru); extraímos o ID sozinhos. Escolha uma oferta boa e com
          foto. Em branco → a /planos cai no card de exemplo estático.
          <br />
          <span style={{ color: "#9ca3af" }}>
            Não confunda com o <strong>Preço</strong>-âncora acima (o valor riscado) — aqui é o <strong>anúncio</strong>.
          </span>
        </p>
        <input
          style={inputEstilo}
          value={ancora}
          placeholder="https://repasselivre.com/carros/sao-paulo-sp/… (ou o ID)"
          onChange={(e) => {
            setAncora(e.target.value);
            marcarSujo();
          }}
        />
        <div style={{ marginTop: 7, fontSize: 12, fontFamily: "ui-monospace, monospace", color: idAncora ? "#059669" : ancora.trim() ? "#b45309" : "#9ca3af" }}>
          {idAncora ? `ID reconhecido → ${idAncora}` : ancora.trim() ? "⚠ não achei um ID nessa URL — a /planos vai cair no card estático" : "vazio → card de exemplo estático"}
        </div>
      </div>

      {/* ── CAMPANHAS ──────────────────────────────────── */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Megaphone size={16} strokeWidth={2} color="#059669" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Anúncios de campanha (ADS)</h3>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280", fontFamily: "ui-monospace, monospace" }}>
            {validos} liberado{validos === 1 ? "" : "s"}
          </span>
        </div>
        <p style={{ margin: "0 0 14px", color: "#6b7280", fontSize: 14, lineHeight: 1.55 }}>
          Os destinos dos criativos. <strong>Toda URL aqui tem a área premium liberada</strong> — Copiloto
          completo e acesso ao anúncio, pra qualquer visitante. É o que faz a campanha entregar o produto, e
          não só a promessa: o criativo vende o carro, e quem clica precisa ver a análise inteira.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {anuncios.map((a, i) => {
            const id = extrairId(a.url);
            const dup = id ? duplicados.has(id) : false;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    style={{ ...inputEstilo, flex: "0 0 190px" }}
                    value={a.rotulo}
                    placeholder="rótulo (ex.: Corolla XEi 18%)"
                    onChange={(e) => {
                      const n = [...anuncios];
                      n[i] = { ...n[i], rotulo: e.target.value };
                      setAnuncios(n);
                      marcarSujo();
                    }}
                  />
                  <input
                    style={{
                      ...inputEstilo,
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 12.5,
                      ...(a.url.trim() && !id ? { borderColor: "#dc2626", background: "#fef2f2" } : null),
                    }}
                    value={a.url}
                    placeholder="cole a URL do anúncio (ou o ID)"
                    onChange={(e) => {
                      const n = [...anuncios];
                      n[i] = { ...n[i], url: e.target.value };
                      setAnuncios(n);
                      marcarSujo();
                    }}
                  />
                  {id && (
                    <a
                      href={`/oportunidade/${id}`}
                      target="_blank"
                      rel="noreferrer"
                      title="abrir o anúncio numa aba"
                      style={{ flex: "0 0 auto", padding: 9, borderRadius: 8, border: "1px solid #d1d5db", color: "#6b7280", display: "flex" }}
                    >
                      <ExternalLink size={15} strokeWidth={2} />
                    </a>
                  )}
                  <button
                    type="button"
                    title="remover"
                    onClick={() => {
                      setAnuncios(anuncios.filter((_, j) => j !== i));
                      marcarSujo();
                    }}
                    style={{ flex: "0 0 auto", padding: 9, borderRadius: 8, border: "1px solid #fecaca", background: "#fff1f2", color: "#dc2626", cursor: "pointer", display: "flex" }}
                  >
                    <Trash2 size={15} strokeWidth={2} />
                  </button>
                </div>
                {a.url.trim() && !id && (
                  <div style={{ fontSize: 12, color: "#dc2626", paddingLeft: 198 }}>
                    Não achei um ID nessa URL — não vai liberar nada. Cole a URL da página do anúncio.
                  </div>
                )}
                {dup && (
                  <div style={{ fontSize: 12, color: "#b45309", paddingLeft: 198, display: "flex", alignItems: "center", gap: 5 }}>
                    <AlertTriangle size={12} strokeWidth={2} /> Este anúncio já está {id === idAncora ? "na âncora" : "repetido na lista"} — funciona, mas é engano de cadastro.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setAnuncios([...anuncios, { url: "", rotulo: "" }]);
            marcarSujo();
          }}
          style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 8, border: "1px dashed #9ca3af", background: "#fff", color: "#374151", cursor: "pointer", fontSize: 13.5, fontWeight: 600 }}
        >
          <Plus size={15} strokeWidth={2.4} /> Adicionar anúncio de campanha
        </button>

        {invalidos > 0 && (
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "#b45309" }}>
            {invalidos} linha{invalidos === 1 ? "" : "s"} sem ID reconhecível — {invalidos === 1 ? "ela será descartada" : "elas serão descartadas"} ao salvar.
          </p>
        )}
      </div>

      {/* ── SALVAR ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={salvarTudo}
          disabled={salvando}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontWeight: 700, fontSize: 14, cursor: salvando ? "default" : "pointer", opacity: salvando ? 0.7 : 1 }}
        >
          {salvando ? <Loader2 size={15} className="girando" strokeWidth={2.5} /> : <Check size={15} strokeWidth={2.5} />}
          {salvando ? "Salvando…" : "Salvar anúncios"}
        </button>
        {salvo && !salvando && <span style={{ color: "#059669", fontSize: 13.5, fontWeight: 600 }}>Salvo — as páginas de venda já refletem.</span>}
      </div>
    </section>
  );
}
