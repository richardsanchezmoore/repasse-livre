"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/dossie", label: "Dossiê" },
  { href: "/admin/veredito", label: "Veredito" },
  { href: "/admin/materiais", label: "Materiais" },
  { href: "/admin/membros", label: "Membros" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/assinaturas", label: "Assinaturas" },
];

export default function AdminTabs() {
  const path = usePathname();
  return (
    <nav className="adm-tabs">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={path.startsWith(t.href) ? "on" : ""}>{t.label}</Link>
      ))}
    </nav>
  );
}
