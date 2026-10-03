import { NextResponse } from "next/server";
import { buscarCotacao } from "@/lib/moeda";

/**
 * Cotação do dia para o navegador.
 *
 * ★ Por que uma rota, e não buscar direto no componente: o card é client
 * component (tem favoritar, copiar link, estado) e não pode usar o fetch
 * cacheado do servidor. A rota é a ponte — o Next cacheia aqui, do lado de cá,
 * e o navegador faz UMA chamada por carregamento de página independente de
 * quantos cards existam.
 *
 * ⚠️ `revalidate 3600` nos dois lados (aqui e no s-maxage abaixo) é o que
 * mantém a gente longe da cota das APIs de câmbio — a AwesomeAPI já devolveu
 * 429 por excesso em 02/10, e foi por isso que ela virou reserva.
 */
export const revalidate = 3600;

export async function GET() {
  const cotacao = await buscarCotacao();
  if (!cotacao) {
    // Sem cotação a tela mostra só a moeda de origem. 503 e cache curto para
    // tentar de novo logo: preço sem conversão é incompleto, preço com
    // conversão errada é mentira.
    return NextResponse.json({ erro: "cotação indisponível" }, {
      status: 503,
      headers: { "cache-control": "public, s-maxage=120" },
    });
  }
  return NextResponse.json(cotacao, {
    headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
