// Clusters de REGIÃO/METRÓPOLE por estado — agrupam cidades vizinhas pra o filtro
// do front (quem é de São José dos Pinhais também quer ver Curitiba). Os nomes de
// cidade batem com o que está salvo em opportunities.cidade (validado nos dados);
// o filtro usa ilike (case-insensitive), então variações de caixa ("do"/"Do") não
// quebram. Cidades fora de qualquer região continuam acháveis pelo filtro de cidade.
//
// Manutenção: é só editar/estender este mapa. Ordem = prioridade de exibição.

export interface Regiao {
  nome: string;
  uf: string;
  cidades: string[];
}

export const REGIOES: Regiao[] = [
  // ===== PARANÁ =====
  {
    nome: "Grande Curitiba",
    uf: "PR",
    cidades: [
      "Curitiba", "São José dos Pinhais", "Colombo", "Pinhais", "Araucária", "Campo Largo",
      "Fazenda Rio Grande", "Piraquara", "Campina Grande do Sul", "Quatro Barras", "Almirante Tamandaré",
    ],
  },
  { nome: "Londrina e região", uf: "PR", cidades: ["Londrina", "Cambé", "Ibiporã", "Rolândia", "Arapongas", "Apucarana"] },
  { nome: "Maringá e região", uf: "PR", cidades: ["Maringá", "Sarandi", "Paiçandu", "Cianorte"] },
  { nome: "Ponta Grossa", uf: "PR", cidades: ["Ponta Grossa", "Castro"] },
  { nome: "Cascavel e Oeste", uf: "PR", cidades: ["Cascavel", "Toledo", "Foz do Iguaçu", "Assis Chateaubriand"] },

  // ===== RIO GRANDE DO SUL =====
  {
    nome: "Grande Porto Alegre",
    uf: "RS",
    cidades: [
      "Porto Alegre", "Canoas", "Novo Hamburgo", "São Leopoldo", "Gravataí", "Viamão", "Cachoeirinha",
      "Sapucaia do Sul", "Guaíba", "Alvorada", "Esteio", "Sapiranga", "Dois Irmãos", "Ivoti", "Montenegro", "Taquara",
    ],
  },
  { nome: "Serra Gaúcha", uf: "RS", cidades: ["Caxias do Sul", "Bento Gonçalves", "Farroupilha", "Garibaldi", "Marau"] },
  { nome: "Pelotas e Rio Grande", uf: "RS", cidades: ["Pelotas", "Rio Grande", "Canguçu"] },
  { nome: "Santa Maria", uf: "RS", cidades: ["Santa Maria", "São Pedro do Sul", "Agudo"] },
  { nome: "Passo Fundo", uf: "RS", cidades: ["Passo Fundo", "Soledade"] },
  { nome: "Santa Cruz do Sul", uf: "RS", cidades: ["Santa Cruz do Sul"] },

  // ===== SANTA CATARINA =====
  { nome: "Grande Florianópolis", uf: "SC", cidades: ["Florianópolis", "São José", "Palhoça", "Biguaçu", "Santo Amaro da Imperatriz"] },
  {
    nome: "Vale do Itajaí / Litoral",
    uf: "SC",
    cidades: [
      "Itajaí", "Balneário Camboriú", "Itapema", "Camboriú", "Brusque", "Blumenau", "Gaspar", "Indaial",
      "Timbó", "Navegantes", "Porto Belo", "Tijucas", "Barra Velha",
    ],
  },
  { nome: "Joinville e região", uf: "SC", cidades: ["Joinville", "Araquari", "São Bento do Sul", "Jaraguá do Sul", "Corupá"] },
  { nome: "Chapecó e Oeste", uf: "SC", cidades: ["Chapecó", "Concórdia"] },
  { nome: "Criciúma e Sul", uf: "SC", cidades: ["Criciúma", "Tubarão"] },

  // ===== PRINCIPAIS NACIONAIS =====
  {
    nome: "Grande São Paulo",
    uf: "SP",
    cidades: [
      "São Paulo", "São Paulo Zona Leste", "Guarulhos", "Osasco", "Santo André", "São Bernardo do Campo",
      "São Caetano do Sul", "Diadema", "Mauá", "Barueri", "Taboão da Serra", "Carapicuíba", "Cotia", "Itapevi", "Suzano",
    ],
  },
  { nome: "Campinas e região", uf: "SP", cidades: ["Campinas", "Sumaré", "Hortolândia", "Valinhos", "Indaiatuba"] },
  { nome: "Ribeirão Preto", uf: "SP", cidades: ["Ribeirão Preto", "Sertãozinho"] },
  {
    nome: "Grande Rio",
    uf: "RJ",
    cidades: ["Rio de Janeiro", "Niterói", "São Gonçalo", "Duque de Caxias", "Nova Iguaçu", "São João de Meriti", "Belford Roxo", "Nilópolis"],
  },
  {
    nome: "Grande BH",
    uf: "MG",
    cidades: ["Belo Horizonte", "Contagem", "Betim", "Nova Lima", "Ribeirão das Neves", "Santa Luzia", "Sabará"],
  },
  { nome: "Brasília e entorno", uf: "DF", cidades: ["Brasília"] },
  { nome: "Grande Goiânia", uf: "GO", cidades: ["Goiânia", "Aparecida de Goiânia", "Anápolis", "Senador Canedo"] },
];

/** Regiões de um estado (pra montar o seletor). */
export function regioesDoEstado(uf: string): Regiao[] {
  return REGIOES.filter((r) => r.uf === uf);
}

/** Cidades de uma região (nome + uf), ou null se não achar. */
export function cidadesDaRegiao(nome: string, uf: string): string[] | null {
  const r = REGIOES.find((x) => x.uf === uf && x.nome === nome);
  return r ? r.cidades : null;
}
