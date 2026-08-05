"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", ic: "🏠", label: "Início" },
  { href: "/cozinha", ic: "🍳", label: "Cozinha" },
  { href: "/casa", ic: "🧹", label: "Casa" },
  { href: "/filhos", ic: "🧒", label: "Família" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="nav">
      {ITENS.map((i) => {
        const on = i.href === "/" ? path === "/" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={on ? "on" : ""}>
            <span className="ni">{i.ic}</span>{i.label}
          </Link>
        );
      })}
    </nav>
  );
}
