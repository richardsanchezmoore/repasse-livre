/**
 * "Event spine" — dispara o enriquecimento (parecer do Copiloto + FUTURO:
 * matching de notificações) de um anúncio recém-detectado, chamando o endpoint
 * do admin por HTTP. Todos os motores (ML local, OLX/Webmotors na Railway)
 * passam pelo salvarOportunidade, então um gatilho ali cobre TODOS — sem tocar
 * em cada motor. A régua/engine vive só no admin (não duplicamos aqui).
 *
 * Best-effort e fail-open: sem ENRIQUECER_URL/SECRET, ou em falha/timeout, é
 * no-op — nunca derruba nem trava a captação. O batch gerar:pareceres é a rede
 * de segurança que reconcilia o que o tempo real não pegar.
 */

const URL_ENRIQUECER = process.env.ENRIQUECER_URL;
const SEGREDO = process.env.ENRIQUECER_SECRET;
const TIMEOUT_MS = 12_000;

export async function dispararEnriquecimento(linkOrigem: string, motivo: "novo" | "preco"): Promise<void> {
  if (!URL_ENRIQUECER || !SEGREDO) return; // não configurado → o batch cobre

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    await fetch(URL_ENRIQUECER, {
      method: "POST",
      headers: { "content-type": "application/json", "x-enriquecer-secret": SEGREDO },
      body: JSON.stringify({ link_origem: linkOrigem, motivo }),
      signal: ctrl.signal,
    });
  } catch {
    // best-effort: timeout/rede/endpoint fora → o batch reconcilia depois
  } finally {
    clearTimeout(timer);
  }
}
