import Link from "next/link";
import { Files, FileText } from "lucide-react";

/**
 * Seletor Páginas | Blog no topo das telas de conteúdo. Separa visualmente as duas
 * áreas e permite alternar. `ativa` marca a tela atual (passado pelo server component).
 */
export function ConteudoTabs({ ativa }: { ativa: "paginas" | "blog" }) {
  return (
    <nav className="cms-tabs">
      <Link href="/conteudo/paginas" className={`cms-tab ${ativa === "paginas" ? "cms-tab-ativa" : ""}`}>
        <Files size={16} /> Páginas
      </Link>
      <Link href="/conteudo" className={`cms-tab ${ativa === "blog" ? "cms-tab-ativa" : ""}`}>
        <FileText size={16} /> Blog
      </Link>
    </nav>
  );
}
