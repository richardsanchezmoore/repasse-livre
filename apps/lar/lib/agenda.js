import { criarSupabaseServer } from "./supabaseServer";

const CORES = ["#8a5a9e", "#4e8a5f", "#c08a2e", "#b0543a", "#5a7d8c", "#9e5a5a", "#7c9a3e"];

/** Membros da família com cor/avatar (da família já cadastrada) — pro seletor "quem". */
export function membrosDaFamilia(familia) {
  const m = [{ chave: "mae", nome: familia?.nome_mae || "Você", cor: "#bd5f42", avatar: "👩" }];
  if (familia?.marido_nome) m.push({ chave: "marido", nome: familia.marido_nome, cor: "#3f6f9e", avatar: "👨" });
  (familia?.filhos || []).forEach((f, i) => {
    if (f?.nome) m.push({ chave: "filho" + i, nome: f.nome, cor: CORES[i % CORES.length], avatar: "🧒" });
  });
  m.push({ chave: "casa", nome: "A casa toda", cor: "#6f8264", avatar: "🏠" });
  return m;
}

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Eventos numa janela de N dias a partir de hoje (expande os "semanais"). */
export async function eventosNaJanela(userId, dias = 21) {
  if (!userId) return [];
  const sb = await criarSupabaseServer();
  const { data } = await sb.from("lar_agenda").select("*").eq("user_id", userId);
  const eventos = data || [];
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const fim = new Date(hoje); fim.setDate(fim.getDate() + dias);
  const out = [];
  for (const e of eventos) {
    const base = new Date(e.data + "T00:00:00");
    if (e.repete === "semanal") {
      const wd = base.getDay();
      const d = new Date(hoje);
      while (d.getDay() !== wd) d.setDate(d.getDate() + 1);
      for (; d <= fim; d.setDate(d.getDate() + 7)) {
        if (d >= base) out.push({ ...e, data: iso(d), _repetido: true });
      }
    } else if (base >= hoje && base <= fim) {
      out.push(e);
    }
  }
  out.sort((a, b) => (a.data + (a.hora || "99")).localeCompare(b.data + (b.hora || "99")));
  return out;
}

/** Só os de hoje (pro card Hoje). */
export async function eventosDeHoje(userId) {
  const hojeIso = iso(new Date());
  return (await eventosNaJanela(userId, 1)).filter((e) => e.data === hojeIso);
}
