/**
 * NAVEGADOR LOGADO DO FACEBOOK — a camada de rede da captação paraguaia.
 *
 * ★★★ POR QUE ISTO PRECISOU EXISTIR (02/10/2026)
 *
 * A captação do Paraguai estava rodando de hora em hora, saindo com exit 0 e
 * gravando "0 na página" em todas as cinco praças, todos os dias. Sem erro
 * nenhum no log — o pior tipo de falha, porque parece que está funcionando.
 *
 * Sondando ao vivo, o `fetch` anônimo devolve:
 *
 *     HTTP 200  →  redirect para /login/?next=...
 *     único __typename no HTML: "CAAFetaManualLoginRenderer"
 *
 * Ou seja: **o Facebook fechou o Marketplace para visitante anônimo.** Não é
 * bloqueio de IP (o IP é residencial e paraguaio), não é a marcação que mudou,
 * não é o parser. É muro de sessão. O Gustavo já tinha notado o sintoma pelo
 * outro lado: *"o que fizemos foi extração na mão"* — na mão funciona porque o
 * navegador dele está logado.
 *
 * ★ POR QUE PERFIL PERSISTENTE, e não copiar cookie (c_user/xs) para o fetch:
 *   - cookie copiado expira e quebra em silêncio, exatamente o modo de falha
 *     que a gente acabou de passar uma semana sem perceber;
 *   - o Facebook valida muito mais que o cookie (fingerprint, ordem de
 *     requisição, execução de JS). Um fetch com cookie parece o que é;
 *   - com perfil persistente o login acontece UMA vez, na mão, e dali em
 *     diante a sessão se renova sozinha como em qualquer navegador.
 *
 * ★ O stealth já estava no projeto e em uso pelo Mercado Livre
 * (`mercadoLivreService.ts`), com playwright-extra. Mesma receita aqui — não é
 * dependência nova.
 *
 * ⚠️⚠️ USE UMA CONTA DEDICADA, NUNCA A PESSOAL DO GUSTAVO.
 * Automação detectada restringe a conta. E a conta pessoal dele é a que está
 * nos grupos de freteiros — o outro canal de prospecção que ele quer explorar.
 * Perder as duas coisas de uma vez por economizar uma conta não compensa.
 *
 * Uso:
 *   npx tsx src/navegadorFacebook.ts login    → abre o navegador para logar
 *   npx tsx src/navegadorFacebook.ts testar   → confirma que a sessão está de pé
 */
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { BrowserContext, Page } from "playwright";
import path from "node:path";

chromium.use(StealthPlugin());

/**
 * Onde mora a sessão. Fora do repo de propósito: é CREDENCIAL, não código, e
 * não pode entrar em commit nem em backup de projeto.
 */
export const PASTA_SESSAO =
  process.env.FB_PERFIL ?? "C:\\claude\\fb-sessao-py";

/** Marcas de que o Facebook devolveu o muro em vez da listagem. */
const RX_MURO_LOGIN = /CAAFetaManualLoginRenderer|\/login\/\?next=|login_form/i;

let contexto: BrowserContext | null = null;

export async function abrirContexto(headless = true): Promise<BrowserContext> {
  if (contexto) return contexto;
  contexto = await chromium.launchPersistentContext(PASTA_SESSAO, {
    headless,
    viewport: { width: 1366, height: 900 },
    locale: "es-PY",
    timezoneId: "America/Asuncion",
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });
  return contexto;
}

export async function fecharContexto(): Promise<void> {
  if (contexto) { await contexto.close().catch(() => {}); contexto = null; }
}

export class SessaoExpirada extends Error {
  constructor() {
    super(
      "O Facebook devolveu o muro de login. A sessão do perfil caiu ou nunca " +
      "foi criada. Rode:  npx tsx src/navegadorFacebook.ts login"
    );
    this.name = "SessaoExpirada";
  }
}

/**
 * Baixa o HTML de uma URL já logado.
 *
 * ⚠️ Espera a REDE aquietar, não um seletor. O Marketplace monta a lista por
 * GraphQL depois do primeiro paint: ler o HTML cedo demais devolve a casca e
 * zero anúncio — que era, por outro caminho, o mesmo "0 na página" de antes.
 */
export async function baixarLogado(url: string, esperaMs = 2500): Promise<string> {
  const ctx = await abrirContexto(true);
  const page: Page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(esperaMs);
    const html = await page.content();
    if (RX_MURO_LOGIN.test(html) || /\/login\//.test(page.url())) throw new SessaoExpirada();
    return html;
  } finally {
    await page.close().catch(() => {});
  }
}

/** A sessão está de pé? Usado pelo cron para falhar ALTO em vez de salvar zero. */
export async function sessaoValida(): Promise<boolean> {
  try {
    const html = await baixarLogado("https://www.facebook.com/marketplace/", 1500);
    return !RX_MURO_LOGIN.test(html);
  } catch { return false; }
}

// ───────────────────────────── linha de comando ─────────────────────────────
const comando = process.argv[2];

if (comando === "login") {
  (async () => {
    console.log("Abrindo o navegador. Faça o login do Facebook na janela e feche-a quando terminar.");
    console.log("⚠️ Use uma conta DEDICADA, não a sua pessoal.\n");
    console.log("perfil:", PASTA_SESSAO, "\n");
    const ctx = await abrirContexto(false);
    const page = await ctx.newPage();
    await page.goto("https://www.facebook.com/login/", { waitUntil: "domcontentloaded" });
    await page.waitForEvent("close", { timeout: 0 });   // espera você fechar a aba
    await fecharContexto();
    console.log("\nSessão gravada. Confira com:  npx tsx src/navegadorFacebook.ts testar");
  })();
} else if (comando === "testar") {
  (async () => {
    const url = process.argv[3] ??
      "https://www.facebook.com/marketplace/108383999186596/carros/?exact=0&locale=es_LA";
    try {
      const html = await baixarLogado(url);
      const ids = [...new Set([...html.matchAll(/marketplace\/item\/(\d{8,})/g)].map((m) => m[1]))];
      console.log(`✅ sessão viva · ${html.length} bytes · ${ids.length} anúncio(s) na página`);
      if (ids.length) console.log("   exemplos:", ids.slice(0, 5).join(", "));
      else console.log("   ⚠️ logado, mas a página não trouxe anúncio — conferir a URL da praça.");
    } catch (e) {
      console.error("❌", (e as Error).message);
      process.exitCode = 1;
    } finally { await fecharContexto(); }
  })();
}
