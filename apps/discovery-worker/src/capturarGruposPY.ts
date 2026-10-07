import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { lerProcedencia, ehAnuncioDeCompra, mencionaTroca } from "./precoParaguai.js";
import { acharPrecoEmTexto } from "./precoTextoLivrePY.js";
import { normalizarVeiculoPY } from "./modeloParaguai.js";

chromium.use(StealthPlugin());

/**
 * CAPTAÇÃO DE GRUPOS DO FACEBOOK — Paraguai.
 *
 * ★★ POR QUE EXISTE (pedido do Gustavo, 05/10/2026): "tem muita tradição de
 * publicação direta no Grupo". Publicação em grupo NÃO vira anúncio de
 * Marketplace automaticamente — é fonte separada, e o grupo "autitos baratitos"
 * sozinho tem 149,2 mil membros.
 *
 * ═══════ O QUE FOI MEDIDO ANTES DE ESCREVER ISTO (06/10/2026) ═══════
 *
 * Quatro tentativas minhas falharam, e cada fracasso virou uma regra aqui:
 *
 * 1. `"message":{"text":...}` no HTML → só pega o PRIMEIRO lote. Os posts
 *    seguintes chegam por GraphQL e vão direto para o DOM.
 *
 * 2. `[role="article"]` → devolve COMENTÁRIO, não post. No Facebook comentário
 *    também é article (todos com botão "Responder"). Colhi 20 "posts" e todos
 *    eram gente respondendo.
 *
 * 3. Colher no FIM da rolagem → devolve quase nada. ⚠️ O feed é VIRTUALIZADO:
 *    contando a cada passo deu 2, 2, 2, 0, 3, 2, 4, 0 enquanto a altura ia de
 *    1.979 a 22.656px. O Facebook REMOVE do DOM o post que sai da tela. Tem que
 *    ACUMULAR a cada rolagem.
 *
 * 4. Ler `innerText` cru → vem afogado em "Facebook Facebook Facebook…", que é
 *    o ALT das imagens. Num grupo de carros quase todo post é foto, então o
 *    ruído domina: 457 chars brutos viraram 53 úteis.
 *
 * ★ O que funciona: filhos diretos de `[role="feed"]`, limpando o alt das
 *   imagens, acumulando a cada rolagem.
 *
 * ⚠️ E um detalhe que custou meia hora: um painel de NOTIFICAÇÕES abre sozinho
 *   e segura o feed em esqueleto. `Escape` resolve.
 *
 * ═══════ POR QUE GRAVA EM JSON E NÃO NO BANCO ═══════
 * O projeto Supabase está cortado por `exceed_egress_quota`. Gravar em disco
 * mantém a coleta andando enquanto o banco não volta; a importação é depois.
 */

/** Um post de grupo, já interpretado. */
export interface AnuncioGrupo {
  grupo: string;
  /** Permalink do post. ⚠️ Null quando o card não expôs o <a> — sem ele o
   *  anúncio não é clicável e não tem chave estável anti-duplicata. */
  link: string | null;
  autor: string | null;
  quando: string | null;
  texto: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  preco: number | null;
  moeda: "PYG" | "USD" | null;
  confianca: string | null;
  procedencia: string | null;
  aceitaTroca: boolean;
  /** Por que foi descartado, quando foi. */
  descarte: string | null;
}

/**
 * ⚠️ O grupo é classificado, não concessionária: vende-se película, pneu,
 * guincho e serviço no meio dos carros. Sem este corte, a tabela de preço come
 * "Gs. 150.000" de uma película como se fosse carro.
 */
const RX_NAO_E_CARRO =
  /\b(polarizad|pel[ií]cula|l[aá]mina|cer[aá]mic|alarma|llanta|cubierta|neum[aá]tic|aceite|lubricant|repuesto|accesori|gr[uú]a|remolque|lavader|tapiceria|sonido|parlante|seguro|cr[eé]dito|pr[eé]stamo|alquil|flete)/i;

/** O rodapé que o Facebook cola em todo post e não é conteúdo. */
const RX_RODAPE =
  /\b(ver mais|ver tradu[cç][aã]o|comente como|todas as rea[cç][oõ]es|curtir|comentar|compartilhar|responder)\b/gi;

function limparPost(bruto: string): string {
  return bruto
    .replace(/(?:Facebook\s*)+/g, " ")   // alt das imagens
    .replace(RX_RODAPE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Katerin Aguiar há ± um minuto · TOYOTA FUNCARGO…" → autor, quando, corpo. */
function partirCabecalho(texto: string): { autor: string | null; quando: string | null; corpo: string } {
  const m = texto.match(/^(.{3,40}?)\s+(h[aá]\s[^·]{2,24}|\d+\s?(?:min|h|d|sem)\b[^·]{0,10})·?\s*(.*)$/s);
  if (m) return { autor: m[1].trim(), quando: m[2].trim(), corpo: m[3].trim() };
  const n = texto.match(/^(.{3,40}?)\s*·\s*(.*)$/s);
  return n ? { autor: n[1].trim(), quando: null, corpo: n[2].trim() } : { autor: null, quando: null, corpo: texto };
}

export function interpretarPost(grupo: string, bruto: string, link: string | null = null): AnuncioGrupo {
  const texto = limparPost(bruto);
  const { autor, quando, corpo } = partirCabecalho(texto);

  const base: AnuncioGrupo = {
    grupo, link, autor, quando, texto: corpo,
    marca: null, modelo: null, ano: null, preco: null, moeda: null,
    confianca: null, procedencia: null, aceitaTroca: false, descarte: null,
  };

  if (corpo.length < 15) return { ...base, descarte: "curto_demais" };
  if (RX_NAO_E_CARRO.test(corpo)) return { ...base, descarte: "nao_e_carro" };
  if (ehAnuncioDeCompra(corpo, "")) return { ...base, descarte: "procura_nao_oferta" };

  // ⚠️ NÃO dá para reusar o leitor do Marketplace aqui: lá o preço vem num
  // CAMPO, e aqui está no meio da frase. Passar o texto inteiro para ele deu
  // lixo medido — "USD 200.818", "PYG 102.318,435" — números colados.
  // precoTextoLivrePY sabe ler "43MILLONES", "28.750.000gs" e ignorar celular.
  const preco = acharPrecoEmTexto(corpo);
  const veic = normalizarVeiculoPY(corpo);

  if (!preco) return { ...base, marca: veic.marca, modelo: veic.modelo, ano: veic.ano, descarte: "sem_preco" };
  if (!veic.modelo) return { ...base, preco: preco.valor, moeda: preco.moeda, descarte: "modelo_desconhecido" };

  return {
    ...base,
    marca: veic.marca, modelo: veic.modelo, ano: veic.ano ?? null,
    preco: preco.valor, moeda: preco.moeda,
    confianca: preco.como,
    procedencia: lerProcedencia(corpo),
    aceitaTroca: mencionaTroca(corpo, ""),
    descarte: null,
  };
}

// ───────────────────────────── a varredura ─────────────────────────────────

const GRUPOS: { nome: string; url: string }[] = [
  { nome: "autitos baratitos", url: "https://www.facebook.com/groups/522751401231608" },
  { nome: "Aiyellow CDE", url: "https://www.facebook.com/groups/aiyellowpyciudaddeleste" },
];

const ROLAGENS = Number(process.env.GRUPO_ROLAGENS ?? 25);
const PAUSA_MS = Number(process.env.GRUPO_PAUSA_MS ?? 3500);
const SAIDA = process.env.GRUPO_SAIDA ?? "C:/claude/backup-autoradar/grupos";

async function main() {
  fs.mkdirSync(SAIDA, { recursive: true });
  const ctx = await chromium.launchPersistentContext("C:/claude/fb-sessao-py", {
    headless: true,
    viewport: { width: 1366, height: 900 },
    locale: "es-PY",
    timezoneId: "America/Asuncion",
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  for (const g of GRUPOS) {
    const page = await ctx.newPage();
    try {
      await page.goto(g.url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(5000);
      // ⚠️ O painel de notificações segura o feed em esqueleto.
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(1500);

      const acumulado = new Map<string, { texto: string; link: string | null }>();
      for (let i = 0; i <= ROLAGENS; i++) {
        if (i > 0) {
          await page.mouse.wheel(0, 3000);
          await page.waitForTimeout(PAUSA_MS);
        }
        // ★ Pega o PERMALINK junto com o texto. Sem ele o anúncio entra na base
        // sem ser clicável, e `link_origem` — que é a chave anti-duplicata — não
        // teria valor estável. O link do post vive num <a> para
        // /groups/<id>/posts/<idPost> dentro do próprio card.
        const lote = await page.evaluate(() => {
          const feed = document.querySelector('[role="feed"]');
          if (!feed) return [] as { texto: string; link: string | null }[];
          return [...feed.children].map((f) => {
            const el = f as HTMLElement;
            const a = [...el.querySelectorAll("a[href]")]
              .map((x) => (x as HTMLAnchorElement).href)
              .find((h) => /\/groups\/[^/]+\/(posts|permalink)\/\d+/.test(h));
            return { texto: el.innerText ?? "", link: a ? a.split("?")[0] : null };
          }).filter((x) => x.texto.length > 40);
        });
        // ⚠️ A chave do Set é o TEXTO: o mesmo post pode aparecer com e sem link
        // conforme o momento da rolagem, e eu quero guardar a versão COM link.
        for (const p of lote) {
          const anterior = acumulado.get(p.texto);
          if (!anterior || (!anterior && p.link) || (anterior && !anterior.link && p.link)) {
            acumulado.set(p.texto, p);
          }
        }
      }

      const interpretados = [...acumulado.values()].map((p) => interpretarPost(g.nome, p.texto, p.link));
      const bons = interpretados.filter((a) => !a.descarte);
      const porMotivo: Record<string, number> = {};
      for (const a of interpretados) if (a.descarte) porMotivo[a.descarte] = (porMotivo[a.descarte] ?? 0) + 1;

      const arquivo = path.join(SAIDA, `${g.nome.replace(/\W+/g, "-").toLowerCase()}.json`);
      fs.writeFileSync(arquivo, JSON.stringify(interpretados, null, 1));

      console.log(`\n▶ ${g.nome}`);
      const comLink = [...acumulado.values()].filter((p) => p.link).length;
      console.log(`   ${acumulado.size} posts colhidos (${comLink} com link) · ${bons.length} com preço E modelo`);
      console.log(`   descartes: ${Object.entries(porMotivo).map(([k, v]) => `${k}=${v}`).join(" · ") || "nenhum"}`);
      for (const a of bons.slice(0, 5)) {
        console.log(`     ✓ ${String(a.marca ?? "?")} ${String(a.modelo)} ${a.ano ?? ""} — ${a.moeda} ${Number(a.preco).toLocaleString("es-PY")}`);
      }
    } catch (e) {
      console.log(`\n▶ ${g.nome}\n   ✗ ${(e as Error).message.slice(0, 120)}`);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await ctx.close();
  console.log(`\nJSON em ${SAIDA}`);
}

main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
