// ─────────────────────────────────────────────────────────────────────────────
//  PERLA · "Como se Tornar a Mulher que Ele Procura" — conteúdo desacoplado.
//
//  V3 "Fluidez": preserva a arquitetura narrativa da V2, mas troca a cadência
//  fragmentada (períodos telegráficos) por PROSA CONTÍNUA. Frases curtas
//  permanecem só quando têm função de impacto, revelação ou transição.
//  Regra editorial: a copy pode ser incisiva; a obra deve ser fluida.
//
//  Regra de ouro (parecer): o PERLA é um MECANISMO NARRATIVO descoberto
//  progressivamente — NÃO um selo de marca na abertura. Por isso a palavra
//  "PERLA" e o significado das letras só existem a partir de `revelacao`/`perla`.
//  O leitor (LeitorPerla.js) apenas interpreta estes dados — nada de design aqui.
//
//  Tipos de item dentro de `corpo` (arrays):
//    "texto simples"            → parágrafo de leitura (prosa fluida)
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
      "Existe uma pergunta que talvez você já tenha feito mais vezes do que gostaria — quase sempre em voz baixa, quase sempre à noite:",
      { q: "“Por que parece tão fácil para algumas mulheres viverem histórias que nunca acontecem comigo?”" },
      "Você olha ao redor e vê os sinais por toda parte: uma amiga que conheceu alguém, outra que começou a conversar com um homem, uma terceira que já está vivendo um relacionamento. E você, que faz tudo com tanto cuidado, continua esperando.",
      "Talvez você até conheça homens. Talvez até receba alguma atenção. Mas nada realmente acontece — ou começa e desaparece, ou acontece justamente com quem você não deveria ter escolhido. E, depois de algum tempo, uma pergunta mais dolorosa se instala no lugar da primeira:",
      { q: "“Será que existe alguma coisa errada comigo?”" },
      "Pare aqui, respire, e ouça o que tenho a dizer: quase sempre, não há nada de errado com você. O que talvez exista seja apenas uma coleção de coisas que você nunca aprendeu — e que outras mulheres aprenderam, muitas vezes sem sequer perceber que aprendiam.",
      "Onde estar. Como ser percebida. O que a sua presença comunica antes de você abrir a boca. O que revelar e o que guardar. Como conversar, como demonstrar interesse, como reconhecer o interesse verdadeiro do outro. Como colocar limites. E, principalmente, como escolher — porque existe uma diferença enorme entre esperar que um homem apareça e aprender a conduzir a própria vida amorosa.",
      "Não vou lhe ensinar a perseguir homens, e também não vou lhe pedir que se transforme em outra pessoa. Vou lhe mostrar algo bem mais interessante: como destravar aquilo que talvez esteja impedindo a sua vida amorosa de simplesmente se mover.",
      "Então deixe de lado, por algumas páginas, tudo o que você já ouviu — os joguinhos, as frases prontas, o “se for para ser, será” e até aquela velha ideia de que basta “ser você mesma” e esperar que o universo faça o resto. Talvez exista muito mais que você possa fazer. E talvez você ainda não tenha descoberto como.",
    ],
    assinatura: "— A Lady",
  },

  // ── EXISTE UMA CHAVE (a promessa do método, ainda sem nome) ─────────────────
  chave: {
    rotulo: "Existe uma chave",
    img: "/livro/cena3.webp",
    corpo: [
      "Durante muito tempo, você pode ter acreditado que precisava ser mais bonita, mais magra, mais extrovertida — ou simplesmente esperar, com paciência, que o homem certo aparecesse por conta própria.",
      { q: "Talvez não." },
      "O que existe, na verdade, é outra coisa. Existe uma sequência. Existe uma lógica. Existe um método.",
      "Mas você não vai receber a resposta inteira logo nas primeiras páginas. Algumas peças serão descobertas ao longo dos encontros, uma de cada vez, no ritmo em que você viver cada uma delas. E quando todas estiverem enfim diante de você, talvez perceba que sempre estiveram conectadas — esperando apenas que você reparasse.",
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
          kicker: "Se a sua vida permanece parada, a sua vida amorosa dificilmente terá motivos para se mover.",
          corpo: [
            { fala: "Eu quero conhecer alguém, quero viver uma história — mas parece que nunca aparece ninguém. Trabalho, volto para casa, vejo algumas pessoas no domingo, e nada. Minhas amigas conhecem homens; algumas parecem começar relacionamentos sem nem procurar. E eu? Nada. Será que simplesmente não existem homens interessados em mim?", quem: "Uma dama cansada de esperar" },
            "Minha querida, antes de qualquer conselho, deixe-me lhe fazer uma única pergunta.",
            { q: "“Onde exatamente você espera que esse homem encontre você?”" },
            "Você trabalha, volta para casa e passa a noite no celular. Sai pouco, participa pouco, conhece sempre as mesmas pessoas — e, ainda assim, espera que em algum momento um homem interessante simplesmente atravesse a porta da sua vida. Pode acontecer? Claro que pode. Mas depender do acaso é uma estratégia frágil demais para algo que importa tanto.",
            "Imagine duas mulheres entrando no mesmo ambiente. A primeira entra, senta, assiste e vai embora. A segunda entra, cumprimenta, conversa, ajuda em alguma coisa, conhece alguém, demora-se mais alguns minutos — e sai de lá com um convite para o próximo encontro.",
            { q: "Uma esteve presente. A outra começou a fazer parte." },
            "Você não precisa entrar em um ambiente se perguntando onde está o seu futuro marido. Precisa entrar vivendo: participando, conhecendo, aprendendo, sorrindo, criando amizades e construindo uma vida que seja inteiramente sua muito antes de ser de alguém.",
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
            "Você chegou, participou, conversou e foi embora. No domingo seguinte, voltou — e ninguém pareceu lembrar de você. O que aconteceu? Nada de errado, na verdade: você apareceu, mas ainda não criou vínculo.",
            { q: "Presença repetida cria familiaridade. Participação cria memória." },
            "Um grande salão pode ter duzentas pessoas; um pequeno grupo, dez. É no grupo de dez que você aprende os nomes, participa, ajuda, ri e fica conversando depois que o encontro já terminou. Na semana seguinte, alguém pergunta: “você vem sábado?”. Nesse instante, sem grande esforço, você deixou de ser uma desconhecida.",
            "E se a insegurança aparecer, ela tem resposta. “Não sei cantar” — então não cante. “Não sei cozinhar” — então aprenda. “Não sei fazer nada” — então esteja disponível, porque isso qualquer uma pode oferecer.",
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
            "Uma igreja pode ter cultos, departamentos, células, ministérios, grupos de estudo, ações sociais, eventos e retiros — e é quase sempre nos ambientes menores que as relações se aprofundam de verdade.",
            { q: "É onde a distância social diminui." },
            "Se você percebe interesse em alguém dentro de um departamento com duzentas pessoas, descobrir o pequeno grupo do qual ele participa pode transformar tudo: em vez de observar uma pessoa entre duzentas, você passa a conviver com dez. Não para persegui-lo — isso nunca —, mas para estreitar, com naturalidade, o seu próprio ecossistema.",
            { q: "Não para persegui-lo. Para estreitar seu ecossistema." },
            "E fora da igreja? Trabalho, faculdade, cursos, eventos, amizades, comunidades: a lógica permanece exatamente a mesma. Só o filtro precisa ser mais cuidadoso, porque nem todo ambiente sustenta o que você procura.",
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
        conector: "Os últimos encontros pareciam diferentes entre si, mas havia um mesmo fio ligando todos eles: estar, participar, circular, criar presença, abrir portas.",
        frase: "Pare de esperar. Crie movimento.",
        nota: "Talvez ainda seja cedo para dar um nome a isso. Mas uma primeira peça acaba de aparecer — guarde esta letra, porque você ainda vai descobrir por que ela está aqui.",
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
            "Você entra, olha para o chão, senta e pega o celular. Cruza os braços, evita o contato visual e, no fim da noite, vai embora pensando que ninguém a notou. Mas talvez a história seja outra.",
            { q: "Talvez você esteja enviando “não se aproxime” sem perceber." },
            "Olhar, sorriso, postura, voz — nada disso exige que você se transforme em outra pessoa. Exige apenas que você pare de se esconder daquilo que já é seu.",
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
          kicker: "Precisa entender o que a sua imagem diz.",
          corpo: [
            "Você não precisa de grife. Precisa de caimento, cuidado, combinação, adequação, limpeza, feminilidade e, acima de tudo, intenção — que é o que separa uma mulher arrumada de uma mulher que sabe o que está comunicando.",
            { q: "Elegância não é preço. É intenção." },
            "E identidade não é resistência. Você não precisa apagar a sua personalidade para se apresentar melhor; pode, ao contrário, descobrir uma versão dela que ainda não conhecia.",
            { q: "Não confunda identidade com resistência à mudança." },
            { mini: "Versão cotidiana" },
            "A você de todos os dias: confortável, funcional e autêntica.",
            { mini: "Versão especial" },
            "Quando a ocasião pede, você eleva a apresentação — sem deixar de ser você.",
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
          kicker: "Talvez ele já tenha conhecido o seu Instagram.",
          corpo: [
            "O seu perfil não precisa ser perfeito, mas precisa contar alguma história — a sua. Fé, trabalho, amigas, interesses, viagens, projetos, humor, vida: tudo isso desenha, para quem olha de fora, a mulher que você é.",
            { q: "Seu Instagram deve ser uma janela para sua vida, não a casa inteira." },
            "E o WhatsApp segue a mesma lógica. A foto, o nome, o status, o próprio jeito de conversar — cada detalhe comunica algo antes mesmo do primeiro “oi”.",
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
        conector: "Você já descobriu que a presença, sozinha, não basta. O que você comunica também conta a sua história.",
        frase: "Sua presença fala antes de você.",
        nota: "Mais uma peça em suas mãos. Ainda não tente montar o quebra-cabeça inteiro — cada coisa a seu tempo.",
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
            "Ele pergunta, com aquele interesse recém-nascido: “me conta mais sobre você.” E você, ansiosa para ser compreendida, despeja tudo de uma vez — infância, ex, traumas, planos, inseguranças, família — como quem entrega o final antes mesmo do enredo começar.",
            { q: "Você não precisa esconder o livro. Só não precisa entregar o final na primeira página." },
            "Mistério não é desaparecer, nem fazer joguinho. O mistério verdadeiro nasce de uma vida que tem camadas — e camadas, por natureza, se revelam aos poucos, para quem tem o cuidado de ficar por perto.",
          ],
          missao: "Escreva cinco coisas sobre você que alguém precisaria conviver para descobrir.",
        },
        {
          titulo: "Não tente parecer interessante",
          kicker: "Tenha uma vida interessante.",
          corpo: [
            "“O que você gosta de fazer?”, ele pergunta. E você responde, quase por reflexo: “ah, nada demais.” O problema não está na modéstia — está no que essa frase revela.",
            { q: "Você não precisa ter uma vida cinematográfica. Precisa ter uma vida que produza histórias." },
            "Então leia, aprenda, viaje quando puder, tenha hobbies, sirva, crie, estude. Não faça nada disso para conquistar um homem, e sim porque uma mulher viva produz, naturalmente, uma vida interessante — e uma vida interessante conversa quase sozinha.",
          ],
          missao: "Liste 3 coisas que você sabe, 3 coisas que quer aprender e 3 coisas que quer viver. Escolha uma e comece.",
        },
      ],
      peca: {
        letra: "R",
        comando: "Revele-se",
        pergunta: "Terceira peça",
        conector: "Agora, talvez, você esteja começando a perceber um padrão se formando por baixo de tudo.",
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
            "Imagine a cena. Ele diz: “trabalho com arquitetura.” Você responde: “legal.” E então cai aquele silêncio que nenhum dos dois sabe como preencher.",
            "Agora imagine a mesma cena com uma pequena virada. Ele diz o mesmo, e você pergunta: “você sempre quis trabalhar com isso?”. “Na verdade, não…”, ele começa — e a conversa acaba de ganhar uma porta por onde os dois podem entrar.",
            { mini: "Fato → Experiência → História" },
            "É esse o caminho de toda boa conversa: “você trabalha com arquitetura” leva a “você gosta?”, que leva a “como você acabou escolhendo isso?”. De fato em experiência, de experiência em história.",
            { q: "Conversa não é entrevista. É dança." },
          ],
          missao: "Na próxima conversa, faça uma pergunta que você realmente queira saber. Depois, escute a resposta sem preparar a próxima.",
        },
        {
          titulo: "Quando a conversa vai para o WhatsApp",
          kicker: "Use o WhatsApp para continuar a conexão — não para matá-la.",
          corpo: [
            "Existe um tipo de conversa que morre antes de nascer, e todo mundo já viveu uma: “oi.” “oi.” “tudo bem?” “tudo.” “o que você está fazendo?” “nada.” “ah.”",
            { q: "Fim de relacionamento antes mesmo de começar." },
            "Use o WhatsApp para continuar a conexão, e não para sufocá-la. Retome uma história que ficou pela metade, compartilhe algo que a fez lembrar da conversa de vocês, e observe se existe reciprocidade — porque reciprocidade é o único termômetro que não engana.",
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
          kicker: "Interesse não diminui o seu valor.",
          corpo: [
            "Existe um medo comum de que demonstrar interesse a coloque numa posição frágil. É o contrário. Um sorriso é interesse; uma pergunta é interesse; uma resposta entusiasmada, um elogio sincero, um convite aceito — tudo isso é interesse, e nada disso a diminui.",
            { q: "Dê um passo. Observe o próximo." },
          ],
          missao: "Quando gostar genuinamente de uma aproximação, dê um sinal claro. Depois, observe o próximo movimento dele.",
        },
      ],
      peca: {
        letra: "L",
        comando: "Linguagem",
        pergunta: "Quarta peça",
        conector: "A conversa já não é apenas conversa. Ela começou a virar outra coisa.",
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
            "Aprenda a ouvir com os olhos, não só com os ouvidos. “Quero te ver” — mas ele marca? “Gosto de você” — mas ele procura? “Respeito você” — mas respeita o seu não? “Quero construir” — mas ele constrói alguma coisa, de fato?",
            { q: "Palavras revelam intenção. Ações revelam padrão." },
            "Nada disso significa armar testes, provocar ciúmes ou desaparecer para ver se ele corre atrás. Significa apenas uma coisa, simples e difícil ao mesmo tempo: observar.",
          ],
          missao: "Troque “Será que ele gosta de mim?” por: “O comportamento dele está mostrando o quê?”",
        },
        {
          titulo: "O desejo pode ser forte",
          kicker: "Seus limites precisam ser mais fortes.",
          img: "/livro/cena6.webp",
          corpo: [
            "Sentir atração não é uma falha, e gostar de alguém também não. O problema começa em outro ponto: quando a emoção passa a tomar, no calor do momento, decisões que deveriam ser inteiramente suas.",
            { q: "Você precisa decidir seus limites antes do momento em que precisará defendê-los." },
            "Um limite dito com serenidade é uma das coisas mais poderosas que existem. Você pode dizer: “eu gosto de você, mas não quero avançar dessa maneira agora.” E então, mais uma vez, observar o que acontece.",
            { q: "O tempo revela intenções." },
            "Para uma mulher cristã, isso tem um peso a mais: aquilo que é inegociável para a sua consciência jamais pode virar moeda de troca por um relacionamento. O que se conquista abrindo mão de si raramente vale o que custou.",
          ],
          missao: "Escreva: O que é inegociável para mim? Quais limites protegem isso?",
        },
        {
          titulo: "Você também escolhe",
          kicker: "Existe diferença entre imperfeição e incompatibilidade.",
          corpo: [
            "Durante toda a vida você talvez tenha feito uma única pergunta: “será que ele vai gostar de mim?”. Quero que, a partir de agora, você faça outra, no mesmo instante: “eu escolheria ele?”.",
            "Ele pode ser bonito, interessante, engraçado, atencioso — pode até procurar você com insistência. E ainda assim resta a pergunta que realmente importa: ele combina com a vida que você quer construir?",
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
        conector: "Você não está mais apenas tentando ser percebida. Chegou ao ponto em que aprende a escolher.",
        frase: "Observe. Escolha. Conduza.",
      },
    },
  ],

  // ── A REVELAÇÃO (a montagem) ────────────────────────────────────────────────
  revelacao: {
    antes: [
      "Você já conhece as cinco peças.",
      "E talvez tenha percebido o padrão antes mesmo de eu revelar o desenho inteiro.",
    ],
    chamada: "Agora junte as peças",
    depois: "Você acabou de descobrir o método. Cada letra apareceu depois de você experimentar, na própria pele, o significado dela.",
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
      titulo: "Não são cinco dicas soltas. É uma sequência.",
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
      "Você chegou até aqui perguntando como fazer um homem perceber você. E talvez esteja saindo com uma pergunta bem diferente na cabeça:",
      { q: "“Eu escolheria esse homem?”" },
      "Percebe a virada? Você não estava, no fundo, esperando apenas ser escolhida. Estava, sem saber, aprendendo a escolher.",
      "A chave sempre esteve nas suas mãos. Agora que você sabe disso, só resta uma coisa a fazer: usá-la.",
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
