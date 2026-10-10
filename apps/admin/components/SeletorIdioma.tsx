"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { IDIOMAS, caminhoNoIdioma, idiomaDoCaminho, t } from "@/lib/idioma";
import { BandeiraDoIdioma } from "./Bandeira";

/**
 * BANDEIRAS FIXAS NO TOPO — espanhol e português, sempre visíveis.
 *
 * ★★ O PEDIDO (Gustavo, 10/10/2026): *"pode ficar com 'bandeiras' fixa no topbar
 * para sempre o usuário visualizar com facilidade onde trocar idioma"*. Fixo e
 * não dentro de um menu: duas bandeiras custam 40px e tiram a dúvida de onde se
 * troca, que é o problema real.
 *
 * ★★★ SÃO LINKS DE VERDADE, NÃO BOTÃO COM `onClick`. Isso é o que faz o site ser
 * indexado nos dois idiomas: `<a href="/pt/...">` é rastreável, o Google segue e
 * descobre a versão em português. Um botão que troca texto em JavaScript deixaria
 * UMA URL com dois conteúdos — o idioma não indexado era a preocupação dele, e é
 * exatamente aqui que ela se resolve (ver o cabeçalho de `lib/idioma.ts`).
 *
 * ⚠️ `hreflang` em cada link: diz ao Google que são traduções uma da outra, não
 * conteúdo duplicado. Sem isso as duas versões competem entre si.
 *
 * ⚠️ A QUERY VAI JUNTO. Trocar de idioma numa listagem filtrada (`?marca=toyota`)
 * e cair na home sem filtro é perder o lugar — e a pessoa culparia o site, não a
 * tradução.
 */
export function SeletorIdioma() {
  const caminho = usePathname();
  const params = useSearchParams();
  const atual = idiomaDoCaminho(caminho);
  const busca = params.toString();
  const tx = t(atual);

  return (
    <div className="seletor-idioma" role="group" aria-label={tx("trocarIdioma")}>
      {IDIOMAS.map((i) => {
        const destino = caminhoNoIdioma(caminho, i.codigo) + (busca ? `?${busca}` : "");
        const ativo = i.codigo === atual;
        return (
          <Link
            key={i.codigo}
            href={destino}
            hrefLang={i.codigo}
            className={`seletor-idioma-bandeira${ativo ? " ativo" : ""}`}
            aria-current={ativo ? "true" : undefined}
            title={i.nome}
            // ★ O nome fica no aria-label porque bandeira sozinha não é lida por
            // leitor de tela — e emoji de bandeira é lido como "Paraguai", não
            // como "espanhol".
            aria-label={i.nome}
          >
            <BandeiraDoIdioma codigo={i.codigo} tamanho={19} />
          </Link>
        );
      })}
    </div>
  );
}
