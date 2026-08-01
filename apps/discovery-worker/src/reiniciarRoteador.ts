import "dotenv/config";
import { chromium } from "playwright";

/**
 * Reinicia o roteador Vivo Box (Askey RTF8115VW) via a interface web — o IP novo
 * é o que tira o ML do account-verification (fichamento de IP; ver a memória do ML).
 *
 * POR QUE PLAYWRIGHT E NÃO UM POST DIRETO: o firmware OFUSCA usuário e senha por
 * JavaScript client-side antes de enviar (`admin` sai como `~{rvq`). Replicar a cifra
 * seria frágil e obrigaria a manusear a credencial. O browser roda o JS do próprio
 * roteador — a gente só digita a senha REAL (do .env) nos campos e deixa ele ofuscar.
 *
 * MECANISMO (levantado no DevTools, 17/07):
 *  - login: POST /cgi-bin/te_acceso_router.cgi (campos loginUsername/loginPassword ofuscados).
 *  - reboot: o botão "Sim, Reiniciar" chama `POST /cgi-bin/cbReboot.xml?sessionKey=<sessionKey>`.
 *  - sessionKey = token anti-CSRF que MUDA a cada carregamento (`var sessionKey='...'` no HTML).
 *    Por isso lê o token fresco da página logada antes de postar; nunca um valor fixo.
 *
 * SEGURANÇA: a senha vive só em process.env.ROTEADOR_SENHA (no .env local do worker).
 * Este arquivo referencia a variável; nunca embute o valor.
 *
 * ⚠️ DRY-RUN POR PADRÃO: sem `--reiniciar`, só faz login e confirma — NÃO reinicia.
 * O reboot derruba a internet da casa por ~1-5 min; testar com o user acompanhando,
 * nunca às cegas. Uso: `npm run reiniciar:roteador` (teste) | `-- --reiniciar` (pra valer).
 */

const BASE = (process.env.ROTEADOR_URL ?? "http://192.168.15.1").replace(/\/$/, "");
const USUARIO = process.env.ROTEADOR_USUARIO ?? "admin";
const SENHA = process.env.ROTEADOR_SENHA ?? "";

export interface ResultadoReboot {
  ok: boolean;
  /** motivo da falha (login, sem senha, sessionKey ausente, http do reboot). */
  erro?: string;
}

/**
 * Loga no roteador e (se `reiniciar`) dispara o reboot. Reutilizável: o CLI abaixo e o
 * gatilho automático do ML (autoReiniciarRoteador) chamam esta função. Com `reiniciar:false`
 * é um dry-run (só valida a autenticação). Não chama process.exit — devolve o resultado.
 */
export async function reiniciarRoteador(reiniciar: boolean, tentativas = 3): Promise<ResultadoReboot> {
  if (!SENHA) return { ok: false, erro: "ROTEADOR_SENHA não definida no .env" };
  console.log(`[roteador] usuário="${USUARIO}" | senha lida do .env: ${SENHA.length} caracteres`);

  const nav = await chromium.launch({ headless: true });
  try {
    // O "senha inválida" costuma ser FALSO: o login.js ofusca lendo os EVENTOS de teclado e,
    // se algum keystroke se perde (handlers ainda não prontos / campo sem foco), a senha CERTA
    // vira uma cifra errada. Antes desistíamos na 1ª → ficávamos 4 sessões bloqueadas até
    // re-tentar. Agora PERSISTIMOS: contexto novo por tentativa, espera o JS inicializar, e
    // digitação mais lenta a cada retry.
    let ultimoErro = "login não tentado";
    for (let t = 1; t <= tentativas; t++) {
      const ctx = await nav.newContext();
      const page = await ctx.newPage();
      try {
        const delay = 45 + (t - 1) * 30; // 45ms, 75ms, 105ms…
        console.log(`[roteador] tentativa ${t}/${tentativas} — abrindo ${BASE}/login.asp (delay ${delay}ms/tecla)`);
        await page.goto(`${BASE}/login.asp`, { waitUntil: "domcontentloaded", timeout: 20_000 });
        await page.waitForTimeout(700); // deixa o login.js registrar os handlers de teclado

        const campoUser = page.locator('input[type="text"]:visible').first();
        const campoSenha = page.locator('input[type="password"]:visible').first();
        await campoUser.click({ timeout: 10_000 });
        await campoUser.fill("");
        await campoUser.pressSequentially(USUARIO, { delay });
        await campoSenha.click({ timeout: 10_000 });
        await campoSenha.fill("");
        await campoSenha.pressSequentially(SENHA, { delay });
        await Promise.allSettled([
          page.waitForNavigation({ timeout: 15_000 }),
          page.click("#btnLogin", { timeout: 5_000 }),
        ]);

        await page.goto(`${BASE}/device-management-resets.asp`, { waitUntil: "domcontentloaded", timeout: 20_000 });
        const html = await page.content();
        if (/login\.asp|não está Autenticado|name="loginPassword"/i.test(html)) {
          const aviso = html.match(/senha inv[áa]lida|incorret[ao]|bloquead|tentativas|não está Autenticado/i);
          ultimoErro = `login falhou (${aviso ? aviso[0] : "voltou pro login"})`;
          console.log(`[roteador] ⚠ tentativa ${t} falhou: ${ultimoErro}`);
          if (t === tentativas) await page.screenshot({ path: "C:/claude/_roteador-falha.png", fullPage: true }).catch(() => {});
          await ctx.close();
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        const m = html.match(/sessionKey\s*=\s*'(\d+)'/);
        if (!m) {
          ultimoErro = "autenticou mas não achei o sessionKey (firmware pode ter mudado)";
          await ctx.close();
          continue;
        }
        const sessionKey = m[1];
        console.log(`✅ LOGIN OK (tentativa ${t}) — sessionKey=${sessionKey}`);

        if (!reiniciar) {
          console.log("(dry-run) autenticação validada. NÃO reiniciei.");
          await ctx.close();
          return { ok: true };
        }
        console.log("↻ disparando reboot…");
        const r = await ctx.request.post(`${BASE}/cgi-bin/cbReboot.xml?sessionKey=${sessionKey}`, {
          headers: { Referer: `${BASE}/device-management-resets.asp` },
          timeout: 15_000,
        });
        console.log(`↻ reboot enviado — HTTP ${r.status()}. A internet deve cair e voltar em ~1-5 min.`);
        const okReboot = r.ok();
        await ctx.close();
        return okReboot ? { ok: true } : { ok: false, erro: `reboot devolveu HTTP ${r.status()}` };
      } catch (e) {
        ultimoErro = e instanceof Error ? e.message : String(e);
        console.log(`[roteador] ⚠ tentativa ${t} erro: ${ultimoErro}`);
        await ctx.close().catch(() => {});
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    return { ok: false, erro: `${tentativas} tentativa(s) de login falharam — ${ultimoErro}` };
  } finally {
    await nav.close();
  }
}

// ── CLI ────────────────────────────────────────────────────────────────────────
// Rodado direto (`npm run reiniciar:roteador` / run-roteador.cmd). DRY-RUN por padrão;
// `-- --reiniciar` reinicia de verdade. Só executa quando é o módulo de entrada.
const ehEntrada = process.argv[1]?.replace(/\\/g, "/").endsWith("reiniciarRoteador.ts");
if (ehEntrada) {
  reiniciarRoteador(process.argv.includes("--reiniciar"))
    .then((r) => {
      if (!r.ok) {
        console.error(`❌ ${r.erro}`);
        process.exit(2);
      }
      process.exit(0);
    })
    .catch((e) => {
      console.error("[roteador] falha:", e instanceof Error ? e.message : e);
      process.exit(1);
    });
}
