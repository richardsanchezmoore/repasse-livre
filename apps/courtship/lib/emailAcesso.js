// Post-purchase access email (fallback for buyers who paid and didn't return to /welcome).
// Resend over HTTP (no SDK). Best-effort: never throws — returns {ok,erro}.
// Envs (Vercel, courtship project):
//   RESEND_API_KEY   — Resend key (its own account/domain for the US brand)
//   CA_EMAIL_FROM    — sender; default "The Courtship Almanac <hello@courtshipalmanac.com>"
//                      (domain must be VERIFIED in Resend)
//   CA_APP_URL       — links base; default "https://courtshipalmanac.com"

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.CA_EMAIL_FROM || "The Courtship Almanac <hello@courtshipalmanac.com>";
const APP_URL = (process.env.CA_APP_URL || "https://courtshipalmanac.com").replace(/\/+$/, "");

function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function render({ firstName, link }) {
  // Intentionally DARK palette (Regency) — a light background gets inverted by email
  // dark mode and looks wrong. A dark ground stays stable in both modes, and is on-brand.
  const PAGE = "#1f0f13", CARD = "#2c141a", FOOTER = "#251016", WINE = "#7c2b37";
  const GOLD = "#cba85b", GOLD_B = "#b0873f", CREME = "#f6e7c9", TXT = "#e3d6bd", SOFT = "#b8a98c";
  const hi = firstName ? `Welcome, ${firstName}.` : "Welcome, virtuous lady.";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"></head>
<body style="margin:0;padding:0;background:${PAGE};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${CARD};border:1px solid ${GOLD_B};border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(90deg,#4a1620,${WINE});padding:14px 20px;text-align:center;">
          <div style="color:${GOLD};font-size:13px;letter-spacing:2px;text-transform:uppercase;">&#10022; The Courtship Almanac &#10022;</div>
        </td></tr>
        <tr><td style="padding:34px 30px 8px;text-align:center;">
          <div style="color:${GOLD};font-size:13px;letter-spacing:2px;text-transform:uppercase;">&#9672; Order confirmed &#9672;</div>
          <h1 style="margin:12px 0 6px;color:${CREME};font-size:27px;line-height:1.25;">${hi}</h1>
          <p style="margin:0;color:${TXT};font-size:16px;line-height:1.6;">Your Discernment Kit is ready. Create your password and step <b style="color:${CREME};">right in</b> — no waiting.</p>
        </td></tr>
        <tr><td style="padding:24px 30px 6px;text-align:center;">
          <a href="${link}" style="display:inline-block;background:${GOLD};color:#3a141b;text-decoration:none;font-weight:bold;font-size:17px;padding:16px 34px;border-radius:8px;border:1px solid ${CREME};">&#128081; Create my access</a>
        </td></tr>
        <tr><td style="padding:14px 34px 30px;text-align:center;">
          <p style="margin:0;color:${SOFT};font-size:13px;line-height:1.7;">Use the <b style="color:${TXT};">same email as your purchase</b>. Just set a password — no link to hunt for. Lifetime access, right on your phone.</p>
          <p style="margin:14px 0 0;color:${SOFT};font-size:12px;line-height:1.6;">If the button doesn't open, copy and paste this into your browser:<br><span style="color:${GOLD};word-break:break-all;">${esc(link)}</span></p>
        </td></tr>
        <tr><td style="background:${FOOTER};padding:16px 20px;text-align:center;border-top:1px solid ${GOLD_B};">
          <div style="color:${SOFT};font-size:12px;line-height:1.6;">Pour your tea, adjust your gloves, and keep your eyes wide open.<br><b style="color:${GOLD};">The Courtship Almanac</b></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Sends the access email. `tipo` = "kit" | "assinatura" (reserved for future). */
export async function enviarEmailAcesso({ email, nome, tipo }) {
  if (!RESEND_API_KEY) return { ok: false, erro: "RESEND_API_KEY ausente" };
  if (!email) return { ok: false, erro: "sem email" };
  const subject = "👑 Your Courtship Almanac is ready — create your access";
  const firstName = nome ? esc(String(nome).trim().split(/\s+/)[0]) : "";
  const link = `${APP_URL}/welcome?email=${encodeURIComponent(email)}`;
  const html = render({ firstName, link });
  const text = `${firstName ? "Welcome, " + firstName + "." : "Welcome!"} Your Discernment Kit is ready.\nCreate your access (use the same email as your purchase): ${link}`;
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [email], subject, html, text }),
    });
    if (!resp.ok) return { ok: false, erro: `HTTP ${resp.status} ${(await resp.text().catch(() => "")).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e?.message || String(e) };
  }
}
