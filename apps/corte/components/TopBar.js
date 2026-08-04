"use client";
import { usePathname } from "next/navigation";

export default function TopBar() {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;
  if (path === "/assinar" || path === "/bem-vinda") return null; // landings públicas standalone
  if (path === "/quiz" || path === "/investigar") return null; // quiz imersivo / funil público
  if (path.startsWith("/dossie/") && path !== "/dossie/novo") return null; // fluxo imersivo
  return <header className="top"><span className="brand">◈ Damas Virtuosas ◈</span></header>;
}
