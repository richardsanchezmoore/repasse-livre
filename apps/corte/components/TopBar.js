"use client";
import { usePathname } from "next/navigation";

export default function TopBar() {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;
  if (path === "/assinar") return null; // landing pública standalone
  if (path.startsWith("/dossie/") && path !== "/dossie/novo") return null; // fluxo imersivo
  return <header className="top"><span className="brand">◈ A Corte ◈</span></header>;
}
