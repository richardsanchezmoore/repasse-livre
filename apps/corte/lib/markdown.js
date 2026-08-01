// Markdown → HTML mínimo (puro). Conteúdo é escrito só por admin (RLS), mas
// escapamos < > & mesmo assim. Cobre: #/##/### · **negrito** · *itálico* ·
// > citação · --- · listas (- / *) · parágrafos.

export function mdParaHtml(md) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>");

  const linhas = String(md || "").replace(/\r/g, "").split("\n");
  let html = "";
  let paras = [];
  let itens = [];
  // Parágrafo que começa com "**Rótulo.** ..." vira componente do livro:
  // Alerta Bíblico → versículo · Diagnóstico → caixa escura · outros → rótulo.
  const flushP = () => {
    if (!paras.length) return;
    const txt = paras.join(" ");
    const m = txt.match(/^\*\*\s*([^*]+?)\s*\*\*\s*([\s\S]*)$/);
    if (m) {
      const rotulo = m[1].replace(/\.\s*$/, "");
      const resto = m[2];
      const low = rotulo.toLowerCase();
      if (/diagn/.test(low)) html += `<div class="ld-diag"><div class="ld-lbl">${inline(rotulo)}</div><p>${inline(resto)}</p></div>`;
      else if (/alerta|b[íi]blic|vers[íi]cul/.test(low)) html += `<div class="ld-verse"><div class="ld-lbl">${inline(rotulo)}</div>${inline(resto)}</div>`;
      else html += `<p class="ld-p"><span class="ld-lbl-in">${inline(rotulo)}.</span> ${inline(resto)}</p>`;
      paras = [];
      return;
    }
    html += `<p>${inline(txt)}</p>`;
    paras = [];
  };
  const flushL = () => { if (itens.length) { html += "<ul>" + itens.map((i) => `<li>${inline(i)}</li>`).join("") + "</ul>"; itens = []; } };
  let tabela = [];
  const flushT = () => {
    if (!tabela.length) return;
    const linhasT = tabela.map((r) => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim()));
    const corpo = linhasT.filter((r) => !r.every((c) => c === "" || /^:?-{2,}:?$/.test(c)));
    let out = '<div class="ld-tabwrap"><table class="ld-tab"><tbody>';
    corpo.forEach((cells, i) => {
      const tag = i === 0 ? "th" : "td";
      out += "<tr>" + cells.map((c) => `<${tag}>${inline(c)}</${tag}>`).join("") + "</tr>";
    });
    html += out + "</tbody></table></div>";
    tabela = [];
  };

  for (const raw of linhas) {
    const l = raw.trim();
    if (l.startsWith("|") && l.length > 1) { flushP(); flushL(); tabela.push(l); continue; }
    if (tabela.length) flushT();
    if (l === "") { flushP(); flushL(); continue; }
    const img = l.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) { flushP(); flushL(); html += `<img class="ld-art" src="${img[2]}" alt="${esc(img[1])}" loading="lazy"/>`; continue; }
    if (l === "---" || l === "***") { flushP(); flushL(); html += '<hr class="ld-rule"/>'; continue; }
    if (l.startsWith("### ")) { flushP(); flushL(); html += `<h3>${inline(l.slice(4))}</h3>`; continue; }
    if (l.startsWith("## ")) { flushP(); flushL(); html += `<h2>${inline(l.slice(3))}</h2>`; continue; }
    if (l.startsWith("# ")) { flushP(); flushL(); html += `<h1>${inline(l.slice(2))}</h1>`; continue; }
    if (l.startsWith("> ")) { flushP(); flushL(); html += `<blockquote>${inline(l.slice(2))}</blockquote>`; continue; }
    if (l.startsWith("- ") || l.startsWith("* ")) { flushP(); itens.push(l.slice(2)); continue; }
    paras.push(l);
  }
  flushP(); flushL(); flushT();
  return html;
}
