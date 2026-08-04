// E-mail de acesso pós-compra (fallback pra quem pagou via PIX e não voltou pro /bem-vinda).
// Resend via HTTP (sem SDK). Best-effort: nunca lança — retorna {ok,erro}.
// Envs (Vercel do projeto corte):
//   RESEND_API_KEY   — a mesma chave do Resend (pode reusar a do admin)
//   CORTE_EMAIL_FROM — remetente; default "Damas Virtuosas <acesso@damasvirtuosas.com>"
//                      (o domínio precisa estar VERIFICADO no Resend)
//   CORTE_APP_URL    — base dos links; default "https://damasvirtuosas.com"

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.CORTE_EMAIL_FROM || "Damas Virtuosas <acesso@damasvirtuosas.com>";
const APP_URL = (process.env.CORTE_APP_URL || "https://damasvirtuosas.com").replace(/\/+$/, "");

function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function render({ primeiroNome, produtoLabel, link }) {
  // Paleta ESCURA (Regency) de propósito: um fundo claro seria INVERTIDO pelo dark mode
  // do Gmail e ficaria estranho. Um fundo escuro fica estável nos dois modos — e é on-brand.
  const PAGE = "#1f0f13", CARD = "#2c141a", FOOTER = "#251016", WINE = "#7c2b37";
  const GOLD = "#cba85b", GOLD_B = "#b0873f", CREME = "#f6e7c9", TXT = "#e3d6bd", SOFT = "#b8a98c";
  const ola = primeiroNome ? `Bem-vinda, ${primeiroNome}.` : "Bem-vinda, dama virtuosa.";
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"></head>
<body style="margin:0;padding:0;background:${PAGE};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${CARD};border:1px solid ${GOLD_B};border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(90deg,#4a1620,${WINE});padding:14px 20px;text-align:center;">
          <div style="color:${GOLD};font-size:13px;letter-spacing:2px;text-transform:uppercase;">✦ Damas Virtuosas ✦</div>
        </td></tr>
        <tr><td style="padding:34px 30px 8px;text-align:center;">
          <div style="color:${GOLD};font-size:13px;letter-spacing:2px;text-transform:uppercase;">◈ Compra confirmada ◈</div>
          <h1 style="margin:12px 0 6px;color:${CREME};font-size:27px;line-height:1.25;">${ola}</h1>
          <p style="margin:0;color:${TXT};font-size:16px;line-height:1.6;">${produtoLabel} já está pronto. Crie a sua senha e entre <b style="color:${CREME};">na hora</b> — sem esperar nada.</p>
        </td></tr>
        <tr><td style="padding:24px 30px 6px;text-align:center;">
          <a href="${link}" style="display:inline-block;background:${GOLD};color:#3a141b;text-decoration:none;font-weight:bold;font-size:17px;padding:16px 34px;border-radius:8px;border:1px solid ${CREME};">👑 Criar o meu acesso</a>
        </td></tr>
        <tr><td style="padding:14px 34px 30px;text-align:center;">
          <p style="margin:0;color:${SOFT};font-size:13px;line-height:1.7;">Use o <b style="color:${TXT};">mesmo e-mail da compra</b>. É só definir a senha — nada de link no e-mail para procurar. Acesso vitalício, no seu celular.</p>
          <p style="margin:14px 0 0;color:${SOFT};font-size:12px;line-height:1.6;">Se o botão não abrir, copie e cole no navegador:<br><span style="color:${GOLD};word-break:break-all;">${esc(link)}</span></p>
        </td></tr>
        <tr><td style="background:${FOOTER};padding:16px 20px;text-align:center;border-top:1px solid ${GOLD_B};">
          <div style="color:${SOFT};font-size:12px;line-height:1.6;">Prepare o seu chá, ajuste o espartilho e abra bem os olhos.<br><b style="color:${GOLD};">Damas Virtuosas</b></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Envia o e-mail de acesso. `tipo` = "kit" | "assinatura". */
export async function enviarEmailAcesso({ email, nome, tipo }) {
  if (!RESEND_API_KEY) return { ok: false, erro: "RESEND_API_KEY ausente" };
  if (!email) return { ok: false, erro: "sem email" };
  const ehAssin = tipo === "assinatura";
  const produtoLabel = ehAssin ? "A sua assinatura das Damas Virtuosas" : "O seu Kit de Discernimento";
  const assunto = ehAssin
    ? "👑 A sua assinatura está pronta — crie o seu acesso"
    : "👑 O seu Kit de Discernimento está pronto — crie o seu acesso";
  const primeiroNome = nome ? esc(String(nome).trim().split(/\s+/)[0]) : "";
  const link = `${APP_URL}/bem-vinda?email=${encodeURIComponent(email)}`;
  const html = render({ primeiroNome, produtoLabel, link });
  const text = `${primeiroNome ? "Bem-vinda, " + primeiroNome + "." : "Bem-vinda!"} ${produtoLabel} já está pronto.\nCrie o seu acesso (use o mesmo e-mail da compra): ${link}`;
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [email], subject: assunto, html, text }),
    });
    if (!resp.ok) return { ok: false, erro: `HTTP ${resp.status} ${(await resp.text().catch(() => "")).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e?.message || String(e) };
  }
}

function renderReset({ link }) {
  const PAGE = "#1f0f13", CARD = "#2c141a", FOOTER = "#251016", WINE = "#7c2b37";
  const GOLD = "#cba85b", GOLD_B = "#b0873f", CREME = "#f6e7c9", TXT = "#e3d6bd", SOFT = "#b8a98c";
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"></head>
<body style="margin:0;padding:0;background:${PAGE};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${CARD};border:1px solid ${GOLD_B};border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(90deg,#4a1620,${WINE});padding:14px 20px;text-align:center;">
          <div style="color:${GOLD};font-size:13px;letter-spacing:2px;text-transform:uppercase;">✦ Damas Virtuosas ✦</div>
        </td></tr>
        <tr><td style="padding:34px 30px 8px;text-align:center;">
          <div style="color:${GOLD};font-size:13px;letter-spacing:2px;text-transform:uppercase;">◈ Redefinir senha ◈</div>
          <h1 style="margin:12px 0 6px;color:${CREME};font-size:26px;line-height:1.25;">Vamos criar uma nova senha</h1>
          <p style="margin:0;color:${TXT};font-size:16px;line-height:1.6;">Recebemos um pedido para redefinir a senha da sua conta. Toque no botão abaixo para criar uma nova — leva menos de um minuto.</p>
        </td></tr>
        <tr><td style="padding:24px 30px 6px;text-align:center;">
          <a href="${link}" style="display:inline-block;background:${GOLD};color:#3a141b;text-decoration:none;font-weight:bold;font-size:17px;padding:16px 34px;border-radius:8px;border:1px solid ${CREME};">🔑 Criar nova senha</a>
        </td></tr>
        <tr><td style="padding:14px 34px 30px;text-align:center;">
          <p style="margin:0;color:${SOFT};font-size:13px;line-height:1.7;">Se não foi você que pediu, pode ignorar este e-mail com tranquilidade — a sua senha atual continua a mesma.</p>
          <p style="margin:14px 0 0;color:${SOFT};font-size:12px;line-height:1.6;">Se o botão não abrir, copie e cole no navegador:<br><span style="color:${GOLD};word-break:break-all;">${esc(link)}</span></p>
        </td></tr>
        <tr><td style="background:${FOOTER};padding:16px 20px;text-align:center;border-top:1px solid ${GOLD_B};">
          <div style="color:${SOFT};font-size:12px;line-height:1.6;">Prepare o seu chá, ajuste o espartilho e abra bem os olhos.<br><b style="color:${GOLD};">Damas Virtuosas</b></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Envia o e-mail de recuperação de senha (branded, pela NOSSA Resend — não usa o
 *  template compartilhado do Supabase, que afetaria o Repasse Livre). `link` já contém
 *  o token de recuperação (/redefinir?th=...). */
export async function enviarEmailReset({ email, link }) {
  if (!RESEND_API_KEY) return { ok: false, erro: "RESEND_API_KEY ausente" };
  if (!email || !link) return { ok: false, erro: "faltando email/link" };
  const assunto = "🔑 Redefinir a sua senha — Damas Virtuosas";
  const html = renderReset({ link });
  const text = `Recebemos um pedido para redefinir a sua senha nas Damas Virtuosas.\nCrie uma nova senha: ${link}\n\nSe não foi você, ignore este e-mail.`;
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [email], subject: assunto, html, text }),
    });
    if (!resp.ok) return { ok: false, erro: `HTTP ${resp.status} ${(await resp.text().catch(() => "")).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e?.message || String(e) };
  }
}
