import { headers } from "next/headers";
import { exigirAdmin } from "@/lib/admin";
import ConstrutorAssinaturas from "@/components/ConstrutorAssinaturas";

export const dynamic = "force-dynamic";

export default async function AdminAssinaturasPage() {
  const { sb } = await exigirAdmin();
  const { data: cfg } = await sb.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
  const planos = cfg?.valor || { kit: {}, assinatura: {} };

  const h = await headers();
  const host = h.get("host") || "localhost:3001";
  const proto = host.includes("localhost") ? "http" : "https";
  const webhook = `${proto}://${host}/api/cakto`;
  const salesUrl = `${proto}://${host}/assinar`;
  const secret = process.env.CORTE_CAKTO_SECRET || "DEFINA_CORTE_CAKTO_SECRET";

  return (
    <main className="screen">
      <div className="eyebrow">◈ Assinaturas ◈</div>
      <h1 className="h-title">Planos & <em>acessos</em></h1>
      <p className="h-sub">Defina o Kit e a assinatura, e ligue o webhook da Cakto que libera o acesso sozinho.</p>
      <div style={{ marginTop: 16 }}>
        <ConstrutorAssinaturas planosIniciais={planos} webhook={webhook} secret={secret} salesUrl={salesUrl} />
      </div>
    </main>
  );
}
