/**
 * ★★ MEDE SE O ACESSO ANÔNIMO AO MARKETPLACE AGUENTA VOLUME.
 *
 * Achado em 21/10/2026: o Gustavo notou que dá para ler o Marketplace sem
 * login. Conferido — página de busca E página de anúncio devolvem HTTP 200
 * com o JSON inteiro, desde que os headers de Chrome vão completos (sem
 * `sec-ch-ua` / `sec-fetch-*` o Facebook responde 400).
 *
 * ⚠️ O QUE SE MEDE AQUI É UMA COISA SÓ: **onde a taxa cai**. A sessão logada
 * desaba da posição ~50 em diante (49% nas três primeiras visitas, 0,6%
 * acima de 50). Se o anônimo não tiver esse degrau, a captura pode sair da
 * sessão logada — e aí acabam de uma vez o risco para a conta, a trava de
 * PID do Playwright e o teto de ~50 visitas por volta.
 *
 * ⚠️⚠️ O QUE **NÃO** SE MEDE: a moeda. O `listing_price.currency` vem
 * "PYG" em 100% dos casos porque é a unidade do campo no Paraguai, não a
 * intenção de quem anunciou — há BMW X1 a "₲48.500" e BYD a "₲1". Quem
 * resolve moeda continua sendo o `lerPrecoComContexto`. Ver a memória
 * `project_auto_radar_preco_sem_moeda`.
 *
 * Uso:  N=300 PAUSA=1800 npx tsx src/medirAnonimoPY.ts
 */
import "dotenv/config";
import { fetch as undiciFetch } from "undici";
import { supabase } from "./supabaseClient.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * ⚠️ Esse conjunto é mínimo e não é enfeite: tirando `sec-ch-ua` ou os
 * `sec-fetch-*` o Facebook devolve HTTP 400 em vez da página.
 */
const HEADERS: Record<string, string> = {
  "user-agent": UA,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "es-PY,es;q=0.9,pt-BR;q=0.8",
  "sec-ch-ua": `"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"`,
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": `"Windows"`,
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
};

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PAUSA = Number(process.env.PAUSA ?? 1800);
const N = Number(process.env.N ?? 300);
const BLOCO = Number(process.env.BLOCO ?? 25);

type Bloco = { pos: string; comPreco: number; semPreco: number; httpRuim: number; erro: number };

async function main() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("link_origem")
    .eq("pais", "PY")
    .like("link_origem", "%/marketplace/item/%")
    .order("data_captura", { ascending: false })
    .limit(N);
  if (error) throw error;

  const ids = (data ?? [])
    .map((o: any) => String(o.link_origem).match(/item\/(\d+)/)?.[1])
    .filter(Boolean) as string[];

  console.log(`ANÔNIMO · ${ids.length} páginas de anúncio · pausa ${PAUSA}ms · bloco de ${BLOCO}`);
  console.log(`★ a pergunta é onde a taxa cai (logado desaba da posição ~50)\n`);

  const blocos: Bloco[] = [];
  for (let i = 0; i < ids.length; i += BLOCO) {
    const fatia = ids.slice(i, i + BLOCO);
    const b: Bloco = {
      pos: `${i + 1}-${i + fatia.length}`,
      comPreco: 0,
      semPreco: 0,
      httpRuim: 0,
      erro: 0,
    };
    for (const id of fatia) {
      try {
        const r = await undiciFetch(
          `https://www.facebook.com/marketplace/item/${id}/?locale=es_LA`,
          { headers: HEADERS },
        );
        if (!r.ok) {
          b.httpRuim++;
          await r.text().catch(() => "");
        } else {
          const html = await r.text();
          if (/"listing_price":\{/.test(html)) b.comPreco++;
          else b.semPreco++;
        }
      } catch {
        b.erro++;
      }
      await dormir(PAUSA);
    }
    const taxa = Math.round((b.comPreco / fatia.length) * 100);
    console.log(
      `  posição ${b.pos.padEnd(8)} → ${String(taxa).padStart(3)}%  ` +
        `(com ${b.comPreco}, sem ${b.semPreco}, http ruim ${b.httpRuim}, erro ${b.erro})`,
    );
    blocos.push(b);
  }

  const tot = blocos.reduce(
    (a, b) => ({
      comPreco: a.comPreco + b.comPreco,
      semPreco: a.semPreco + b.semPreco,
      httpRuim: a.httpRuim + b.httpRuim,
      erro: a.erro + b.erro,
    }),
    { comPreco: 0, semPreco: 0, httpRuim: 0, erro: 0 },
  );
  const visto = tot.comPreco + tot.semPreco + tot.httpRuim + tot.erro;

  /**
   * ⚠️ O veredito compara o PRIMEIRO terço com o ÚLTIMO. Uma média geral
   * esconderia justamente o degrau que interessa: 50 ótimas e 250 zeradas
   * ainda dariam 17% "razoável".
   */
  const terco = Math.max(1, Math.floor(blocos.length / 3));
  const media = (bs: Bloco[]) => {
    const c = bs.reduce((a, b) => a + b.comPreco, 0);
    const t = bs.reduce((a, b) => a + b.comPreco + b.semPreco + b.httpRuim + b.erro, 0);
    return t ? Math.round((c / t) * 100) : 0;
  };
  const inicio = media(blocos.slice(0, terco));
  const fim = media(blocos.slice(-terco));

  console.log(`\n★ ${visto} visitas: ${tot.comPreco} com preço · ${tot.semPreco} sem · ` +
    `${tot.httpRuim} http ruim · ${tot.erro} erro de rede`);
  console.log(`★ início ${inicio}%  →  fim ${fim}%`);
  if (fim >= inicio - 10) {
    console.log(`✓ NÃO caiu: o anônimo não tem o degrau da sessão logada.`);
  } else {
    console.log(`⚠️ CAIU ${inicio - fim} pontos — tem estrangulamento, medir onde começa.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
