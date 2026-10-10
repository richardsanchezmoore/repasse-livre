/**
 * VERSAO EM PORTUGUES — re-export fino da pagina em espanhol.
 *
 * ★★ Uma URL por idioma e o que faz o Google indexar os dois (ver o
 * cabecalho de lib/idioma.ts). O conteudo e o MESMO componente: o idioma sai
 * do caminho, nao de um arquivo paralelo — duas copias divergiriam no
 * primeiro ajuste de layout.
 *
 * ⚠️ A config de rota e declarada aqui de novo em vez de re-exportada: o
 * Next le `dynamic`/`revalidate` por analise estatica, e re-export encadeado
 * e exatamente o caso que ele pode nao enxergar.
 */
export { default, generateMetadata } from "../../../../../carros/[cidadeUf]/[slug]/[modelo]/page";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
