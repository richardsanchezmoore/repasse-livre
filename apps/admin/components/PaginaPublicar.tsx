import Link from "next/link";
import { Search, ListOrdered, Users, ArrowRight } from "lucide-react";
import { t, IDIOMA_PADRAO, type Idioma } from "@/lib/idioma";
import { buscarTotalVitrine, buscarCidadesCobertas } from "@/lib/kpisTopo";

/**
 * ★★★ A PÁGINA DE ANUNCIAR DO PARAGUAI.
 *
 * ⚠️⚠️ O botão "Publicar" do topo levava para `/vender`, que é a landing
 * BRASILEIRA da era Repasse Livre: fala de FIPE, está em português e vende a
 * inserção paga. Um paraguaio clicando em "Publicar" caía nisso.
 *
 * ★ A orientação do Gustavo (16/10/2026) foi clara sobre o que NÃO fazer
 * agora: *"por ora não precisamos vender a inserção"*. E sobre o argumento,
 * que é dele e é bom justamente por ser verdadeiro:
 *
 * > *"vamos destacar o anunciar frisando que o Facebook é desorganizado,
 * > dificultando o achado do seu veículo, e aqui nos apresentamos a
 * > compradores em potencial... A maior vitrine organizada de veículos do
 * > Paraguay"*
 *
 * ★★ Os números da página saem do banco, não do texto. "A maior vitrine
 * organizada" é uma afirmação forte, e ela só se sustenta ao lado do acervo
 * real e das cidades cobertas — do contrário é a mesma promessa vazia que
 * fizemos questão de tirar dos KPIs do topo.
 */
export async function PaginaPublicar({ idioma = IDIOMA_PADRAO }: { idioma?: Idioma } = {}) {
  const tx = t(idioma);
  const [total, cidades] = await Promise.all([buscarTotalVitrine(), buscarCidadesCobertas()]);
  const milhar = (n: number) => n.toLocaleString("es-PY");
  const prefixo = idioma === "pt" ? "/pt" : "";

  const argumentos = [
    { icone: Search, titulo: tx("publicarArg1Titulo"), texto: tx("publicarArg1Texto") },
    { icone: ListOrdered, titulo: tx("publicarArg2Titulo"), texto: tx("publicarArg2Texto") },
    { icone: Users, titulo: tx("publicarArg3Titulo"), texto: tx("publicarArg3Texto") },
  ];

  return (
    <div className="publicar">
      <section className="publicar-topo">
        <h1 className="publicar-titulo">{tx("publicarTitulo")}</h1>
        <p className="publicar-sub">{tx("publicarSub")}</p>

        <div className="publicar-numeros">
          <span>
            <strong>{milhar(total)}</strong> {tx("publicarNumVeiculos")}
          </span>
          <span>
            <strong>{milhar(cidades)}</strong> {tx("publicarNumCidades")}
          </span>
        </div>

        {/* ⚠️ O CTA vai para /enviar, que exige conta. É de propósito: anúncio
            sem dono é anúncio que ninguém atualiza nem tira do ar. */}
        <Link href="/enviar" className="publicar-cta">
          {tx("publicarCta")} <ArrowRight size={16} strokeWidth={2.6} />
        </Link>
        <p className="publicar-gratis">{tx("publicarGratis")}</p>
      </section>

      <section className="publicar-argumentos">
        {argumentos.map(({ icone: Icone, titulo, texto }) => (
          <div key={titulo} className="publicar-argumento">
            <span className="publicar-argumento-icone" aria-hidden>
              <Icone size={20} strokeWidth={2} />
            </span>
            <h2>{titulo}</h2>
            <p>{texto}</p>
          </div>
        ))}
      </section>

      <section className="publicar-rodape-cta">
        <p>{tx("publicarFechamento")}</p>
        <Link href="/enviar" className="publicar-cta">
          {tx("publicarCta")} <ArrowRight size={16} strokeWidth={2.6} />
        </Link>
        <p className="publicar-tabela-dica">
          {tx("publicarTabelaDica")}{" "}
          <Link href={`${prefixo}/tabla`}>{tx("publicarTabelaLink")}</Link>
        </p>
      </section>
    </div>
  );
}
