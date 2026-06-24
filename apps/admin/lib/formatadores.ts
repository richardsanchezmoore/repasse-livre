export function formatarMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return "—";
  return km.toLocaleString("pt-BR");
}

export function formatarDataCaptura(dataIso: string): string {
  const data = new Date(dataIso);
  const horario = data.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const hoje = new Date();
  const ehHoje =
    data.getDate() === hoje.getDate() &&
    data.getMonth() === hoje.getMonth() &&
    data.getFullYear() === hoje.getFullYear();

  if (ehHoje) return `Hoje, ${horario}`;
  return `${data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit" })}, ${horario}`;
}
