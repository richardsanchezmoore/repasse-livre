"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", ic: "👑", label: "Início" },
  { href: "/dossie", ic: "🗂️", label: "Dossiê" },
  { href: "/biblioteca", ic: "📖", label: "Biblioteca" },
  { href: "/perfil", ic: "🎀", label: "Perfil" },
];

export default function BottomNav() {
  const path = usePathname();
  if (path.startsWith("/admin")) return null; // painel admin tem navegação própria
  const active = (href) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className="nav">
      {ITEMS.map((it) => (
        <Link key={it.href} href={it.href} className={active(it.href) ? "on" : ""}>
          <span className="ni">{it.ic}</span>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
