import "dotenv/config";
import { chromium } from "playwright";
import type { Page } from "playwright";
import { supabase } from "./supabaseClient.js";

const MAX_FOTOS = 10;

function parseProxy(url: string, sessaoId: number) {
  const u = new URL(url);
  // Troca o sessid para obter um IP diferente a cada anúncio individual.
  // Visitar 2+ páginas individuais na mesma sessão ativa /captcha/wall —
  // confirmado em debug (29/06): item 1 carrega, item 2 vai pro captcha.
  const username = decodeURIComponent(u.username).replace(/;sessid\.\d+/, `;sessid.${sessaoId}`);
  return {
    server: `${u.protocol}//${u.host}`,
    username,
    password: decodeURIComponent(u.password),
  };
}

async function criarBrowserParaDetalhes(proxyUrl: string | undefined, sessaoId: number) {
  return chromium.launch({
    headless: true,
    proxy: proxyUrl ? parseProxy(proxyUrl, sessaoId) : undefined,
    args: ["--no-sandbox"],
  });
}

interface Detalhes { fotos: string[]; descricao: string | null; cambio: string | null; atributos: Record<string, { label: string; value: string }> }

async function buscarDetalhes(url: string, sessaoId: number): Promise<Detalhes> {
  const proxyUrl = process.env.PROXY_URL;
  const browser = await criarBrowserParaDetalhes(proxyUrl, sessaoId);
  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "pt-BR",
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();
    // Aquecimento mínimo por sessão para ter cookies antes da página individual.
    await page.goto("https://lista.mercadolivre.com.br/veiculos/carros-caminhonetes/particular/", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(3000);
    return await _extrairDetalhes(page, url) as Detalhes;
  } finally {
    await browser.close();
  }
}

async function _extrairDetalhes(page: Page, url: string) {
  // domcontentloaded retorna na challenge page (Anubis, ~9KB).
  // waitForSelector sobrevive ao redirect JS (window.location.href = realUrl)
  // e só resolve quando a gallery da página real aparecer (~10-15s total).
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector(".ui-pdp-gallery, .ui-pdp-description", { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(1000);

  return page.evaluate((maxFotos: number) => {
    const imgEls = Array.from(
      document.querySelectorAll<HTMLImageElement>(
        "figure.ui-pdp-gallery__figure img, .ui-pdp-gallery figure img"
      )
    );
    const fotos = [...new Set(
      imgEls
        .map((img) => img.getAttribute("data-zoom") || img.src || "")
        .filter((src) => src.startsWith("http"))
    )].slice(0, maxFotos);

    const descEl = document.querySelector(
      ".ui-pdp-description__content, p.ui-pdp-description__content"
    );
    const descricao = descEl?.textContent?.trim() || null;

    const specRows = Array.from(
      document.querySelectorAll(".ui-pdp-specs__table tr, .andes-table__row")
    );
    const atributos: Record<string, { label: string; value: string }> = {};
    for (const row of specRows) {
      const cells = row.querySelectorAll("th, td");
      if (cells.length >= 2) {
        const label = cells[0].textContent?.trim() ?? "";
        const value = cells[1].textContent?.trim() ?? "";
        if (label && value) {
          atributos[label.toLowerCase().replace(/\s+/g, "_")] = { label, value };
        }
      }
    }

    const cambio =
      atributos["transmissão"]?.value ||
      atributos["câmbio"]?.value ||
      atributos["transmissao"]?.value ||
      atributos["cambio"]?.value ||
      null;

    return { fotos, descricao, cambio, atributos };
  }, MAX_FOTOS);
}

async function main() {
  // Janela (default 15h) + limite opcional pra testar. Só reprocessa o que FALTA
  // (sem descrição OU sem fotos secundárias) → re-runs após reiniciar o roteador
  // pulam os já preenchidos.
  const HORAS = Number(process.argv.find((a) => a.startsWith("--horas="))?.split("=")[1] ?? 15);
  const LIMITE = Number(process.argv.find((a) => a.startsWith("--limite="))?.split("=")[1] ?? Infinity);
  const desde = new Date(Date.now() - HORAS * 3600 * 1000).toISOString();

  const { data: recentes, error } = await supabase
    .from("opportunities")
    .select("id, link_origem, foto_principal, descricao, fotos_secundarias")
    .eq("fonte", "MERCADO_LIVRE")
    .gte("data_captura", desde)
    .order("data_captura", { ascending: false });

  if (error) throw new Error(`Erro ao buscar oportunidades: ${error.message}`);
  const oportunidades = (recentes ?? [])
    .filter((o) => !o.descricao || !(o.fotos_secundarias as unknown[] | null)?.length)
    .slice(0, LIMITE);

  if (!oportunidades.length) {
    console.log(`[backfill-ml] Nada faltando nas últimas ${HORAS}h.`);
    return;
  }
  console.log(`[backfill-ml] ${oportunidades.length} anúncios com dados faltando (últimas ${HORAS}h).`);

  // ML bloqueia o IP após N páginas individuais (account-verification). Se vier uma
  // sequência de vazios/falhas, é bloqueio → para (não adianta insistir); o usuário
  // reinicia o roteador e roda de novo (o filtro só pega o que ainda falta).
  const LIMITE_BLOQUEIO = 8;
  let ok = 0, falhou = 0, semDados = 0, seguidas = 0;

  for (let i = 0; i < oportunidades.length; i++) {
    const op = oportunidades[i];
    console.log(`[backfill-ml] (${i + 1}/${oportunidades.length}) ${op.link_origem}`);
    try {
      const detalhes = await buscarDetalhes(op.link_origem, 10 + i);

      // Página vazia/challenge → NÃO sobrescreve (não apaga o que já tem) e conta bloqueio.
      if (detalhes.fotos.length === 0 && !detalhes.descricao) {
        console.warn(`[backfill-ml] ✗ sem dados (provável bloqueio/challenge)`);
        semDados++;
        if (++seguidas >= LIMITE_BLOQUEIO) {
          console.error(`[backfill-ml] ${seguidas} vazios seguidos — IP provavelmente bloqueado. Reinicie o roteador e rode de novo (só os faltantes são reprocessados).`);
          break;
        }
        continue;
      }
      seguidas = 0;

      const todasFotos = [
        ...(op.foto_principal ? [op.foto_principal] : []),
        ...detalhes.fotos.filter((f: string) => f !== op.foto_principal),
      ].slice(0, MAX_FOTOS);

      const patch: Record<string, unknown> = { cambio: detalhes.cambio, atributos_olx: detalhes.atributos };
      if (detalhes.descricao) patch.descricao = detalhes.descricao;
      if (detalhes.fotos.length) {
        patch.foto_principal = todasFotos[0] ?? op.foto_principal;
        patch.fotos_secundarias = todasFotos.slice(1);
      }

      const { error: erroUpdate } = await supabase.from("opportunities").update(patch).eq("id", op.id);
      if (erroUpdate) {
        console.error(`[backfill-ml] Erro ao salvar ${op.id}: ${erroUpdate.message}`);
        falhou++;
      } else {
        console.log(`[backfill-ml] ✓ ${detalhes.fotos.length} fotos | desc: ${detalhes.descricao ? "sim" : "não"} | câmbio: ${detalhes.cambio ?? "—"}`);
        ok++;
      }
    } catch (e) {
      console.error(`[backfill-ml] Falha em ${op.link_origem}:`, e instanceof Error ? e.message : e);
      falhou++;
      if (++seguidas >= LIMITE_BLOQUEIO) {
        console.error(`[backfill-ml] ${seguidas} falhas seguidas — IP provavelmente bloqueado. Reinicie o roteador e rode de novo.`);
        break;
      }
    }
  }

  console.log(`[backfill-ml] Concluído: ${ok} atualizados, ${semDados} sem dados, ${falhou} falhou.`);
}

main().catch((e) => {
  console.error("[backfill-ml] Falha:", e);
  process.exitCode = 1;
});
