import Link from "next/link";
import { exigirAdmin } from "@/lib/admin";
import AdminTabs from "@/components/AdminTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel · A Corte" };

export default async function AdminLayout({ children }) {
  await exigirAdmin();
  return (
    <div className="adm">
      <div className="adm-top">
        <span className="adm-brand">✦ Painel · A Corte</span>
        <Link href="/" className="adm-sair">sair →</Link>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
