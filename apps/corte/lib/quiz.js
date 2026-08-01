// Quiz "O Veredito Real" — portado de quiz-feminino.html. Pontuado, 4 questões.
export const QUIZ = {
  titulo: "Ele é um Cavalheiro ou um Libertino?",
  lead: "Responda com honestidade. Some os pontos e descubra se o rapaz que ocupa as suas orações realmente merece o seu altar.",
  max: 12,
  questoes: [
    {
      n: "Questão I",
      t: "Quando você discorda dele ou questiona uma atitude, como ele reage?",
      opcoes: [
        { p: 3, t: "Ele ouve com paciência, reflete de forma madura e busca o entendimento." },
        { p: 2, t: "Ele fica em silêncio, muda de assunto ou finge que nada aconteceu." },
        { p: 1, t: "Ele se irrita, usa a Bíblia para dizer que você é rebelde ou inverte a culpa." },
      ],
    },
    {
      n: "Questão II",
      t: "Como é a vida financeira e de trabalho dele no dia a dia?",
      opcoes: [
        { p: 3, t: "É trabalhador, honrado, cuida do que tem e assume responsabilidades." },
        { p: 2, t: "Fala muito de investimentos futuros, mas vive mudando de planos e empregos." },
        { p: 1, t: "É escorado na família, reclama de trabalhar e adora que você pague as contas." },
      ],
    },
    {
      n: "Questão III",
      t: "O que os frutos dele dizem quando ele está fora do ambiente de culto?",
      opcoes: [
        { p: 3, t: "Trata bem os garçons, cumpre o que promete e não vive de fofocas." },
        { p: 1, t: "É um rapaz neutro, mas liga muito para aparências e redes sociais." },
        { p: 0, t: "Tem uma vida dupla, fala mal das pessoas pelas costas e tem explosões de raiva." },
      ],
    },
    {
      n: "Questão IV",
      t: "Há quanto tempo vocês conversam sem que ele tome uma atitude clara de compromisso?",
      opcoes: [
        { p: 3, t: "O tempo necessário para se conhecer; ele já demonstrou intenção clara." },
        { p: 1, t: "Pouquíssimo tempo, mas ele já fala em casamento como se fôssemos noivos de anos." },
        { p: 0, t: 'Meses ou anos "esperando o tempo de Deus", mas nunca oficializa.' },
      ],
    },
  ],
  faixas: [
    { min: 10, cls: "green", titulo: "O Cavalheiro de Verdade", texto: "Respire aliviada, minha querida. O seu pretendente demonstra frutos reais de um homem que teme ao Senhor. Ele não é perfeito (afinal, perfeição só no céu), mas está pronto para construir um lar seguro com você. Prossiga com oração." },
    { min: 6, cls: "amber", titulo: "Alerta Amarelo na Corte", texto: "Atenção. Este homem carrega traços de indecisão ou aparências. Fala coisas bonitas nos bailes, mas faltam atitudes firmes na vida real. Observe os frutos dele de perto por mais uma temporada antes de entregar a chave do seu jardim fechado." },
    { min: 0, cls: "red", titulo: "Fuja para as Colinas!", texto: "O diagnóstico é claro: este homem é uma autêntica armadilha bíblica. Seja o Duque Oculto, o Visconde Iracundo ou o Cavalheiro de Palavras Doces, ele vai destruir a sua paz. Guarde seu coração e corra antes que a temporada termine em desastre." },
  ],
};

export function faixaDoTotal(total) {
  return QUIZ.faixas.find((f) => total >= f.min) || QUIZ.faixas[QUIZ.faixas.length - 1];
}
