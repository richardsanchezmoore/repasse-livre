import "server-only";
import { formatarMoeda } from "@/lib/formatadores";
import { urlOportunidade, URL_BASE_SITE } from "@/lib/site";
import type { Oportunidade } from "@/lib/types";

/**
 * Transporte + template dos e-mails de alerta (Buscas salvas PRO). Usa a API HTTP
 * do Resend direto via fetch — sem SDK, uma dependência a menos. O domínio
 * repasselivre.com está verificado no Resend, então o remetente pode ser um
 * endereço que não existe como caixa (alertas@ é só o From). A RESEND_API_KEY vive
 * em apps/admin/.env.local; nunca é logada.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const REMETENTE = "Repasse Livre <alertas@repasselivre.com>";

/** Só os campos que o card do e-mail precisa — casa com o que urlOportunidade pede. */
export type AnuncioEmail = Pick<
  Oportunidade,
  | "id"
  | "veiculo"
  | "versao"
  | "ano"
  | "cidade"
  | "estado"
  | "origem_tipo"
  | "preco"
  | "fipe_valor"
  | "margem_percentual"
  | "foto_principal"
>;

/** Escapa texto vindo de anúncio raspado antes de injetar no HTML do e-mail. */
function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Envia um e-mail via Resend. Best-effort: retorna erro em vez de lançar. */
export async function enviarEmailResend(
  para: string,
  assunto: string,
  html: string,
): Promise<{ ok: boolean; erro?: string }> {
  if (!RESEND_API_KEY) return { ok: false, erro: "RESEND_API_KEY ausente" };
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: REMETENTE, to: [para], subject: assunto, html }),
    });
    if (!resp.ok) {
      const corpo = await resp.text().catch(() => "");
      return { ok: false, erro: `HTTP ${resp.status} ${corpo.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}

const AZUL = "#0b3d2e"; // verde-escuro da marca
const VERDE = "#16a34a";

/** Card de um anúncio dentro do e-mail (inline styles — e-mail não lê <style>). */
function cardAnuncio(a: AnuncioEmail): string {
  const url = urlOportunidade(a);
  const local = [a.cidade, a.estado].filter(Boolean).join(" - ");
  const margem =
    a.margem_percentual != null
      ? `<span style="display:inline-block;background:${VERDE};color:#fff;font-size:13px;font-weight:700;padding:3px 10px;border-radius:999px;">${a.margem_percentual.toFixed(1)}% abaixo da FIPE</span>`
      : "";
  const foto = a.foto_principal
    ? `<img src="${esc(a.foto_principal)}" alt="" width="560" style="width:100%;max-width:560px;height:auto;border-radius:10px 10px 0 0;display:block;object-fit:cover;" />`
    : "";
  const fipe = a.fipe_valor != null ? `<span style="color:#6b7280;font-size:14px;">FIPE ${formatarMoeda(a.fipe_valor)}</span>` : "";

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:0 0 16px;background:#fff;">
    <tr><td>${foto}</td></tr>
    <tr><td style="padding:16px 18px 18px;">
      <div style="font-size:17px;font-weight:700;color:#111827;line-height:1.3;">${esc(a.veiculo)}</div>
      ${a.ano ? `<div style="color:#6b7280;font-size:14px;margin-top:2px;">${esc(a.ano)}${local ? ` · ${esc(local)}` : ""}</div>` : local ? `<div style="color:#6b7280;font-size:14px;margin-top:2px;">${esc(local)}</div>` : ""}
      <div style="margin:12px 0 6px;">
        <span style="font-size:22px;font-weight:800;color:${AZUL};">${formatarMoeda(a.preco)}</span>
        &nbsp; ${fipe}
      </div>
      <div style="margin:8px 0 16px;">${margem}</div>
      <a href="${url}" style="display:inline-block;background:${AZUL};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:11px 22px;border-radius:8px;">Ver anúncio →</a>
    </td></tr>
  </table>`;
}

/**
 * Monta assunto + HTML de um alerta com 1+ anúncios. `frequencia` só muda a linha
 * de rodapé (o "por que recebi isto"). O e-mail é o mesmo pro imediato e pro diário.
 */
export function renderAlerta(
  nome: string | null,
  anuncios: AnuncioEmail[],
  frequencia: "na_hora" | "diario",
): { assunto: string; html: string } {
  const n = anuncios.length;
  const saudacao = nome ? `Olá, ${esc(nome.split(" ")[0])}!` : "Olá!";
  const assunto =
    n === 1
      ? `🚗 ${anuncios[0].veiculo}${anuncios[0].margem_percentual != null ? ` — ${anuncios[0].margem_percentual.toFixed(1)}% abaixo da FIPE` : ""}`
      : `🚗 ${n} novos carros na sua busca`;

  const titulo =
    n === 1 ? "Um carro que você procura acabou de entrar" : `${n} carros que você procura acabaram de entrar`;
  const rodapeFreq =
    frequencia === "na_hora"
      ? "Você recebe este alerta na hora porque escolheu ser avisado imediatamente — é assim que se chega antes da concorrência."
      : "Este é o seu resumo diário. Para modelos comuns, juntamos tudo num e-mail só.";

  const cards = anuncios.map(cardAnuncio).join("");

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 4px 18px;">
          <div style="font-size:20px;font-weight:800;color:${AZUL};">Repasse Livre</div>
        </td></tr>
        <tr><td style="padding:0 4px 6px;">
          <div style="font-size:15px;color:#374151;">${saudacao}</div>
          <div style="font-size:18px;font-weight:700;color:#111827;margin:6px 0 18px;">${titulo}</div>
        </td></tr>
        <tr><td>${cards}</td></tr>
        <tr><td style="padding:8px 4px 0;">
          <div style="font-size:13px;color:#6b7280;line-height:1.6;">${rodapeFreq}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:10px;">
            <a href="${URL_BASE_SITE}/conta" style="color:${AZUL};font-weight:600;text-decoration:none;">Gerenciar minhas buscas salvas</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { assunto, html };
}
