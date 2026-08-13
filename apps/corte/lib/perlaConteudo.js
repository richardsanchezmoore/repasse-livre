// ─────────────────────────────────────────────────────────────────────────────
//  PERLA · "Como se Tornar a Mulher que Ele Procura" — conteúdo desacoplado.
//
//  Regra de ouro (parecer): o PERLA é um MECANISMO NARRATIVO descoberto
//  progressivamente — NÃO um selo de marca na abertura. Por isso a palavra
//  "PERLA" e o significado das letras só existem a partir de `revelacao`/`perla`.
//  O leitor (LeitorPerla.js) apenas interpreta estes dados — nada de design aqui.
//
//  Tipos de item dentro de `corpo` (arrays):
//    "texto simples"            → parágrafo de leitura
//    { q: "..." }               → frase de impacto (pull-quote centralizada)
//    { fala: "...", quem:"..." } → carta/voz (a dama que escreve à Lady)
//    { mini: "..." }            → micro-subtítulo em versalete
//  Imagens: arquivos em /public/livro (webp), 1 âncora por marco.
// ─────────────────────────────────────────────────────────────────────────────

export const PERLA = {
  capa: {
    titulo: "Como se Tornar a Mulher que “Ele” Procura",
    subtitulo:
      "Descubra por que algumas mulheres parecem naturalmente ser percebidas, lembradas e desejadas.",
    autora: "A Lady",
    img: "/livro/cena1.webp",
  },

  // ── UMA CARTA ANTES DE COMEÇARMOS ──────────────────────────────────────────
  cartaAbertura: {
    rotulo: "Uma carta antes de começarmos",
    corpo: [
      "Minha querida,",
      "Existe uma pergunta que talvez você já tenha feito mais vezes do que gostaria:",
      { q: "“Por que parece tão fácil para algumas mulheres viverem histórias que nunca acontecem comigo?”" },
      "Você olha ao redor. Uma amiga conheceu alguém. Outra começou a conversar com um homem. Outra está vivendo um relacionamento. E você continua esperando.",
      "Talvez até conheça homens. Talvez até receba alguma atenção. Mas nada realmente acontece. Ou começa e desaparece. Ou acontece justamente com quem você não deveria ter escolhido.",
      "E, depois de algum tempo, uma pergunta mais dolorosa aparece:",
      { q: "“Será que existe alguma coisa errada comigo?”" },
      "Pare aqui. Talvez não.",
      "Talvez você simplesmente nunca tenha aprendido algumas coisas que outras mulheres aprenderam — muitas vezes sem nem perceber.",
      "Onde estar. Como ser percebida. O que sua presença comunica. O que revelar. Como conversar. Como demonstrar interesse. Como reconhecer interesse verdadeiro. Como colocar limites. E, principalmente… como escolher.",
      "Porque existe uma diferença enorme entre esperar que um homem apareça e aprender a conduzir sua própria vida amorosa.",
      "Não vou ensinar você a perseguir homens. Também não vou pedir que se transforme em outra pessoa. Vou mostrar algo muito mais interessante: como destravar aquilo que pode estar impedindo sua vida amorosa de se mover.",
      "Então deixe de lado, por algumas páginas, tudo aquilo que você já ouviu: os joguinhos, as frases prontas, o “se for para ser, será” e até aquela velha ideia de que basta “ser você mesma” e esperar que o universo faça o resto.",
      "Talvez exista muito mais que você possa fazer. E talvez… você ainda não tenha descoberto como.",
    ],
    assinatura: "— A Lady",
  },

  // ── EXISTE UMA CHAVE (a promessa do método, ainda sem nome) ─────────────────
  chave: {
    rotulo: "Existe uma chave",
    img: "/livro/cena3.webp",
    corpo: [
      "Durante muito tempo, talvez você tenha acreditado que precisava ser mais bonita, mais magra, mais extrovertida ou simplesmente esperar o homem certo aparecer.",
      { q: "Talvez não." },
      "Existe uma sequência. Existe uma lógica. Existe um método.",
      "Mas você não vai receber a resposta inteira logo nas primeiras páginas. Algumas peças serão descobertas ao longo dos encontros. Uma de cada vez. E, quando todas estiverem diante de você, talvez perceba que elas sempre estiveram conectadas.",
      { q: "A primeira descoberta começa agora." },
    ],
  },

  // ── OS CINCO MOVIMENTOS ─────────────────────────────────────────────────────
  movimentos: [
    {
      n: "01",
      nome: "Presença",
      frase: "Você não pode ser encontrada se nunca está onde alguém possa encontrá-la.",
      img: "/livro/cena4.webp",
      encontros: [
        {
          titulo: "Você não pode ser encontrada",
          kicker: "Se sua vida permanece parada, sua vida amorosa dificilmente terá motivos para se mover.",
          corpo: [
            { fala: "Eu quero conhecer alguém. Quero viver uma história. Mas parece que nunca aparece ninguém. Trabalho, volto para casa, vejo algumas pessoas no domingo… e nada. Minhas amigas conhecem homens. Algumas parecem começar relacionamentos sem nem procurar. E eu? Nada. Será que simplesmente não existem homens interessados em mim?", quem: "Uma dama cansada de esperar" },
            "Minha querida… vou lhe fazer uma pergunta.",
            { q: "“Onde exatamente você espera que esse homem encontre você?”" },
            "Você trabalha. Volta para casa. Fica no celular. Sai pouco. Participa pouco. Conhece sempre as mesmas pessoas. E espera que, em algum momento, um homem interessante simplesmente atravesse a porta da sua vida.",
            "Pode acontecer? Claro. Mas você quer depender do acaso? Provavelmente não.",
            "Duas mulheres entram no mesmo ambiente. Uma entra, senta, assiste e vai embora. A outra entra, cumprimenta, conversa, ajuda, conhece alguém, fica alguns minutos e recebe um convite para outro encontro.",
            { q: "Uma esteve presente. A outra começou a fazer parte." },
            "Você não precisa entrar em um ambiente pensando: “Onde está meu marido?”. Você precisa entrar vivendo. Participar. Conhecer. Aprender. Sorrir. Criar amizades. Construir sua vida.",
            { q: "Você não precisa procurar homens. Precisa parar de se esconder das possibilidades de encontrá-los." },
          ],
          municoes: [
            "Amplie seus ambientes.",
            "Participe de verdade.",
            "Aceite convites saudáveis.",
            "Conheça pessoas novas.",
            "Não dependa de coincidências.",
          ],
          missao: "Escolha um ambiente novo ou uma atividade da qual possa participar mais esta semana.",
          selo: "Não procure um homem. Procure movimento.",
        },
        {
          titulo: "Não basta aparecer",
          kicker: "Você precisa ser lembrada.",
          corpo: [
            "Você chegou. Participou. Conversou. Foi embora. No domingo seguinte, voltou. E ninguém parece lembrar de você. “O que aconteceu?” Você apareceu. Mas ainda não criou vínculo.",
            { q: "Presença repetida cria familiaridade. Participação cria memória." },
            "Um departamento pode ter duzentas pessoas. Agora imagine uma célula com dez. Você chega. Conhece os nomes. Participa. Ajuda. Ri. Depois do encontro, fica conversando. Na semana seguinte: “Você vem sábado?”. Pronto. Você deixou de ser uma desconhecida.",
            "“Não sei cantar.” Então não cante. “Não sei cozinhar.” Aprenda. “Não sei fazer nada.” Seja disponível.",
            { q: "Disponibilidade pode ser mais valiosa que habilidade." },
          ],
          municoes: ["Participe.", "Ajude.", "Aprenda.", "Permaneça.", "Lembre nomes."],
          missao: "Faça esta semana uma coisa que faça alguém associar seu nome a uma experiência positiva.",
        },
        {
          titulo: "Crie o ecossistema",
          kicker: "Não construa uma estrada até um homem. Construa uma cidade inteira de possibilidades.",
          img: "/livro/cena9.webp",
          corpo: [
            "Uma igreja pode ter cultos, departamentos, células, ministérios, grupos de estudo, ações sociais, eventos e retiros. Relações geralmente se aprofundam em ambientes menores.",
            { q: "É onde a distância social diminui." },
            "Se você percebe interesse em alguém dentro de um departamento com duzentas pessoas, descobrir o pequeno grupo do qual ele participa pode representar uma oportunidade de conhecer dez pessoas, em vez de simplesmente observar uma entre duzentas.",
            { q: "Não para persegui-lo. Para estreitar seu ecossistema." },
            "E fora da igreja? Trabalho. Faculdade. Cursos. Eventos. Amizades. Comunidades. A lógica permanece. Mas o filtro precisa ser mais cuidadoso.",
            { q: "Química aproxima. Valores sustentam." },
          ],
          municoes: [
            "Crie círculos.",
            "Entre em ambientes menores.",
            "Seja disponível.",
            "Observe.",
            "Não abandone seus fundamentos.",
          ],
          missao: "Desenhe seu ecossistema atual. Onde você circula? Quem conhece você? Onde poderia participar mais? O que está faltando?",
        },
      ],
      peca: {
        letra: "P",
        comando: "Posicione-se",
        pergunta: "Você percebeu?",
        conector: "Estar. Participar. Circular. Criar presença. Abrir portas.",
        frase: "Pare de esperar. Crie movimento.",
        nota: "Talvez seja cedo demais para dar um nome a isso. Mas uma primeira peça acaba de aparecer. Guarde esta letra — você ainda vai descobrir por que ela está aqui.",
      },
    },

    {
      n: "02",
      nome: "Expressão",
      frase: "Quando você entra em um ambiente, o que exatamente as pessoas percebem?",
      img: "/livro/cena2.webp",
      encontros: [
        {
          titulo: "Ele pode não estar ignorando você",
          kicker: "Talvez ele simplesmente não tenha notado.",
          corpo: [
            "Você entra. Olha para o chão. Senta. Pega o celular. Cruza os braços. Evita contato visual. Vai embora. Depois pensa: “Ninguém me nota.”",
            { q: "Talvez você esteja enviando “não se aproxime” sem perceber." },
            "Olhar. Sorriso. Postura. Voz. Presença. Nada disso exige que você se transforme. Exige que você pare de se esconder.",
          ],
          municoes: [
            "Olhe.",
            "Sorria.",
            "Erga a postura.",
            "Fale com clareza.",
            "Pare de se esconder atrás do celular.",
            "Ocupe seu espaço.",
          ],
          missao: "Durante uma semana, observe conscientemente sua postura. Não tente parecer outra pessoa. Apenas pare de desaparecer.",
        },
        {
          titulo: "Você não precisa de roupas caras",
          kicker: "Precisa entender o que sua imagem diz.",
          corpo: [
            "Você não precisa de grife. Precisa de caimento, cuidado, combinação, adequação, limpeza, feminilidade e intenção.",
            { q: "Elegância não é preço. É intenção." },
            "Identidade não é resistência. Você não precisa apagar sua personalidade. Pode descobrir uma versão dela que ainda não conhecia.",
            { q: "Não confunda identidade com resistência à mudança." },
            { mini: "Versão cotidiana" },
            "Confortável, funcional, autêntica.",
            { mini: "Versão especial" },
            "Quando a ocasião importa, você eleva sua apresentação.",
          ],
          municoes: [
            "Cuidado antes de preço.",
            "Caimento antes de marca.",
            "Adequação antes de tendência.",
            "Experimente antes de rejeitar.",
            "Elegância é intenção.",
          ],
          missao: "Monte duas versões de você: uma cotidiana e outra para quando realmente quer causar uma boa impressão.",
        },
        {
          titulo: "Antes de ele conhecer você…",
          kicker: "Talvez já tenha conhecido seu Instagram.",
          corpo: [
            "Seu perfil não precisa ser perfeito. Mas precisa contar alguma história: fé, trabalho, amigas, interesses, viagens, projetos, humor, vida.",
            { q: "Seu Instagram deve ser uma janela para sua vida, não a casa inteira." },
            "E o WhatsApp? A mesma lógica. Foto. Nome. Status. Maneira de conversar. Tudo comunica.",
          ],
          municoes: [
            "Mostre personalidade.",
            "Não fabrique uma vida.",
            "Evite indiretas desesperadas.",
            "Deixe seus interesses aparecerem.",
            "Seja coerente online e offline.",
          ],
          missao: "Abra seu próprio perfil como se fosse um homem conhecendo você pela primeira vez. Pergunte: “Eu teria vontade de descobrir mais sobre essa mulher?”",
        },
      ],
      peca: {
        letra: "E",
        comando: "Expresse-se",
        pergunta: "Segunda peça",
        conector: "Você já descobriu que presença sozinha não basta. O que você comunica também importa.",
        frase: "Sua presença fala antes de você.",
        nota: "Mais uma peça. Ainda não tente montar o quebra-cabeça.",
      },
    },

    {
      n: "03",
      nome: "Revelação",
      frase: "Ser percebida é apenas o começo.",
      img: "/livro/cena12.webp",
      encontros: [
        {
          titulo: "Não entregue o livro inteiro no primeiro capítulo",
          kicker: "Mistério verdadeiro nasce de uma vida que possui camadas.",
          img: "/livro/cena11.webp",
          corpo: [
            "Ele pergunta: “Me conta mais sobre você.” E você despeja infância, ex, trauma, planos, inseguranças, família, tudo.",
            { q: "Você não precisa esconder o livro. Só não precisa entregar o final na primeira página." },
            "Mistério não é desaparecer. Não é fazer joguinho. Mistério verdadeiro nasce de uma vida que possui camadas.",
          ],
          missao: "Escreva cinco coisas sobre você que alguém precisaria conviver para descobrir.",
        },
        {
          titulo: "Não tente parecer interessante",
          kicker: "Tenha uma vida interessante.",
          corpo: [
            "“O que você gosta de fazer?” “Ah… nada demais.”",
            { q: "Você não precisa ter uma vida cinematográfica. Precisa ter uma vida que produza histórias." },
            "Leia. Aprenda. Participe. Viaje quando puder. Tenha hobbies. Sirva. Crie. Estude. Não faça isso para conquistar homens. Faça porque uma mulher viva produz uma vida interessante.",
          ],
          missao: "Liste 3 coisas que você sabe, 3 coisas que quer aprender e 3 coisas que quer viver. Escolha uma e comece.",
        },
      ],
      peca: {
        letra: "R",
        comando: "Revele-se",
        pergunta: "Terceira peça",
        conector: "Agora talvez você esteja começando a perceber um padrão.",
        frase: "Mostre o suficiente para despertar vontade de descobrir mais.",
      },
    },

    {
      n: "04",
      nome: "Linguagem",
      frase: "Quando a curiosidade encontra a conversa.",
      img: "/livro/cena5.webp",
      encontros: [
        {
          titulo: "A arte de fazer uma conversa continuar",
          kicker: "Conversa não é entrevista. É dança.",
          corpo: [
            "Ele: “Trabalho com arquitetura.” Você: “Legal.” Silêncio.",
            "Agora: “Você sempre quis trabalhar com isso?” “Na verdade, não…” A conversa ganhou uma porta.",
            { mini: "Fato → Experiência → História" },
            "“Você trabalha com arquitetura.” → “Você gosta?” → “Como acabou escolhendo isso?”",
            { q: "Conversa não é entrevista. É dança." },
          ],
          missao: "Na próxima conversa, faça uma pergunta que você realmente queira saber. Depois, escute a resposta sem preparar a próxima.",
        },
        {
          titulo: "Quando a conversa vai para o WhatsApp",
          kicker: "Use o WhatsApp para continuar a conexão — não para matá-la.",
          corpo: [
            "“Oi.” “Oi.” “Tudo bem?” “Tudo.” “O que está fazendo?” “Nada.” “Ah.”",
            { q: "Fim de relacionamento antes mesmo de começar." },
            "Use o WhatsApp para continuar a conexão. Retome histórias. Compartilhe algo que lembrou da conversa. Observe reciprocidade.",
          ],
          municoes: [
            "Não cronometre.",
            "Não interprete cada silêncio.",
            "Retome histórias.",
            "Observe reciprocidade.",
            "Não viva no celular.",
          ],
          missao: "Pare de calcular. Responda naturalmente. Converse quando tiver algo para dizer. E observe.",
        },
        {
          titulo: "Você pode deixar ele saber que gostou",
          kicker: "Interesse não diminui seu valor.",
          corpo: [
            "Um sorriso é interesse. Uma pergunta é interesse. Uma resposta entusiasmada é interesse. Um elogio é interesse. Aceitar um convite é interesse.",
            { q: "Dê um passo. Observe o próximo." },
          ],
          missao: "Quando gostar genuinamente de uma aproximação, dê um sinal claro. Depois, observe o próximo movimento dele.",
        },
      ],
      peca: {
        letra: "L",
        comando: "Linguagem",
        pergunta: "Quarta peça",
        conector: "A conversa já não é apenas conversa. É conexão.",
        frase: "É aqui que aproximação começa a virar conexão.",
      },
    },

    {
      n: "05",
      nome: "Ação",
      frase: "Agora você não está apenas tentando ser percebida. Está aprendendo a escolher.",
      img: "/livro/cena10.webp",
      encontros: [
        {
          titulo: "Pare de ouvir apenas o que ele diz",
          kicker: "Palavras revelam intenção. Ações revelam padrão.",
          img: "/livro/cena8.webp",
          corpo: [
            "“Quero te ver.” Ele marca? “Gosto de você.” Ele procura? “Respeito você.” Respeita seu não? “Quero construir.” Ele constrói?",
            { q: "Palavras revelam intenção. Ações revelam padrão." },
            "Não faça testes. Não provoque ciúmes. Não desapareça para ver se ele corre atrás. Observe.",
          ],
          missao: "Troque “Será que ele gosta de mim?” por: “O comportamento dele está mostrando o quê?”",
        },
        {
          titulo: "O desejo pode ser forte",
          kicker: "Seus limites precisam ser mais fortes.",
          img: "/livro/cena6.webp",
          corpo: [
            "Sentir atração não é uma falha. Gostar de alguém não é uma falha. O problema começa quando a emoção toma decisões que deveriam ser suas.",
            { q: "Você precisa decidir seus limites antes do momento em que precisará defendê-los." },
            "Você pode dizer: “Eu gosto de você, mas não quero avançar dessa maneira agora.” E então observar.",
            { q: "O tempo revela intenções." },
            "Para uma mulher cristã, aquilo que é inegociável para sua consciência não pode virar moeda de troca para conseguir um relacionamento.",
          ],
          missao: "Escreva: O que é inegociável para mim? Quais limites protegem isso?",
        },
        {
          titulo: "Você também escolhe",
          kicker: "Existe diferença entre imperfeição e incompatibilidade.",
          corpo: [
            "“Será que ele vai gostar de mim?” Agora quero que você faça outra pergunta: “Eu escolheria ele?”",
            "Ele pode ser bonito, interessante, engraçado, carinhoso. Pode procurar você. E ainda assim: “Ele combina com a vida que eu quero construir?”",
            { q: "Existe diferença entre imperfeição e incompatibilidade." },
          ],
          missao: "Escreva: O homem que eu quero ao meu lado precisa… Liste características, valores e limites.",
        },
      ],
      // Interlúdio antes da 5ª peça (páginas de respiro do manuscrito)
      interludio: {
        img: "/livro/cena7.webp",
        linhas: [
          "Você não está em uma audição.",
          "Ele está conhecendo você. E você está conhecendo ele.",
        ],
      },
      peca: {
        letra: "A",
        comando: "Ação",
        pergunta: "Quinta peça",
        conector: "Agora você não está apenas tentando ser percebida. Está aprendendo a escolher.",
        frase: "Observe. Escolha. Conduza.",
      },
    },
  ],

  // ── A REVELAÇÃO (a montagem) ────────────────────────────────────────────────
  revelacao: {
    antes: [
      "Você já conhece as cinco peças.",
      "Talvez tenha percebido o padrão antes mesmo de eu revelar o desenho inteiro.",
    ],
    chamada: "Agora junte as peças",
    depois: "Você acabou de descobrir o método. Cada letra apareceu depois de você experimentar seu significado.",
  },

  // ── PERLA (o significado, enfim nomeado) ────────────────────────────────────
  perla: {
    palavra: "PERLA",
    significados: [
      { letra: "P", titulo: "Posicione-se", desc: "Crie oportunidades." },
      { letra: "E", titulo: "Expressão", desc: "Faça sua presença comunicar." },
      { letra: "R", titulo: "Revelação", desc: "Desperte curiosidade sem jogos." },
      { letra: "L", titulo: "Linguagem", desc: "Transforme aproximação em conexão." },
      { letra: "A", titulo: "Ação", desc: "Observe. Escolha. Conduza." },
    ],
    sequencia: {
      titulo: "Não são cinco dicas. É uma sequência.",
      linhas: [
        "Antes da conversa, existe presença.",
        "Antes da conexão, existe expressão.",
        "Antes da intimidade, existe revelação.",
        "Antes da escolha, existe ação.",
      ],
      fecho: "O PERLA não é apenas algo para ler. É algo para aplicar.",
    },
    manto: "A chave está nas suas mãos.",
  },

  // ── A ÚLTIMA CARTA ──────────────────────────────────────────────────────────
  cartaFinal: {
    rotulo: "A última carta da Lady",
    corpo: [
      "Minha querida,",
      "Você chegou aqui perguntando como fazer um homem perceber você.",
      "Talvez esteja saindo com uma pergunta diferente:",
      { q: "“Eu escolheria esse homem?”" },
      "Você não estava esperando apenas ser escolhida. Estava aprendendo a escolher.",
      "A chave está nas suas mãos. Agora use-a.",
    ],
    assinatura: "— A Lady",
  },

  encerramento: {
    linha: "A guinada começa quando você deixa de apenas esperar.",
    rodape: "A jornada continua. Você já descobriu a chave — agora começa a parte mais importante: usá-la.",
  },
};

// Ordem canônica das letras (o rastreador de descoberta consome isto).
export const LETRAS = PERLA.perla.significados.map((s) => s.letra); // ["P","E","R","L","A"]
