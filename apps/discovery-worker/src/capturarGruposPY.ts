import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
// ★ Reusa o MESMO navegador do resto do motor em vez de abrir o próprio.
// Antes este arquivo chamava chromium.launchPersistentContext direto, o que
// duplicava stealth, viewport e caminho de sessão — três lugares para errar
// quando o Facebook mudar alguma coisa, em vez de um.
import { abrirContexto, fecharContexto, sessaoValida } from "./navegadorFacebook.js";
import { supabase } from "./supabaseClient.js";
import { lerProcedencia, ehAnuncioDeCompra, mencionaTroca } from "./precoParaguai.js";
import { acharPrecoEmTexto } from "./precoTextoLivrePY.js";
import { normalizarVeiculoPY } from "./modeloParaguai.js";


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

/**
 * ★★ TEXTO OFUSCADO — medido em 08/10/2026, e explica o funil inteiro.
 *
 * 55 de 76 posts caíam em "sem preço". Fui ler os descartados e não eram posts
 * sem preço: eram ILEGÍVEIS —
 *
 *   "e͏ S͏ o͏ n͏ u͏ f͏ a͏ 7͏ ͏ u͏ 7͏ 3͏ m͏ 8͏ u͏ 0͏ 1͏ 2͏ l͏ 6͏ ͏ à͏ 5͏ 2͏ 5͏ f͏"
 *
 * ⚠️ É antiscraping do Facebook: caracteres reais intercalados com `U+034F`
 * (combining grapheme joiner) e letras-chamariz, montados por CSS para ficarem
 * certos na tela e embaralhados no `innerText`.
 *
 * ⚠️⚠️ NÃO DÁ PARA DESEMBARALHAR daqui, e tentar seria pior: um palpite sobre
 * qual caractere é real produziria modelo e preço inventados, que é o veneno
 * exato desta base. O certo é RECONHECER e contar à parte — assim o relatório
 * para de dizer "sem preço" para 55 posts e passa a dizer a verdade.
 */
const RX_ZERO_WIDTH = /[͏​-‏⁠﻿­]/g;

export function textoIlegivel(t: string): boolean {
  const limpo = t.replace(/\s+/g, "");
  if (limpo.length < 20) return false;
  // A assinatura: quase todo caractere isolado por espaço. Num texto normal a
  // média de letras por "palavra" é 4+; no ofuscado fica perto de 1.
  const palavras = t.trim().split(/\s+/);
  const media = limpo.length / Math.max(1, palavras.length);
  return palavras.length >= 20 && media < 1.6;
}

/** Elementos do feed que NÃO são post: controle de UI, notificação, barra lateral. */
const RX_NAO_E_POST =
  /^(classificar feed|indicador de status|.{0,40}comentou (nessa|nesta)|sugest|patrocinad|destaques? do grupo)/i;

export function naoEhPost(t: string): boolean {
  return RX_NAO_E_POST.test(t.trim());
}

function limparPost(bruto: string): string {
  return bruto
    // ★ NFKD primeiro: vendedor paraguaio escreve em Unicode matemático
    // ("𝓐𝓼𝓮𝓼𝓸𝓻𝓪 𝓭𝓮 𝓿𝓮𝓷𝓽𝓪𝓼") e nenhum regex nosso casa com isso. A
    // normalização traz de volta para ASCII sem perder nada.
    .normalize("NFKD")
    .replace(RX_ZERO_WIDTH, "")
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

  if (naoEhPost(texto)) return { ...base, descarte: "nao_e_post" };
  // ⚠️ Antes de qualquer leitura: texto ofuscado não é post sem preço, e
  // contá-lo como tal escondia 55 de 76 descartes atrás do rótulo errado.
  if (textoIlegivel(texto)) return { ...base, descarte: "texto_ofuscado" };
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

/**
 * ★★★ A TRAVA É A MESMA DA VARREDURA DE MARKETPLACE, de propósito.
 *
 * Medido em 07/10/2026: duas instâncias de Chrome no MESMO `user-data-dir`
 * brigam pelo diretório, e é assim que a sessão morre — andamos meses
 * culpando o Facebook por isso. Este extrator abre o mesmo perfil que a
 * captação de Marketplace, então tem que entrar na mesma fila.
 *
 * ⚠️ Sai com código 0 quando já há alguém rodando: é funcionamento normal da
 * trava, e exit≠0 encheria o histórico da tarefa agendada de falha vermelha.
 */
const ARQUIVO_TRAVA = "C:/claude/fb-sessao-py.lock";

function tomarTrava(): boolean {
  try {
    const { pid, inicio } = JSON.parse(fs.readFileSync(ARQUIVO_TRAVA, "utf8")) as { pid: number; inicio: string };
    let vivo = false;
    try { process.kill(pid, 0); vivo = true; } catch { vivo = false; }
    if (vivo && pid !== process.pid) {
      const horas = (Date.now() - new Date(inicio).getTime()) / 3_600_000;
      console.log(`⛔ já há uma varredura no perfil (pid ${pid}, há ${horas.toFixed(1)}h). Saindo.`);
      return false;
    }
  } catch {
    /* sem trava, ou arquivo torto: caminho livre */
  }
  fs.writeFileSync(ARQUIVO_TRAVA, JSON.stringify({ pid: process.pid, inicio: new Date().toISOString() }));
  return true;
}

function soltarTrava(): void {
  try {
    const { pid } = JSON.parse(fs.readFileSync(ARQUIVO_TRAVA, "utf8")) as { pid: number };
    if (pid === process.pid) fs.unlinkSync(ARQUIVO_TRAVA);
  } catch { /* já foi */ }
}

/**
 * ★★ GRAVA NO BANCO — mudança de 08/10/2026.
 *
 * Este extrator nasceu gravando só JSON, e o motivo estava escrito no
 * cabeçalho: o projeto Supabase estava cortado por `exceed_egress_quota`. ★ A
 * migração para o projeto novo resolveu isso, então a razão de ser do JSON
 * acabou — ele fica como artefato de depuração, não como destino.
 *
 * ⚠️⚠️ SÓ ENTRA POST COM PERMALINK. Sem link não existe chave estável, e sem
 * chave estável o mesmo post entra de novo a cada rodada — inflando a
 * contagem de ofertas de um modelo e, pior, puxando a mediana para o preço
 * que mais se repete. Post sem link fica no JSON e só.
 */
/**
 * ★★ CHAVE DE RESERVA quando o post não expõe permalink — 08/10/2026.
 *
 * ⚠️ MEDIDO e é grave: em "autitos baratitos" só 19 de 75 posts traziam o
 * `<a>` do permalink, e no "Aiyellow CDE" foram ZERO de 85. A regra antiga
 * ("sem link não entra") jogava fora 56 posts bons de um grupo e 85 do outro —
 * descartando por falta de CHAVE, não por falta de dado.
 *
 * ★ O texto do post é uma chave estável o bastante: o Facebook não o reescreve,
 * e o mesmo anúncio volta idêntico a cada rolagem. Um hash dele mais o grupo dá
 * uma chave determinística que sobrevive entre rodadas.
 *
 * ⚠️ O QUE SE PERDE, e por que vale: a chave não é clicável até o post. O link
 * guardado leva ao GRUPO, não ao anúncio. Para um site cujo produto é a
 * REFERÊNCIA DE PREÇO, perder o clique de 75% dos posts é muito menos grave que
 * perder o preço deles.
 *
 * ⚠️ Dois riscos, os dois cobertos: revendas que copiam o mesmo texto colidem
 * numa chave só — e isso é o comportamento certo, é uma oferta só; e post
 * editado vira registro novo, mas a mediana já colapsa por (preço, cidade), que
 * é a guarda contra contagem dupla. Ver referenciaPrecoPY.
 */
function chaveDoPost(a: AnuncioGrupo, grupoUrl: string): string {
  if (a.link) return a.link;
  // djb2: curto, determinístico e sem dependência — não precisa de criptografia,
  // precisa de estabilidade.
  let h = 5381;
  const base = `${a.grupo}|${a.texto}`;
  for (let i = 0; i < base.length; i++) h = ((h << 5) + h + base.charCodeAt(i)) | 0;
  return `${grupoUrl}#post-${(h >>> 0).toString(36)}`;
}

async function gravarNoBanco(anuncios: AnuncioGrupo[], grupoUrl: string): Promise<{ novos: number; repetidos: number; semLink: number }> {
  const semLink = anuncios.filter((a) => !a.link).length;
  // ★ Todos entram agora: quem não tem permalink ganha chave derivada do texto.
  const comLink = anuncios.map((a) => ({ ...a, link: chaveDoPost(a, grupoUrl) }));
  if (!comLink.length) return { novos: 0, repetidos: 0, semLink };

  const links = comLink.map((a) => a.link as string);
  const { data: existentes } = await supabase
    .from("opportunities")
    .select("link_origem")
    .in("link_origem", links);
  const ja = new Set((existentes ?? []).map((r) => String(r.link_origem)));

  const novos = comLink.filter((a) => !ja.has(a.link as string));
  if (!novos.length) return { novos: 0, repetidos: comLink.length, semLink };

  const linhas = novos.map((a) => ({
    fonte: "FACEBOOK_GRUPO",
    pais: "PY",
    link_origem: a.link,
    veiculo: [a.marca, a.modelo, a.ano].filter(Boolean).join(" "),
    veiculo_bruto: a.texto.slice(0, 300),
    marca: a.marca,
    modelo: a.modelo,
    ano: a.ano,
    preco: a.preco,
    moeda: a.moeda,
    descricao: a.texto,
    procedencia: a.procedencia,
    origem_tipo: "grupo",
    status: "descoberta",
    // ⚠️ Grupo não tem foto re-hospedada nem cidade: o post não expõe praça, e
    // inventar a do grupo seria afirmar o que não sabemos. Null é a resposta
    // honesta, e a referência de preço agrupa por modelo+ano, não por cidade.
    foto_principal: null,
    cidade: null,
    atributos_olx: {
      ...(a.aceitaTroca ? { aceita_troca: { label: "Aceita troca", value: "Sim" } } : {}),
      ...(a.confianca ? { confianca_moeda: { label: "Confiança da moeda", value: a.confianca } } : {}),
      origem_grupo: { label: "Grupo", value: a.grupo },
    },
  }));

  const { error } = await supabase.from("opportunities").upsert(linhas, { onConflict: "link_origem" });
  if (error) {
    console.log(`   ✗ gravação falhou: ${error.message}`);
    return { novos: 0, repetidos: comLink.length - novos.length, semLink };
  }
  return { novos: novos.length, repetidos: comLink.length - novos.length, semLink };
}

async function main() {
  if (!tomarTrava()) return;
  fs.mkdirSync(SAIDA, { recursive: true });

  // ⚠️ Mesma blindagem da captação de Marketplace: sessão caída vira
  // '0 posts' em todos os grupos com exit 0 — o log diz que rodou e só se
  // descobre dias depois olhando o banco vazio.
  if (!(await sessaoValida())) {
    console.log("❌ SESSÃO DO FACEBOOK CAÍDA — nada será capturado.");
    console.log("   Rode:  C:\\claude\\login-fb-py.cmd");
    process.exitCode = 2;
    return;
  }

  const ctx = await abrirContexto();
  let totalNovos = 0;

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
        // ⚠️ A chave do Set é o TEXTO: o mesmo post aparece com e sem link
        // conforme o momento da rolagem, e eu quero guardar a versão COM link.
        for (const p of lote) {
          const anterior = acumulado.get(p.texto);
          if (!anterior || (!anterior.link && p.link)) acumulado.set(p.texto, p);
        }
      }

      const interpretados = [...acumulado.values()].map((p) => interpretarPost(g.nome, p.texto, p.link));
      const bons = interpretados.filter((a) => !a.descarte);
      const porMotivo: Record<string, number> = {};
      for (const a of interpretados) if (a.descarte) porMotivo[a.descarte] = (porMotivo[a.descarte] ?? 0) + 1;

      const arquivo = path.join(SAIDA, `${g.nome.replace(/\W+/g, "-").toLowerCase()}.json`);
      fs.writeFileSync(arquivo, JSON.stringify(interpretados, null, 1));

      const r = await gravarNoBanco(bons, g.url);
      totalNovos += r.novos;

      console.log(`\n▶ ${g.nome}`);
      const comLink = [...acumulado.values()].filter((p) => p.link).length;
      console.log(`   ${acumulado.size} posts colhidos (${comLink} com link) · ${bons.length} com preço E modelo`);
      console.log(`   ★ ${r.novos} NOVOS no banco · ${r.repetidos} já tínhamos · ${r.semLink} sem permalink (chave derivada do texto)`);
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

  console.log(`\n=== ${totalNovos} anúncio(s) novo(s) de grupo no banco · JSON em ${SAIDA} ===`);
}

/**
 * ⚠️⚠️ SÓ RODA QUANDO É O ARQUIVO EXECUTADO, nunca quando é importado.
 *
 * Este arquivo é as duas coisas: script da varredura E módulo que exporta
 * `interpretarPost` para reprocessar o JSON já colhido. Sem esta guarda, um
 * `import { interpretarPost }` dispara `main()` — e eu descobri isso do pior
 * jeito em 08/10/2026, escrevendo um teste que só ia reler um JSON de disco e
 * acabou fazendo uma raspagem inteira no Facebook sem eu pedir.
 *
 * ⚠️ Numa conta que precisa ser preservada, raspagem acidental é exatamente o
 * tipo de coisa que não pode depender de eu lembrar.
 */
const ehEntrada = process.argv[1]?.replace(/\\/g, "/").endsWith("capturarGruposPY.ts");

if (ehEntrada) {
  main()
    .catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; })
    .finally(async () => {
      await fecharContexto().catch(() => {});
      soltarTrava();
    });
}
