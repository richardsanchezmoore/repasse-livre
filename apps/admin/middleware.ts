import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * ═══ TRANCA DO SITE (Gustavo, 07/10/2026) ═══
 *
 * ★ O PEDIDO: *"não queria seguir montando o Auto Radar PY no domínio do
 * Repasse Livre... podíamos fazer um bloqueio de acesso à página principal,
 * colocando login, assim só eu vejo"* — e, logo depois: *"pensei em já migrar o
 * domínio, mas agora ainda não, só trancar acesso já resolve"*.
 *
 * ⚠️ POR QUE SENHA ÚNICA E NÃO O LOGIN DO SUPABASE: o site tem usuários
 * cadastrados da era Brasil. Exigir "estar logado" deixaria qualquer um deles
 * entrar — o oposto de "só eu vejo". E o login depende do Supabase Auth, que já
 * nos deu 504 no middleware quando estrangulou; a tranca não pode depender dele.
 *
 * ⚠️ FALHA FECHADA: SITE_TRANCADO=1 sem SITE_SENHA barra todo mundo, inclusive
 * ele. É de propósito — senha vazia caindo para "site aberto" deixaria o site
 * público por causa de um typo, em silêncio, que é exatamente o que não pode.
 *
 * Desligar é SITE_TRANCADO=0 (ou apagar a env). Não há nada mais a desfazer.
 */
const TRANCADO = process.env.SITE_TRANCADO === "1";

/**
 * ⚠️ ROTAS QUE FALAM COM MÁQUINA FICAM FORA DA TRANCA.
 *
 * Elas não têm navegador para digitar senha, e cada uma já se defende com
 * segredo próprio: os crons exigem `Authorization: Bearer $CRON_SECRET`
 * (fail-closed lá também) e os webhooks validam assinatura do gateway.
 *
 * ⚠️ Trancar estas seria derrubar o faturamento e a publicação automática sem
 * nenhum erro visível — o Vercel Cron e a Ticto só veriam 401 e desistiriam.
 */
const FORA_DA_TRANCA = ["/api/cron/", "/api/webhooks/", "/api/alertas/"];

/** Comparação de tamanho fixo: não vaza o tamanho da senha pelo tempo de resposta. */
function senhaConfere(recebida: string, esperada: string): boolean {
  if (recebida.length !== esperada.length) return false;
  let dif = 0;
  for (let i = 0; i < esperada.length; i++) dif |= recebida.charCodeAt(i) ^ esperada.charCodeAt(i);
  return dif === 0;
}

/** Devolve a resposta que BARRA, ou null quando pode passar. */
function tranca(request: NextRequest): NextResponse | null {
  if (!TRANCADO) return null;

  const caminho = request.nextUrl.pathname;
  if (FORA_DA_TRANCA.some((p) => caminho.startsWith(p))) return null;

  const esperada = process.env.SITE_SENHA ?? "";
  const cabecalho = request.headers.get("authorization") ?? "";

  if (esperada && cabecalho.startsWith("Basic ")) {
    try {
      // atob existe no Edge; o formato é "usuario:senha" e o usuário é ignorado.
      const cru = atob(cabecalho.slice(6));
      const senha = cru.slice(cru.indexOf(":") + 1);
      if (senhaConfere(senha, esperada)) return null;
    } catch {
      /* base64 torto = tentativa inválida, cai no 401 abaixo */
    }
  }

  return new NextResponse("Acesso restrito.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Auto Radar", charset="UTF-8"',
      // ⚠️ sem isto a CDN pode guardar o 401 e servi-lo depois de autenticado.
      "Cache-Control": "no-store",
    },
  });
}
/**
 * Cookie de sessão do Supabase: `sb-<ref>-auth-token` (pode vir fatiado em
 * `.0`/`.1` quando é grande). Sem NENHUM deles, não existe sessão pra renovar.
 */
function temCookieDeSessao(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name));
}

// Renova o cookie de sessão a cada request — padrão oficial do @supabase/ssr
// para Next.js App Router (sem isso, o cookie expira e o usuário é
// deslogado mesmo navegando ativamente).
export async function middleware(request: NextRequest) {
  // ★ A TRANCA VEM PRIMEIRO, antes de qualquer ida ao Supabase: quem não passa
  // não deve nem custar uma chamada de rede.
  const barrado = tranca(request);
  if (barrado) return barrado;

  // ★ VISITANTE ANÔNIMO SAI CEDO. Sem cookie de sessão não há o que renovar, e o
  // `getUser()` abaixo é uma CHAMADA DE REDE ao Supabase Auth — paga em toda
  // requisição. O tráfego público é dominado por robô (sitemap com ~10 mil URLs,
  // ~9,5 mil delas páginas de produto), então isso era uma ida ao Supabase por
  // rastreio, pra renovar sessão inexistente.
  // NÃO confundir com o custo de CPU da Vercel: isto aqui é Edge; a Active CPU que
  // estourou o Hobby vem do SSR das páginas (force-dynamic). Ver o plano de ISR.
  if (!temCookieDeSessao(request)) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaSetar) {
          cookiesParaSetar.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesParaSetar.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Blindagem: se o Supabase estiver lento/estrangulado (ex.: Disk IO no limite),
  // NÃO deixamos o middleware travar e derrubar o site (504 MIDDLEWARE_INVOCATION_TIMEOUT).
  // Corre contra um timeout curto; se estourar, segue sem renovar a sessão neste request.
  try {
    await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("supabase_timeout")), 2500)),
    ]);
  } catch {
    /* banco lento/indisponível — a página renderiza; a sessão é renovada no próximo request */
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
