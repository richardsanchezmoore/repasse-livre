// Página de AVALIAÇÃO de fontes (temporária). Abra no celular e compare a
// legibilidade do CORPO de texto. Os títulos ficam sempre em Playfair Display.
// Quando escolher, me diga o nome e eu aplico no app inteiro (--corpo).
export const metadata = { title: "Fontes · avaliação", robots: { index: false, follow: false } };
export const dynamic = "force-static";

const AMOSTRA = {
  eyebrow: "◈ O Panfleto ◈",
  titulo: "O Cavaleiro de Fachada",
  sub: "Perfil nº 3 — o que reluz no culto e some no compromisso",
  p1: "Toda dama já cruzou com ele: o homem que ora bonito, cita versículos de cor e comove a igreja inteira num domingo. Mas repare — a fé dele é palco, não altar. Ele ama a plateia que a devoção lhe rende, não o Deus a quem diz servir. E há uma distância enorme entre parecer espiritual e ser um homem de caráter.",
  p2: "O discernimento, querida leitora, não nasce da desconfiança, mas da atenção. Observe o que ele faz quando ninguém aplaude: como trata a mãe, o garçom, a mulher que discorda dele. É ali, no palco vazio, que o coração se revela — e é ali que a sua sabedoria deve olhar.",
  versiculo: "“Nem tudo o que reluz no culto reluz no compromisso.”",
  ref: "— Lady Whistledown do Altar",
};

const OPCOES = [
  { nome: "Cormorant Garamond", tag: "ATUAL — display usada como corpo (o problema)", css: "'Cormorant Garamond', serif", peso: 500 },
  { nome: "Lora", tag: "★ Recomendada — serifa desenhada p/ leitura digital", css: "'Lora', serif", peso: 450 },
  { nome: "Merriweather", tag: "Serifa robusta, altura-x alta (ótima p/ textos longos)", css: "'Merriweather', serif", peso: 400 },
  { nome: "Inter", tag: "Sem serifa — clássico-contemporâneo (títulos serifados + corpo limpo)", css: "'Inter', sans-serif", peso: 400 },
];

export default function FontesAvaliacao() {
  return (
    <main className="screen">
      {/* carrega as candidatas só nesta página */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,450;0,500;1,400&family=Merriweather:wght@300;400;700&family=Inter:wght@400;500;600&display=swap"
      />
      <div className="eyebrow">◈ Avaliação de fontes ◈</div>
      <h1 className="h-title">Qual fonte lê <em>melhor</em>?</h1>
      <p className="h-sub">Mesmo texto do Panfleto em cada fonte. Os títulos continuam em Playfair. Leia no celular e me diga qual venceu.</p>

      {OPCOES.map((o) => (
        <section key={o.nome} className="card" style={{ marginTop: 16 }}>
          <div className="c-k" style={{ color: "var(--gold)" }}>{o.nome}</div>
          <div style={{ font: "500 12px var(--ui)", color: "var(--ink-soft)", marginBottom: 12 }}>{o.tag}</div>

          <div style={{ fontFamily: "var(--disp)" }}>
            <div className="eyebrow">{AMOSTRA.eyebrow}</div>
            <h2 style={{ font: "900 24px/1.1 var(--disp)", color: "var(--ink)" }}>{AMOSTRA.titulo}</h2>
            <p style={{ font: "italic 500 15px/1.4 var(--serif)", color: "var(--ink-soft)", margin: "4px 0 12px" }}>{AMOSTRA.sub}</p>
          </div>

          {/* CORPO na fonte candidata, na régua proposta: 16.5px / 1.62 */}
          <div style={{ fontFamily: o.css, fontWeight: o.peso, fontSize: "16.5px", lineHeight: 1.62, color: "var(--ink)" }}>
            <p style={{ marginBottom: 12 }}>{AMOSTRA.p1}</p>
            <p>{AMOSTRA.p2}</p>
          </div>

          <div className="card dark" style={{ marginTop: 14, padding: "14px 16px" }}>
            <div style={{ fontFamily: o.css, fontWeight: o.peso, fontSize: "16px", lineHeight: 1.5, color: "#fff", fontStyle: "italic" }}>{AMOSTRA.versiculo}</div>
            <div style={{ fontFamily: o.css, fontSize: "13px", color: "#d8b1bb", marginTop: 8 }}>{AMOSTRA.ref}</div>
          </div>
        </section>
      ))}

      <hr className="divider" />
      <p className="muted">Página temporária de avaliação — some depois de escolhermos.</p>
    </main>
  );
}
