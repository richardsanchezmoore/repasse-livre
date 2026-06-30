import "dotenv/config";
import { chromium } from "playwright";
import type { Page } from "playwright";
import { supabase } from "./supabaseClient.js";

const MAX_FOTOS = 10;

function parseProxy(url: string) {
  const u = new URL(url);
  return {
    server: `${u.protocol}//${u.host}`,
    username: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
  };
}

async function buscarDetalhes(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page
    .waitForSelector(".ui-pdp-gallery, .ui-pdp-description", { timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(1500);

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
  const { data: oportunidades, error } = await supabase
    .from("opportunities")
    .select("id, link_origem, foto_principal")
    .eq("fonte", "MERCADO_LIVRE")
    .order("criado_em", { ascending: true });

  if (error) throw new Error(`Erro ao buscar oportunidades: ${error.message}`);
  if (!oportunidades?.length) {
    console.log("Nenhuma oportunidade MERCADO_LIVRE encontrada.");
    return;
  }

  console.log(`[backfill-ml] ${oportunidades.length} oportunidades para atualizar.`);

  const proxyUrl = process.env.PROXY_URL;
  const browser = await chromium.launch({
    headless: false,
    proxy: proxyUrl ? parseProxy(proxyUrl) : undefined,
    args: ["--no-sandbox"],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "pt-BR",
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();

    // Aquecimento mínimo para ter cookies antes de acessar páginas individuais.
    await page.goto("https://www.mercadolivre.com.br/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.goto("https://lista.mercadolivre.com.br/veiculos/carros-caminhonetes/particular/", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(3000);

    let ok = 0;
    let falhou = 0;

    for (const op of oportunidades) {
      console.log(`[backfill-ml] (${ok + falhou + 1}/${oportunidades.length}) ${op.link_origem}`);
      try {
        const detalhes = await buscarDetalhes(page, op.link_origem);

        const todasFotos = [
          ...(op.foto_principal ? [op.foto_principal] : []),
          ...detalhes.fotos.filter((f: string) => f !== op.foto_principal),
        ].slice(0, MAX_FOTOS);

        const { error: erroUpdate } = await supabase
          .from("opportunities")
          .update({
            foto_principal: todasFotos[0] ?? op.foto_principal,
            fotos_secundarias: todasFotos.slice(1),
            descricao: detalhes.descricao,
            cambio: detalhes.cambio,
            atributos_olx: detalhes.atributos,
          })
          .eq("id", op.id);

        if (erroUpdate) {
          console.error(`[backfill-ml] Erro ao salvar ${op.id}: ${erroUpdate.message}`);
          falhou++;
        } else {
          console.log(
            `[backfill-ml] ✓ ${detalhes.fotos.length} fotos | desc: ${detalhes.descricao ? "sim" : "não"} | câmbio: ${detalhes.cambio ?? "—"}`
          );
          ok++;
        }
      } catch (e) {
        console.error(`[backfill-ml] Falha em ${op.link_origem}:`, e instanceof Error ? e.message : e);
        falhou++;
      }

      await page.waitForTimeout(4000 + Math.floor(Math.random() * 3000));
    }

    console.log(`[backfill-ml] Concluído: ${ok} atualizados, ${falhou} falhou.`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("[backfill-ml] Falha:", e);
  process.exitCode = 1;
});
