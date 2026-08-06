// "Abre-roda" da Marta — convites CURADOS (escritos à mão, SEM IA em runtime).
// A Sala é das mulheres; a Marta só deixa um empurrãozinho que rotaciona por dia.
// Nada aqui chama LLM: é uma anfitriã que puxa o assunto e sai.

const STARTERS = {
  cozinha: [
    "Qual foi o prato que salvou o seu jantar essa semana? 🍲",
    "Receita de família que você nunca deixa morrer?",
    "O que tá sobrando na geladeira? Vamos pensar juntas no que fazer.",
    "Uma dica de cozinha que sua mãe ou avó te ensinou?",
    "Almoço de domingo: o que não pode faltar na sua mesa?",
    "Aquela receita rápida pra dia de correria — conta a sua!",
    "O que as crianças mais pedem pra comer aí em casa?",
  ],
  filhos: [
    "Uma vitória pequena com os filhos essa semana? 💛",
    "O que tem tirado o seu sono na criação deles?",
    "Como vocês lidam com o excesso de tela por aí?",
    "Um valor que você mais quer plantar no coração dos seus filhos?",
    "Birra, dever de casa, sono… qual é o perrengue de hoje?",
    "Uma frase que sua mãe dizia e hoje você se pega repetindo?",
    "O que te fez rir com as crianças essa semana?",
  ],
  casamento: [
    "Na sua experiência, o que faz um casamento durar? 💍",
    "Um gesto pequeno que renova o amor no dia a dia?",
    "Como vocês cuidam do 'nós' no meio da correria?",
    "Uma coisa que você aprendeu a relevar com o tempo?",
    "Como é a oração do casal na sua casa?",
    "Um programa simples que vocês amam fazer juntos?",
    "O que você diria pra uma recém-casada hoje?",
  ],
  fe: [
    "Por onde anda o seu coração hoje? Pode desabafar aqui. 🙏",
    "Um motivo de gratidão de hoje, mesmo que pequenininho?",
    "Como está a sua fé nessa fase?",
    "Precisa de oração por algo? As irmãs estão aqui. 💛",
    "Uma promessa que tem te sustentado ultimamente?",
    "O que te deu paz essa semana?",
    "Um versículo que você carrega no coração? (só a referência 💛)",
  ],
};
const PADRAO = ["O que você quer dividir com as irmãs hoje? 💛"];

/** Abre-roda do dia (mesmo pra todas; muda a cada dia). Determinístico por data. */
export function starterDaRoda(slug) {
  const lista = STARTERS[slug] || PADRAO;
  const agora = new Date();
  const dia = Math.floor((agora - new Date(agora.getFullYear(), 0, 0)) / 86400000);
  return lista[dia % lista.length];
}
