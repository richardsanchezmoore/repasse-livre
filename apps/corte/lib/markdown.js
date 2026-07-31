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
  const flushP = () => { if (paras.length) { html += `<p>${inline(paras.join(" "))}</p>`; paras = []; } };
  const flushL = () => { if (itens.length) { html += "<ul>" + itens.map((i) => `<li>${inline(i)}</li>`).join("") + "</ul>"; itens = []; } };

  for (const raw of linhas) {
    const l = raw.trim();
    if (l === "") { flushP(); flushL(); continue; }
    if (l === "---" || l === "***") { flushP(); flushL(); html += '<hr class="ld-rule"/>'; continue; }
    if (l.startsWith("### ")) { flushP(); flushL(); html += `<h3>${inline(l.slice(4))}</h3>`; continue; }
    if (l.startsWith("## ")) { flushP(); flushL(); html += `<h2>${inline(l.slice(3))}</h2>`; continue; }
    if (l.startsWith("# ")) { flushP(); flushL(); html += `<h1>${inline(l.slice(2))}</h1>`; continue; }
    if (l.startsWith("> ")) { flushP(); flushL(); html += `<blockquote>${inline(l.slice(2))}</blockquote>`; continue; }
    if (l.startsWith("- ") || l.startsWith("* ")) { flushP(); itens.push(l.slice(2)); continue; }
    paras.push(l);
  }
  flushP(); flushL();
  return html;
}
