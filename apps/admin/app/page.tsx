import { DiscoveriesBoard } from "@/components/DiscoveriesBoard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function CentralDeOportunidadesPage() {
  return (
    <main className="pagina">
      <h1>Central de oportunidades</h1>
      <DiscoveriesBoard />
    </main>
  );
}
