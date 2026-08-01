import { notFound, redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { usuariaAtual } from "@/lib/auth";
import { carregarEsquema } from "@/lib/dossieDb";
import DossieFluxo from "@/components/DossieFluxo";

export const dynamic = "force-dynamic";

export default async function FichaDossie({ params }) {
  const user = await usuariaAtual();
  if (!user) redirect(`/entrar?redirect=/dossie/${params.id}`);

  const sb = await criarSupabaseServer();
  const [{ data: dossie }, esquema, regrasRes, cfgRes, respRes] = await Promise.all([
    sb.from("corte_dossies").select("id, nome, emblema, avatar, igreja").eq("id", params.id).maybeSingle(),
    carregarEsquema(sb),
    sb.from("corte_regras").select("*").eq("ativo", true).order("ordem"),
    sb.from("corte_config").select("valor").eq("chave", "veredito_faixas").maybeSingle(),
    sb.from("corte_respostas").select("campo_id, valor").eq("dossie_id", params.id).not("campo_id", "is", null),
  ]);
  if (!dossie) notFound();

  const valores = {};
  for (const r of respRes.data || []) valores[r.campo_id] = r.valor;
  const faixas = Array.isArray(cfgRes.data?.valor) ? cfgRes.data.valor : [];

  return (
    <DossieFluxo
      dossie={dossie}
      esquema={esquema}
      valoresIniciais={valores}
      regras={regrasRes.data || []}
      faixas={faixas}
    />
  );
}
