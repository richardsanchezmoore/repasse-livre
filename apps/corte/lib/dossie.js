// ============================================================================
// Configuração dos "capítulos" do Dossiê. PROVISÓRIO — placeholder até o
// Gustavo enviar as perguntas-base definitivas. Trocar aqui = muda o app todo
// (as telas leem esta config; nada é hardcoded nas páginas).
//
// tipos de campo: 'texto' | 'opcao' (usa `opcoes`) | 'lista' (vírgulas)
// ============================================================================

export const CAPITULOS = [
  {
    id: "fe_igreja",
    titulo: "Fé & Igreja",
    icone: "⛪",
    campos: [
      { id: "igreja", label: "Qual igreja ele congrega?", tipo: "texto" },
      { id: "batizado", label: "É batizado?", tipo: "opcao", opcoes: ["Sim", "Não", "Não sei"] },
      { id: "tempo_fe", label: "Há quanto tempo é convertido?", tipo: "texto" },
      { id: "lar_cristao", label: "Nasceu em lar cristão?", tipo: "opcao", opcoes: ["Sim", "Não", "Não sei"] },
      { id: "pregadores", label: "Quais pregadores ele admira?", tipo: "lista", dica: "separe por vírgula" },
    ],
  },
  {
    id: "gostos",
    titulo: "Gostos & Cultura",
    icone: "🎵",
    campos: [
      { id: "estilo_musica", label: "Estilos de música que ele curte", tipo: "lista", dica: "separe por vírgula" },
      { id: "lazer", label: "O que ele faz no tempo livre?", tipo: "texto" },
      { id: "esporte", label: "Pratica algum esporte?", tipo: "texto" },
    ],
  },
  {
    id: "carater",
    titulo: "Caráter & Frutos",
    icone: "🌿",
    campos: [
      { id: "trata_mae", label: "Como ele trata a própria mãe?", tipo: "texto" },
      { id: "pontual_igreja", label: "É constante na igreja?", tipo: "opcao", opcoes: ["Sempre", "Às vezes", "Raramente", "Não sei"] },
      { id: "reacao_nao", label: 'Como reage ao ouvir um "não"?', tipo: "texto" },
    ],
  },
  {
    id: "intencoes",
    titulo: "Intenções & Vida",
    icone: "💍",
    campos: [
      { id: "trabalho", label: "Do que ele trabalha?", tipo: "texto" },
      { id: "planos", label: "Que planos tem pro futuro?", tipo: "texto" },
      { id: "intencao", label: "A intenção com você é clara?", tipo: "opcao", opcoes: ["Sim, declarada", "Ainda vaga", "Não sei"] },
    ],
  },
];

export const TOTAL_CAMPOS = CAPITULOS.reduce((n, c) => n + c.campos.length, 0);

/** Uma resposta "conta" se tem valor não-vazio. "Não sei" conta (ela engajou) mas vira missão. */
export function respondida(valor) {
  if (valor == null) return false;
  const s = String(valor).trim();
  return s.length > 0;
}

/** Campo é uma "missão" (lacuna a preencher na vida real) se vazio OU respondido "Não sei". */
export function ehMissao(valor) {
  if (!respondida(valor)) return true;
  return String(valor).trim().toLowerCase() === "não sei";
}

/** Nível de Conhecimento: % + selo + mensagem-gatilho (estilo game). */
export function nivel(respondidos) {
  const pct = TOTAL_CAMPOS ? Math.round((respondidos / TOTAL_CAMPOS) * 100) : 0;
  let selo, msg;
  if (pct === 0) { selo = "Curiosa"; msg = "Vocês mal cruzaram olhares. Abra o dossiê."; }
  else if (pct < 34) { selo = "Aprendiz"; msg = "Você ainda sabe pouco sobre seu futuro esposo."; }
  else if (pct < 67) { selo = "Observadora"; msg = "Está de olho — mas ainda há véus a descobrir."; }
  else if (pct < 100) { selo = "Investigadora"; msg = "Quase uma Lady Whistledown. Faltam poucos detalhes."; }
  else { selo = "Lady Whistledown"; msg = "Dossiê completo. Hora do Veredito."; }
  return { pct, selo, msg };
}
