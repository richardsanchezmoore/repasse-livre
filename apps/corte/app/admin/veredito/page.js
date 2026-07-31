import { exigirAdmin } from "@/lib/admin";
import { carregarEsquema } from "@/lib/dossieDb";
import ConstrutorVeredito from "@/components/ConstrutorVeredito";

export const dynamic = "force-dynamic";

export default async function AdminVereditoPage() {
  const { sb } = await exigirAdmin();
  const [esquema, regrasRes, cfgRes] = await Promise.all([
    carregarEsquema(sb, { incluirInativos: true }),
    sb.from("corte_regras").select("*").order("ordem"),
    sb.from("corte_config").select("valor").eq("chave", "veredito_faixas").maybeSingle(),
  ]);
  const campos = esquema.flatMap((e) => e.campos.map((c) => ({ id: c.id, rotulo: c.rotulo, tipo: c.tipo, config: c.config, etapaTitulo: e.titulo })));
  const faixas = Array.isArray(cfgRes.data?.valor) ? cfgRes.data.valor : [];

  return (
    <main className="screen">
      <div className="eyebrow">◈ O Veredito ◈</div>
      <h1 className="h-title">As <em>regras</em> do parecer</h1>
      <p className="h-sub">Defina o que cada resposta significa — por pontuação (faixas) e por regra crua (mensagem por campo). O app cruza tudo sozinho no Dossiê.</p>
      <div style={{ marginTop: 16 }}>
        <ConstrutorVeredito campos={campos} regras={regrasRes.data || []} faixasIniciais={faixas} />
      </div>
    </main>
  );
}
