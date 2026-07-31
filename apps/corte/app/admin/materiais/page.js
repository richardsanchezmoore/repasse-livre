import { exigirAdmin } from "@/lib/admin";
import ConstrutorMateriais from "@/components/ConstrutorMateriais";

export const dynamic = "force-dynamic";

export default async function AdminMateriais() {
  const { sb } = await exigirAdmin();
  const { data: materiais } = await sb.from("corte_materiais").select("*").order("ordem");
  return (
    <main className="screen">
      <div className="eyebrow">◈ Materiais ◈</div>
      <h1 className="h-title">A <em>Biblioteca</em></h1>
      <p className="h-sub">Publique o Panfleto, os bônus e devocionais. Tudo aparece no acervo do app.</p>
      <div style={{ marginTop: 16 }}>
        <ConstrutorMateriais materiais={materiais || []} />
      </div>
    </main>
  );
}
