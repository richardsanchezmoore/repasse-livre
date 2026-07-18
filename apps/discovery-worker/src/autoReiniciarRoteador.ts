import { supabase, registrarEventoReinicioRoteador } from "./supabaseClient.js";
import { reiniciarRoteador } from "./reiniciarRoteador.js";

/**
 * GATILHO AUTOMÁTICO DO REBOOT — chamado pelo mercadoLivreMain quando uma run do ML
 * termina BLOQUEADA (IP fichado no account-verification).
 *
 * Regra do user (17/07): 1 bloqueio é aceitável (o próximo ciclo tenta; o IP às vezes
 * gira sozinho). **2 seguidos** = o IP está fichado de verdade → reinicia o roteador
 * pra pegar IP novo (mecanismo provado: 177.133 → 191.255, ver a memória do ML).
 *
 * Três travas, todas necessárias:
 *  1. BLOQUEIOS: só age com ≥2 runs do ML bloqueadas EM SEQUÊNCIA (lê do discovery_runs,
 *     a run atual já incluída — o main registra o erro ANTES de chamar isto).
 *  2. JANELA LIVRE (opção 1 acordada): reboot derruba a internet e cortaria uma captação
 *     em andamento; a grade do FB quase sempre tem alguém rodando. Espera até nenhuma run
 *     FB estar `em_andamento` (poll curto, timeout). A run do ML já acabou (bloqueada), então
 *     não é ela que trava. Se a janela não abrir no tempo, ADIA — o próximo ciclo tenta.
 *  3. ANTI-LOOP: no máximo 1 reboot por episódio. Se já reiniciou nas últimas ~90 min
 *     (< 1 ciclo do ML de 2h), NÃO reinicia de novo — evita loop se o IP novo também vier
 *     fichado (raro). Registra o timestamp em worker_config.ML_ULTIMO_REBOOT.
 */

const CHAVE_ULTIMO_REBOOT = "ML_ULTIMO_REBOOT";
const BLOQUEIOS_PARA_REINICIAR = 2;
const ANTI_LOOP_MS = 90 * 60_000; // 90 min: menos que o ciclo do ML (2h), mais que o reboot+reconexão
const JANELA_TIMEOUT_MS = 12 * 60_000; // espera no máx. 12 min por uma janela livre de FB
const JANELA_POLL_MS = 20_000;
const FB_EM_ANDAMENTO_FRESCO_MS = 15 * 60_000; // run FB iniciada há < 15 min = captando de verdade (não zumbi)

/** Quantas runs do ML terminaram BLOQUEADO em sequência (parando no 1º não-bloqueio). */
async function bloqueiosConsecutivosMl(): Promise<number> {
  const { data, error } = await supabase
    .from("discovery_runs")
    .select("status, erro_mensagem, categoria_url, iniciado_em")
    .ilike("categoria_url", "%mercadolivre%")
    .order("iniciado_em", { ascending: false })
    .limit(10);
  if (error || !data) return 0;

  let n = 0;
  for (const r of data) {
    const bloqueada = r.status === "erro" && /BLOQUEADO/i.test(r.erro_mensagem ?? "");
    if (bloqueada) n++;
    else break; // sequência quebrou
  }
  return n;
}

/** Há alguma run de FB em andamento (captando agora)? Zumbis (>15min) não contam. */
async function fbCaptandoAgora(): Promise<boolean> {
  const desde = new Date(Date.now() - FB_EM_ANDAMENTO_FRESCO_MS).toISOString();
  const { data } = await supabase
    .from("discovery_runs")
    .select("id")
    .eq("status", "em_andamento")
    .ilike("categoria_url", "%facebook%")
    .gte("iniciado_em", desde)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function ultimoRebootMs(): Promise<number> {
  const { data } = await supabase.from("worker_config").select("valor").eq("chave", CHAVE_ULTIMO_REBOOT).maybeSingle();
  const t = Date.parse(data?.valor ?? "");
  return Number.isFinite(t) ? t : 0;
}

async function marcarReboot(): Promise<void> {
  await supabase
    .from("worker_config")
    .upsert({ chave: CHAVE_ULTIMO_REBOOT, valor: new Date().toISOString() }, { onConflict: "chave" });
}

/**
 * IP público ANTES do reboot (o que está fichado). Best-effort: sem proxy (é o IP
 * residencial real), timeout curto; se falhar, retorna null e o registro segue sem
 * o IP. O IP DEPOIS não dá pra capturar aqui — a internet cai no reboot e só volta
 * minutos depois; o próximo ciclo do ML é que prova a troca.
 */
async function capturarIpPublico(): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const resp = await fetch("https://api.ipify.org?format=text", { signal: ctrl.signal });
    clearTimeout(t);
    if (!resp.ok) return null;
    const ip = (await resp.text()).trim();
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) ? ip : null;
  } catch {
    return null;
  }
}

/**
 * Decide e executa. Chamado pelo ML após registrar a run como bloqueada.
 * Best-effort: qualquer erro aqui é logado e engolido — NUNCA derruba o worker.
 * `agora` é injetável só pra teste; em produção usa o relógio.
 */
export async function autoReiniciarRoteador(agora: number = Date.now()): Promise<void> {
  const P = "[auto-roteador]";
  try {
    const bloqueios = await bloqueiosConsecutivosMl();
    if (bloqueios < BLOQUEIOS_PARA_REINICIAR) {
      console.log(`${P} ${bloqueios} bloqueio(s) consecutivo(s) — abaixo de ${BLOQUEIOS_PARA_REINICIAR}, aguardo o próximo ciclo.`);
      return;
    }

    // Anti-loop: já reiniciei há pouco? Então o IP novo também está fichado (raro) — não
    // adianta reiniciar de novo. Deixa o próximo ciclo natural ou o alerta agirem.
    const desdeReboot = agora - (await ultimoRebootMs());
    if (desdeReboot < ANTI_LOOP_MS) {
      const min = Math.round(desdeReboot / 60_000);
      console.warn(`${P} ⚠ ${bloqueios} bloqueios, MAS já reiniciei há ${min} min — anti-loop. NÃO reinicio (o IP novo pode estar fichado; investigar).`);
      return;
    }

    console.log(`${P} ${bloqueios} bloqueios consecutivos → vou reiniciar o roteador. Aguardando janela livre do FB…`);

    // Janela livre: não cortar captação FB em andamento (opção 1).
    const limite = agora + JANELA_TIMEOUT_MS;
    while (await fbCaptandoAgora()) {
      if (Date.now() > limite) {
        console.warn(`${P} ⚠ janela do FB não abriu em ${JANELA_TIMEOUT_MS / 60_000} min — ADIO o reboot pro próximo ciclo do ML.`);
        return;
      }
      await new Promise((r) => setTimeout(r, JANELA_POLL_MS));
    }

    console.log(`${P} janela livre. Reiniciando o roteador…`);
    // Captura o IP fichado ANTES de derrubar a internet (best-effort, não bloqueia).
    const ipAntes = await capturarIpPublico();
    // Marca ANTES de reiniciar: a internet vai cair no meio do reboot; se marcasse depois,
    // a queda poderia impedir o registro e a trava anti-loop não pegaria.
    await marcarReboot();
    const r = await reiniciarRoteador(true);
    if (r.ok) console.log(`${P} ✅ roteador reiniciado. IP novo no ar em ~1-5 min; o próximo ciclo do ML deve passar.`);
    else console.error(`${P} ❌ reboot falhou: ${r.erro}. (timestamp já registrado; investigar manualmente)`);

    // Registra o evento na timeline do painel (aba ML) — sucesso OU falha. Best-effort:
    // roda logo após o POST de reboot, antes de a internet cair de fato (o Supabase é
    // externo; se a conexão já tiver caído, o erro é engolido lá dentro). Assim o admin
    // vê "aqui reiniciamos" e não confunde com queda real de internet.
    await registrarEventoReinicioRoteador(r.ok, bloqueios, r.erro ?? "", ipAntes);
  } catch (e) {
    // Best-effort: falha aqui não pode quebrar a run do ML (que já terminou de qualquer jeito).
    console.error(`${P} falha inesperada (ignorada):`, e instanceof Error ? e.message : e);
  }
}
