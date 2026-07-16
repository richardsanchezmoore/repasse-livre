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
 * velho"). Regras: <1h → "Anunciado há X minutos"; <10h → "Anunciado há X horas";
 * hoje mas ≥10h → "Hoje às HH:MM"; dias anteriores → padrão existente.
 *
 * Recebe `data_publicacao_origem ?? data_captura`. A precisão de minutos só é
 * verdadeira quando a origem preenche a publicação (FB dá creation_time; Webmotors,
 * create_date). Onde ela é null, o fallback é a data de CAPTURA e o texto vira, na
 * prática, "capturado há X" — impreciso quando o radar chega atrasado.
 */
export function formatarPublicacaoRelativa(dataIso: string): string {
  const data = new Date(dataIso);
  const agora = new Date();
  const ehHoje =
    data.toLocaleDateString("pt-BR", { timeZone: FUSO_HORARIO }) ===
    agora.toLocaleDateString("pt-BR", { timeZone: FUSO_HORARIO });
  if (!ehHoje) return `Anunciado em ${formatarDataCaptura(dataIso)}`;

  const minutos = (agora.getTime() - data.getTime()) / 60_000;
  const horas = minutos / 60;
  if (horas < 10) {
    // Abaixo de 1h, minuto a minuto (o FB dá essa precisão e ela é o auge do frescor:
    // "há 12 minutos" é sinal de chegar antes da concorrência; "menos de 1 hora" jogava
    // isso fora). <1min vira "agora mesmo" pra não exibir "há 0 minutos".
    if (horas < 1) {
      const m = Math.floor(minutos);
      if (m < 1) return "Anunciado agora mesmo";
      return `Anunciado há ${m} ${m === 1 ? "minuto" : "minutos"}`;
    }
    const h = Math.floor(horas);
    return `Anunciado há ${h} ${h === 1 ? "hora" : "horas"}`;
  }
  const horario = data.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO_HORARIO });
  return `Hoje às ${horario}`;
}
