import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Script de teste pontual (não integrado ao motor de descoberta ainda) para
 * validar se a Webmotors é acessível com o mesmo truque de TLS fingerprint
 * usado na OLX (curl_chrome116), antes de decidir se vale construir um
 * scraper completo. Roda só manualmente via Railway CLI, no ambiente do
 * worker (onde curl_chrome116 e o proxy já existem) — local não tem
 * curl_chrome116 instalado.
 */
async function buscarHtml(url: string): Promise<string> {
  const args = ["-s", "-i", "-H", "Referer: https://www.webmotors.com.br/"];

  if (process.env.PROXY_URL) {
    args.push("-x", process.env.PROXY_URL);
  }

  args.push(url);

  const { stdout } = await execFileAsync("curl_chrome116", args, { maxBuffer: 1024 * 1024 * 20 });
  return stdout;
}

/**
 * Apaga o filtro "Abaixo da Fipe" pelo nome visível na UI
 * (`name="switch-Abaixo da Fipe"`, reportado pelo usuário), e não pela URL
 * já preenchida (`Oportunidades=Super Preco`) — mesma lógica de
 * resolverChaveFiltroFipe na OLX: ler a definição do filtro embutida na
 * página em vez de fixar a chave/valor no código, para sobreviver a uma
 * eventual renomeação futura.
 */
function localizarDefinicaoDoFiltro(html: string): string | null {
  const marcadores = ["Abaixo da Fipe", "Abaixo da FIPE", "switch-Abaixo da Fipe"];
  for (const marcador of marcadores) {
    const idx = html.indexOf(marcador);
    if (idx !== -1) {
      return html.slice(Math.max(0, idx - 300), idx + 300);
    }
  }
  return null;
}

async function main(): Promise<void> {
  const url = "https://www.webmotors.com.br/carros/estoque?tipoveiculo=carros";
  console.log(`[teste-webmotors] Buscando: ${url}`);

  const respostaCompleta = await buscarHtml(url);
  const [cabecalho, ...resto] = respostaCompleta.split(/\r?\n\r?\n/);
  const html = resto.join("\n\n");

  console.log("[teste-webmotors] Cabeçalhos da resposta:");
  console.log(cabecalho);
  console.log(`[teste-webmotors] Tamanho do HTML: ${html.length} bytes`);

  const temNextData = html.includes("__NEXT_DATA__");
  console.log(`[teste-webmotors] Contém __NEXT_DATA__: ${temNextData}`);

  const trechoFiltro = localizarDefinicaoDoFiltro(html);
  if (trechoFiltro) {
    console.log("[teste-webmotors] Trecho ao redor da definição do filtro 'Abaixo da Fipe':");
    console.log(trechoFiltro);
  } else {
    console.log("[teste-webmotors] Não achou 'Abaixo da Fipe' no HTML retornado (pode estar em JSON carregado via JS, não no HTML inicial).");
  }

  console.log("[teste-webmotors] Primeiros 1000 caracteres do HTML (diagnóstico geral):");
  console.log(html.slice(0, 1000));
}

main().catch((erro) => {
  console.error("[teste-webmotors] Falha:", erro);
  process.exitCode = 1;
});
