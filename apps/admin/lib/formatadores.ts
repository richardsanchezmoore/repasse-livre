export function formatarMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return "—";
  return km.toLocaleString("pt-BR");
}

// Fuso fixo (em vez de depender do fuso de quem renderiza) — sem isso, o
// texto sai diferente entre o servidor (Vercel roda em UTC) e o navegador
// (horário de Brasília), e o React trava com erro de hidratação porque o
// texto do server não bate com o do cliente.
const FUSO_HORARIO = "America/Sao_Paulo";

export function formatarDataCaptura(dataIso: string): string {
  const data = new Date(dataIso);
  const horario = data.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO_HORARIO });
  const hoje = new Date();
  const ehHoje =
    data.toLocaleDateString("pt-BR", { timeZone: FUSO_HORARIO }) ===
    hoje.toLocaleDateString("pt-BR", { timeZone: FUSO_HORARIO });

  if (ehHoje) return `Hoje, ${horario}`;
  return `${data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO_HORARIO })}, ${horario}`;
}
