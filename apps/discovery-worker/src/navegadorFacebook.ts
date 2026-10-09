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

/**
 * ★★★ AUTOLOAD — rola a busca e colhe TUDO, não só o que vem na primeira carga.
 *
 * ⚠️⚠️ O PROBLEMA QUE ISTO RESOLVE, medido em 07–08/10/2026: a página devolve
 * **~13 ids** na carga inicial, e — isto é o que custou meio dia para eu
 * entender — **esses primeiros são os MENOS filtrados**.
 *
 * ★★★ A MEDIDA QUE INVERTEU TUDO. Faixa densa ₲30–45M em Ciudad del Este:
 *
 *     os 14 primeiros, SEM rolar  →  0 dentro da faixa, 6 fora
 *     os 361 que SÓ a rolagem deu →  7 de 8 DENTRO da faixa
 *
 * O Facebook enche o TOPO com sugestão e entrega o resultado filtrado conforme
 * se desce. Quem lê só a primeira carga está lendo recomendação, não busca.
 *
 * ⚠️ Eu havia concluído o contrário — que a rolagem "cancelava" o filtro — a
 * partir de uma amostra tirada de uma faixa ESCASSA (₲70–90M), onde quase tudo
 * é preenchimento. O Gustavo não aceitou a conclusão ("de prática de uso a
 * rolagem não cancela os filtros") e estava certo: faixa escassa é preenchida,
 * faixa densa é entregue de verdade — depois da rolagem.
 *
 * ★ Então faixa e rolagem andam JUNTAS. A faixa filtra, a rolagem alcança o que
 * foi filtrado.
 *
 * ★ E é o caminho para o MUTIRÃO que o Gustavo pediu (08/10): *"não adianta
 * esperar dia a dia, vamos perder muitos dias desnecessários, podemos utilizar
 * os inúmeros já publicados"*. A varredura diária pega ~4,3 anúncios novos por
 * rodada; o mercado já tem milhares publicados. O backlog é o caminho rápido
 * para a tabela ter massa.
 *
 * ═══ POR QUE LER DO DOM E NÃO DO HTML ═══
 *
 * ⚠️ Depois de rolar, o JSON do GraphQL NÃO acompanha: só o primeiro lote está
 * no `page.content()`. Os anúncios seguintes entram direto no DOM. Ler o HTML
 * depois da rolagem devolveria os mesmos 13 — foi exatamente assim que a
 * captação de grupos me enganou antes.
 *
 * ⚠️ E ACUMULA A CADA PASSO, porque a lista é VIRTUALIZADA: o Facebook remove
 * do DOM o que sai da tela. Colher só no fim devolve a última janela, não o
 * conjunto.
 *
 * ═══ A PARADA ANTECIPADA NÃO É OTIMIZAÇÃO ═══
 *
 * ⚠️ Quando duas rolagens seguidas não trazem id novo, o fim da lista chegou e
 * continuar rolando é só exposição a troco de nada — numa conta que precisa ser
 * preservada, isso importa mais que o tempo economizado.
 */
export async function coletarIdsComRolagem(
  url: string,
  rolagens = 20,
  pausaMs = 2200,
): Promise<string[]> {
  const ctx = await abrirContexto(true);
  const page: Page = await ctx.newPage();
  const vistos = new Set<string>();
  const ordem: string[] = [];
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const html = await page.content();
    if (RX_MURO_LOGIN.test(html) || /\/login\//.test(page.url())) throw new SessaoExpirada();

    // ⚠️ Um painel de notificações abre sozinho e segura a lista em esqueleto —
    // mordeu na captação de grupos e morderia aqui igual.
    await page.keyboard.press("Escape").catch(() => {});

    let secas = 0;
    let produziu = false;
    for (let i = 0; i <= rolagens; i++) {
      if (i > 0) {
        await page.mouse.wheel(0, 2800);
        // ⚠️⚠️ ROLAGEM SECA GANHA MAIS TEMPO, não menos. Medido em 08/10/2026:
        // com pausa de 1.500ms a colheita parou em 38 ids; com 2.200ms, 500. A
        // diferença de 700ms era a diferença entre 8% e 100% — e sem erro nenhum
        // no log, porque "parei de achar id novo" parece fim de lista.
        //
        // Então, quando um passo não traz nada, o seguinte espera o DOBRO antes
        // de desistir. Rede lenta e GraphQL demorado deixam de ser confundidos
        // com fim de lista, que é o jeito mais caro de errar aqui.
        await page.waitForTimeout(secas > 0 ? pausaMs * 2 : pausaMs);
      }
      const lote = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/marketplace/item/"]')]
          .map((a) => a.href.match(/\/marketplace\/item\/(\d+)/)?.[1])
          .filter((x): x is string => Boolean(x)),
      );
      const antes = vistos.size;
      for (const id of lote) if (!vistos.has(id)) { vistos.add(id); ordem.push(id); }
      const rendeu = vistos.size > antes;
      if (rendeu) produziu = true;
      secas = rendeu ? 0 : secas + 1;

      // ⚠️⚠️ A PARADA SÓ VALE DEPOIS DE UMA ROLAGEM PRODUTIVA — custou uma praça
      // inteira em 09/10/2026 para eu enxergar.
      //
      // Ciudad del Este, primeira praça do mutirão, devolveu 14 ids por faixa
      // (exatamente o número SEM rolagem) enquanto Asunción, na mesma execução e
      // com as mesmas opções, devolveu 502. A diferença estava no relógio: 38s
      // por faixa em CDE contra 90s em Asunción.
      //
      // ★ A causa: no ARRANQUE o navegador acabou de abrir e a grade ainda não
      // montou. As três primeiras rolagens não acham id novo — não porque a
      // lista acabou, mas porque ela ainda não existe — e a parada antecipada
      // encerrava ali. "Seca no começo" e "fim de lista" são indistinguíveis
      // para o contador, e o preço de confundi-los é perder a praça em silêncio.
      //
      // Enquanto nada rendeu, as rolagens secas não contam: o laço vai até o
      // limite de `rolagens`, que já é o teto de paciência.
      if (produziu && secas >= 3) break;
    }
    return ordem;
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * ★★★ DE ONDE ESTAMOS SAINDO? — guarda de IP, 09/10/2026.
 *
 * ⚠️⚠️ ACONTECEU: no meio de um reprocesso, o IP de saída virou **Miami,
 * Flórida, ASN M247** — provedor de VPN. O Proton do Gustavo sobe sozinho, e
 * ninguém percebeu até eu conferir por outro motivo.
 *
 * Três coisas se somam e nenhuma é pequena:
 *   · IP de DATACENTER leva muro do Facebook — é por isso que esta captação
 *     roda local, no residencial, e não na Railway;
 *   · a sessão era PARAGUAIA e saltou para os EUA no meio de uma raspagem,
 *     que é o padrão clássico de conta comprometida;
 *   · M247 é ASN de VPN muito marcado.
 *
 * ★ Então a captação confere antes de começar. Numa conta que precisa ser
 * preservada, parar é mais barato que continuar — e o Gustavo deixa a máquina
 * ligada horas a fio, sem ninguém olhando.
 *
 * ⚠️ FALHA ABERTA de propósito: se o serviço de IP não responder, a captação
 * SEGUE. A guarda existe contra VPN ligada por engano, não contra rede
 * instável; travar tudo porque um endpoint de terceiro caiu seria trocar um
 * risco raro por uma parada garantida.
 */
export async function saidaEhParaguai(): Promise<{ ok: boolean; onde: string } | null> {
  try {
    const r = await fetch("https://ipinfo.io/json", { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { ip?: string; country?: string; city?: string; org?: string };
    const onde = `${j.city ?? "?"}/${j.country ?? "?"} · ${j.org ?? "?"} · ${j.ip ?? "?"}`;
    return { ok: j.country === "PY", onde };
  } catch {
    return null; // sem resposta → não bloqueia
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
