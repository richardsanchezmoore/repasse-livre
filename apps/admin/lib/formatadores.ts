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

/**
 * Frescor do anúncio pra destacar MOVIMENTO logo abaixo da cidade (decisão do
 * usuário — a data no rodapé passava despercebida e gerava dúvida de "anúncio
 * velho"). Regras: <10h → "Anunciado há X horas" (relativo, mostra recência);
 * hoje mas ≥10h → "Hoje às HH:MM"; dias anteriores → padrão existente.
 */
export function formatarPublicacaoRelativa(dataIso: string): string {
  const data = new Date(dataIso);
  const agora = new Date();
  const ehHoje =
    data.toLocaleDateString("pt-BR", { timeZone: FUSO_HORARIO }) ===
    agora.toLocaleDateString("pt-BR", { timeZone: FUSO_HORARIO });
  if (!ehHoje) return `Anunciado em ${formatarDataCaptura(dataIso)}`;

  const horas = (agora.getTime() - data.getTime()) / 3_600_000;
  if (horas < 10) {
    if (horas < 1) return "Anunciado há menos de 1 hora";
    const h = Math.floor(horas);
    return `Anunciado há ${h} ${h === 1 ? "hora" : "horas"}`;
  }
  const horario = data.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO_HORARIO });
  return `Hoje às ${horario}`;
}
