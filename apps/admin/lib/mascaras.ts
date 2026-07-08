export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function formatarMoeda(digitos: string): string {
  if (!digitos) return "";
  return Number(digitos).toLocaleString("pt-BR");
}

export function formatarWhatsapp(digitos: string): string {
  const d = digitos.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Telefones em descrições captadas de outras plataformas (OLX etc.) não devem
// aparecer aqui — só nossos anunciantes (inserção direta) têm contato exposto.
// Duas regras, porque o anunciante escreve de tudo:
//
// 1) COM DDD (10-11 díg, +55 opcional): "21 99999-8888", "(21) 99999.8888",
//    "21- 96489-6082" (traço + espaço). Separadores `[\s.-]*` (zero ou mais)
//    toleram os espaços/pontos/traços extras que a versão antiga (`?`) perdia.
// 2) SEM DDD (8-9 díg): "984995626", "98499-5626", "3428-9008" — celular/fixo
//    escrito sem o DDD, muito comum depois de "Wpp"/"contato".
//
// Lookbehind/lookahead `(?<!\d)`/`(?!\d)` impedem casar no meio de um número
// maior (CNPJ, CEP, renavam). As faixas das duas regras são mescladas antes de
// cortar o texto (a com-DDD, mais longa, absorve a sem-DDD quando se sobrepõem).
const REGEX_COM_DDD = /(?<!\d)(?:\+?55[\s.-]*)?\(?\d{2}\)?[\s.-]*9?\d{4}[\s.-]*\d{4}(?!\d)/g;
const REGEX_SEM_DDD = /(?<!\d)9?\d{4}[\s.-]?\d{4}(?!\d)/g;

export type SegmentoDescricao = { tipo: "texto" | "telefone"; valor: string };

// Coleta as faixas [início, fim) de telefone das duas regras, filtra por
// contagem de dígitos plausível e mescla as sobrepostas/adjacentes.
// Um match de 8 dígitos "AAAA AAAA" onde as duas metades são anos plausíveis
// (1990-2099) é lista de anos-modelo ("modelo 2017 2018"), não um fixo.
function ehListaDeAnos(digitos: string): boolean {
  if (digitos.length !== 8) return false;
  const a = Number(digitos.slice(0, 4));
  const b = Number(digitos.slice(4));
  return a >= 1990 && a <= 2099 && b >= 1990 && b <= 2099;
}

function faixasTelefone(texto: string): Array<[number, number]> {
  const faixas: Array<[number, number]> = [];
  const coletar = (regex: RegExp, minDig: number, maxDig: number) => {
    for (const match of texto.matchAll(regex)) {
      const digitos = apenasDigitos(match[0]);
      if (digitos.length < minDig || digitos.length > maxDig) continue;
      if (ehListaDeAnos(digitos)) continue;
      const inicio = match.index ?? 0;
      faixas.push([inicio, inicio + match[0].length]);
    }
  };
  coletar(REGEX_COM_DDD, 10, 13);
  coletar(REGEX_SEM_DDD, 8, 9);

  faixas.sort((a, b) => a[0] - b[0]);
  const mescladas: Array<[number, number]> = [];
  for (const [ini, fim] of faixas) {
    const ultima = mescladas[mescladas.length - 1];
    if (ultima && ini <= ultima[1]) ultima[1] = Math.max(ultima[1], fim);
    else mescladas.push([ini, fim]);
  }
  return mescladas;
}

export function ocultarTelefonesNaDescricao(texto: string): SegmentoDescricao[] {
  const segmentos: SegmentoDescricao[] = [];
  let ultimoIndice = 0;

  for (const [inicio, fim] of faixasTelefone(texto)) {
    if (inicio > ultimoIndice) {
      segmentos.push({ tipo: "texto", valor: texto.slice(ultimoIndice, inicio) });
    }
    segmentos.push({ tipo: "telefone", valor: texto.slice(inicio, fim) });
    ultimoIndice = fim;
  }

  if (ultimoIndice < texto.length) {
    segmentos.push({ tipo: "texto", valor: texto.slice(ultimoIndice) });
  }

  return segmentos;
}
