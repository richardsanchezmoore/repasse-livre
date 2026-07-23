import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fetch as undiciFetch } from "undici";
import sharp from "sharp";
import { supabase } from "./supabaseClient.js";

/**
 * RE-HOSPEDAGEM das fotos do Facebook. As URLs do `fbcdn.net` têm assinatura que EXPIRA
 * em ~dias (param `oe=`) → depois disso 403 → imagem quebra no site/criativo/landing. Aqui
 * baixamos as fotos ENQUANTO válidas e subimos pro nosso bucket (permanente).
 *
 * Estratégia (decisão do usuário): re-hospeda as 5 PRIMEIRAS (controle de disco — FB é a
 * fonte principal e só cresce), MAS mantém as demais cruas do fbcdn nas secundárias pra o
 * anúncio ficar "rico" nos primeiros dias; quando expiram, `limparFbExpiradas()` (cron)
 * remove os links mortos e sobram só as 5 permanentes. A foto_principal é SEMPRE re-hospedada.
 */

const execFileAsync = promisify(execFile);
const PROXY_URL = process.env.FACEBOOK_PROXY_URL ?? process.env.PROXY_URL ?? "";
const BUCKET = "oportunidades-fotos";
const MAX_REHOSPEDAR = 5;

const UA_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Baixa os bytes de uma imagem. Espelha o `pega` do facebookMain: curl_chrome116 via proxy
 *  (undici ProxyAgent falha com o proxy ISP) ou fetch direto (IP residencial, motor local). */
async function baixarBytes(url: string): Promise<Buffer | null> {
  try {
    if (PROXY_URL) {
      const args = ["-sS", "--fail", "--connect-timeout", "30", "--max-time", "120", "-x", PROXY_URL, url];
      const { stdout } = await execFileAsync("curl_chrome116", args, {
        maxBuffer: 25 * 1024 * 1024,
        timeout: 130_000,
        encoding: "buffer",
      });
      const buf = stdout as Buffer;
      return buf.length > 0 ? buf : null;
    }
    const r = await undiciFetch(url, {
      headers: { "user-agent": UA_CHROME, accept: "image/avif,image/webp,image/*,*/*;q=0.8", referer: "https://www.facebook.com/" },
    });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

/** Sobe uma foto (jpeg redimensionado) + thumb (webp) no bucket, com nome determinístico
 *  (idempotente: re-rodar sobrescreve). Nome só com [0-9a-f-] pra o thumb casar (imagemOlx). */
async function subirFoto(itemId: string, indice: number, bytes: Buffer): Promise<string | null> {
  const nome = `fb-${itemId}-${indice}.jpg`;
  try {
    const full = await sharp(bytes)
      .rotate()
      .resize({ width: 1280, height: 960, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    const { error } = await supabase.storage.from(BUCKET).upload(nome, full, { contentType: "image/jpeg", upsert: true });
    if (error) return null;

    // Thumb leve pros cards/grade (falha não derruba — onError cai pro original).
    try {
      const thumb = await sharp(bytes).rotate().resize({ width: 700, height: 500, fit: "cover" }).webp({ quality: 70 }).toBuffer();
      await supabase.storage.from(BUCKET).upload(nome.replace(/\.jpg$/, "-thumb.webp"), thumb, { contentType: "image/webp", upsert: true });
    } catch {
      /* thumb é best-effort */
    }

    return supabase.storage.from(BUCKET).getPublicUrl(nome).data.publicUrl;
  } catch {
    return null;
  }
}

/**
 * Re-hospeda até 5 fotos e monta os campos finais. Retorna null se nem a PRINCIPAL baixou
 * (ex.: já expirou no backfill) → aí o chamador mantém o que tinha (ou pula).
 * fotos_secundarias = [permanentes 2..5] + [cruas 6..10] (as extras somem sozinhas ao expirar).
 */
export async function rehospedarFotosFacebook(
  itemId: string,
  fotos: string[],
): Promise<{ foto_principal: string; fotos_secundarias: string[] } | null> {
  const alvo = fotos.filter(Boolean).slice(0, MAX_REHOSPEDAR);
  const extrasCruas = fotos.filter(Boolean).slice(MAX_REHOSPEDAR, 10);

  const permanentes: string[] = [];
  for (let i = 0; i < alvo.length; i++) {
    const bytes = await baixarBytes(alvo[i]);
    const url = bytes ? await subirFoto(itemId, i, bytes) : null;
    if (url) permanentes.push(url);
    else if (i === 0) return null; // sem principal → aborta (não dá pra confiar no resto)
  }
  if (permanentes.length === 0) return null;

  return { foto_principal: permanentes[0], fotos_secundarias: [...permanentes.slice(1), ...extrasCruas] };
}

/** Extrai o item-id do FB da link_origem (`.../marketplace/item/1733...`). */
export function itemIdDoLink(linkOrigem: string | null | undefined): string | null {
  return linkOrigem?.match(/\/item\/(\d+)/)?.[1] ?? null;
}

/** URL do fbcdn com assinatura expirada? Lê o `oe=` (timestamp hex de validade). */
export function fbcdnExpirado(url: string): boolean {
  if (!url.includes("fbcdn.net")) return false;
  const oe = url.match(/[?&]oe=([0-9A-Fa-f]+)/)?.[1];
  if (!oe) return false;
  const expira = parseInt(oe, 16);
  return Number.isFinite(expira) && expira * 1000 < Date.now();
}
