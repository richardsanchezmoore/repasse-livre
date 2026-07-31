import { exigirAdmin } from "@/lib/admin";
import { carregarEsquema } from "@/lib/dossieDb";
import ConstrutorDossie from "@/components/ConstrutorDossie";

export const dynamic = "force-dynamic";

export default async function AdminDossiePage() {
  const { sb } = await exigirAdmin();
  const esquema = await carregarEsquema(sb, { incluirInativos: true });
  return (
    <main className="screen">
      <div className="eyebrow">◈ Construtor do Dossiê ◈</div>
      <h1 className="h-title">As <em>etapas</em> & campos</h1>
      <p className="h-sub">Monte as perguntas. Arraste pelo ⠿ para reordenar — tudo aparece no app automaticamente.</p>
      <div style={{ marginTop: 16 }}>
        <ConstrutorDossie esquema={esquema} />
      </div>
    </main>
  );
}
