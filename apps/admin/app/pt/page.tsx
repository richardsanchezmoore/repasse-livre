/**
 * VERSÃO EM PORTUGUÊS da home.
 *
 * ★★ Uma URL por idioma é o que faz o Google indexar os dois (ver o cabeçalho
 * de lib/idioma.ts). O conteúdo é o MESMO componente — duas cópias divergiriam
 * no primeiro ajuste de layout.
 *
 * ⚠️ A config de rota é declarada aqui de novo em vez de re-exportada: o Next
 * lê `dynamic`/`fetchCache` por análise estática, e re-export encadeado é
 * exatamente o caso que ele pode não enxergar.
 */
import { CentralDeOportunidades } from "@/components/CentralDeOportunidades";

export { generateMetadata } from "../page";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function Pagina(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <CentralDeOportunidades searchParams={props.searchParams as never} idioma="pt" />;
}
