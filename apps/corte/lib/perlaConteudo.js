// ─────────────────────────────────────────────────────────────────────────────
//  PERLA · "Como se Tornar a Mulher que Ele Procura" — conteúdo desacoplado.
//
//  Fonte: V3 EDITORIAL DEFINITIVA (manuscrito do autor, 50 págs). Texto fiel;
//  prosa contínua, frases curtas só como impacto/revelação/transição.
//
//  Regra de ouro (parecer): o PERLA é um MECANISMO NARRATIVO descoberto
//  progressivamente — NÃO um selo de marca na abertura. A palavra "PERLA" e o
//  significado das letras só existem a partir de `revelacao`/`perla`.
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
      "Existe uma pergunta que muitas mulheres fazem em algum momento, quase sempre depois de observar outra mulher vivendo exatamente aquilo que elas gostariam de viver:",
      { q: "“O que ela tem que eu não tenho?”" },
      "Talvez você já tenha olhado para uma amiga que parece conhecer pessoas com facilidade, conversar sem esforço e, de alguma maneira, sempre acabar sendo lembrada. Enquanto isso, sua própria vida amorosa parece permanecer no mesmo lugar.",
      "E quando isso se repete por tempo suficiente, é fácil começar a procurar uma explicação em você mesma. Talvez eu não seja bonita o bastante. Talvez esteja acima do peso. Talvez seja tímida demais. Talvez precise mudar meu jeito. Ou talvez o homem certo simplesmente ainda não tenha aparecido.",
      "Mas existe outra possibilidade: talvez você nunca tenha aprendido a perceber as peças que fazem uma aproximação acontecer.",
      "Onde estar. Como ser percebida. O que sua presença comunica. O que escolher revelar. Como conversar. Como demonstrar interesse. Como reconhecer reciprocidade. Como colocar limites. E, principalmente, como escolher.",
      "Existe uma diferença enorme entre esperar que um homem apareça e aprender a conduzir a própria vida amorosa. Não vou ensinar você a perseguir homens, nem pedir que se transforme em outra pessoa. A proposta é muito mais interessante: mostrar como destravar aquilo que pode estar impedindo sua vida amorosa de se mover.",
      "Por isso, deixe de lado por algumas páginas os joguinhos, as frases prontas e a ideia de que basta “ser você mesma” enquanto espera que o destino resolva o resto. Talvez exista muito mais que você possa fazer. E talvez você ainda não tenha descoberto como.",
    ],
    assinatura: "— A Lady",
  },

  // ── EXISTE UMA CHAVE ────────────────────────────────────────────────────────
  chave: {
    rotulo: "Existe uma chave",
    img: "/livro/cena3.webp",
    corpo: [
      "Durante muito tempo, talvez você tenha acreditado que precisava ser mais bonita, mais magra, mais extrovertida ou simplesmente esperar o homem certo aparecer.",
      { q: "Talvez não." },
      "Existe uma sequência. Há uma lógica por trás de determinadas aproximações que parecem acontecer naturalmente. E existe um método capaz de organizar essas peças de uma maneira que você possa compreender e, principalmente, aplicar.",
      "Mas você não vai receber essa resposta inteira logo no começo. Algumas coisas precisam ser percebidas antes de receberem um nome. Ao longo dos encontros, uma peça vai aparecer, depois outra, até que aquilo que parecia uma coleção de situações diferentes comece a formar um desenho.",
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
          kicker: "Se a sua rotina não cria novos encontros, esperar por uma nova história pode se tornar uma tarefa interminável.",
          corpo: [
            { fala: "Eu quero conhecer alguém. Quero viver uma história. Mas parece que nunca aparece ninguém. Minha rotina é sempre a mesma: trabalho, casa, algumas pessoas conhecidas e, no domingo, igreja. Minhas amigas parecem conhecer homens sem fazer esforço, enquanto eu continuo esperando alguma coisa acontecer. Às vezes começo a pensar que simplesmente não existem homens interessados em mim.", quem: "Uma dama cansada de esperar" },
            "Minha querida, antes de procurar uma explicação em sua aparência ou no seu valor, quero lhe fazer uma pergunta bastante simples:",
            { q: "“Onde exatamente você espera que esse homem encontre você?”" },
            "Se a maior parte dos seus dias acontece nos mesmos lugares, com as mesmas pessoas e dentro de uma rotina que raramente abre espaço para alguém novo, não é difícil entender por que pouca coisa muda. Isso não significa que nada possa acontecer por acaso. Significa apenas que você está deixando uma parte enorme da sua vida amorosa nas mãos do acaso.",
            "Imagine duas mulheres entrando no mesmo ambiente. Uma chega, senta, acompanha o que está acontecendo e vai embora assim que termina. A outra cumprimenta as pessoas, conversa, se oferece para ajudar, fica alguns minutos depois e acaba conhecendo alguém que a convida para participar de outra atividade. As duas estiveram no mesmo lugar. A diferença foi o modo como participaram dele.",
            { q: "Uma esteve presente. A outra começou a fazer parte." },
            "Você não precisa entrar em cada ambiente pensando: “Onde está meu marido?”. Na verdade, isso provavelmente deixaria tudo mais pesado. O que precisa mudar é a disposição de construir uma vida que tenha movimento, pessoas e novas experiências.",
            { q: "Você não precisa sair procurando homens. Precisa parar de organizar uma vida na qual ninguém novo consegue entrar." },
          ],
          municoes: [
            "Amplie seus ambientes de convivência.",
            "Participe de verdade, em vez de apenas comparecer.",
            "Aceite convites saudáveis que ampliem seu círculo.",
            "Conheça pessoas novas sem transformar cada encontro em uma expectativa amorosa.",
            "Não deixe toda a sua vida amorosa depender de coincidências.",
          ],
          missao: "Escolha um ambiente novo ou uma atividade da qual possa participar mais esta semana. Não vá procurando um homem. Vá procurando movimento, experiências e novas conexões.",
          selo: "Não procure um homem. Procure movimento.",
        },
        {
          titulo: "Não basta aparecer",
          kicker: "Você precisa começar a fazer parte.",
          corpo: [
            "Você chegou, participou de uma atividade, conversou um pouco e foi embora. Na semana seguinte, voltou e percebeu que ninguém parecia lembrar de você. É fácil concluir que não chamou atenção. Mas talvez a explicação seja mais simples: você ainda não teve tempo de se tornar familiar.",
            { q: "Presença repetida cria familiaridade. Participação cria memória." },
            "Pense em um grupo grande. Há dezenas ou centenas de pessoas, e quase todas passam despercebidas umas pelas outras. Agora imagine um pequeno grupo dentro dele. Você conhece os nomes, ajuda em alguma coisa, participa da conversa, fica alguns minutos depois do encontro. Na semana seguinte, alguém pergunta: “Você vem sábado?”. A mudança não aconteceu porque você ficou mais bonita durante aquela semana. Aconteceu porque deixou de ser apenas um rosto no ambiente.",
            "E se você pensa “mas eu não sei fazer nada?”, talvez essa seja justamente a hora de começar como aprendiz. Você pode dizer: “Nunca fiz isso, mas gostaria de aprender. Posso ajudar?”. A disposição de participar costuma abrir portas que a tentativa de parecer pronta não abre.",
            { q: "Disponibilidade pode ser mais valiosa do que habilidade." },
          ],
          municoes: [
            "Participe.",
            "Ajude quando puder.",
            "Aprenda alguma coisa nova.",
            "Permaneça o suficiente para ser reconhecida.",
            "Faça um esforço genuíno para lembrar os nomes das pessoas.",
          ],
          missao: "Faça esta semana uma coisa que faça alguém associar seu nome a uma experiência positiva. Pode ser algo pequeno. O objetivo é deixar de ser apenas alguém que esteve ali.",
        },
        {
          titulo: "Crie o ecossistema",
          kicker: "Não construa uma estrada até um homem. Construa uma vida com vários caminhos de convivência.",
          img: "/livro/cena9.webp",
          corpo: [
            "Uma igreja pode oferecer cultos, departamentos, células, ministérios, grupos de estudo, ações sociais, eventos e retiros. Você não precisa frequentar tudo. Mas vale perceber que os ambientes menores costumam aproximar pessoas de uma maneira que uma multidão não consegue.",
            { q: "É onde a distância social diminui." },
            "Se você percebe interesse em alguém dentro de um departamento com duzentas pessoas, descobrir o pequeno grupo do qual ele participa pode representar uma oportunidade de conhecer dez pessoas, em vez de simplesmente observar uma entre duzentas. Não se trata de criar uma rota para chegar até ele. Trata-se de ampliar seu próprio ecossistema.",
            "Fora da igreja, a lógica continua. Trabalho, faculdade, cursos, eventos, amizades e comunidades também podem ampliar seu círculo de convivência. A diferença é que, nesses ambientes, você precisa ser ainda mais consciente dos valores que procura e dos limites que não pretende negociar.",
            { q: "Química aproxima. Valores sustentam." },
          ],
          municoes: [
            "Crie círculos de convivência.",
            "Aproxime-se de ambientes menores.",
            "Seja disponível sem se colocar à disposição de qualquer pessoa.",
            "Observe antes de idealizar.",
            "Não abandone seus fundamentos.",
          ],
          missao: "Desenhe seu ecossistema atual. Onde você circula? Quem conhece você? Onde poderia participar mais? Que tipo de ambiente está faltando?",
        },
      ],
      peca: {
        letra: "P",
        comando: "Posicione-se",
        pergunta: "Você percebeu?",
        conector: "Os encontros anteriores pareciam falar de situações diferentes. Na verdade, todos estavam apontando para a mesma direção: sair da espera, participar mais, ampliar os caminhos e criar movimento.",
        frase: "Pare de esperar. Crie movimento.",
        nota: "Talvez ainda seja cedo para dar um nome a tudo isso. Mas uma primeira peça acaba de aparecer. Guarde esta letra — as próximas páginas vão mostrar por que ela não está sozinha.",
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
          kicker: "Talvez ele simplesmente não tenha recebido um sinal de aproximação.",
          corpo: [
            "Você entra em um ambiente, escolhe um lugar mais reservado, pega o celular e passa boa parte do tempo olhando para a tela. Quando alguém olha na sua direção, você desvia. Depois vai embora pensando: “Ninguém me nota”.",
            { q: "Talvez você esteja comunicando fechamento sem perceber." },
            "Seu olhar, seu sorriso, sua postura e até a maneira como você usa a voz comunicam alguma coisa antes de você começar uma conversa. Nada disso exige que você se transforme em outra mulher. O primeiro passo é perceber quantas vezes você mesma acaba se escondendo.",
            "Uma mulher que mantém o rosto fechado pode simplesmente estar concentrada. Um homem, porém, não tem como adivinhar isso. Ele enxerga o que está diante dele. Um olhar que permanece por um instante a mais, um sorriso quando os olhos se encontram ou uma postura mais aberta podem transformar uma situação neutra em uma possibilidade de conversa.",
          ],
          municoes: [
            "Olhe para as pessoas quando estiver conversando.",
            "Sorria quando houver motivo para sorrir.",
            "Mantenha uma postura aberta e confortável.",
            "Fale com clareza, sem diminuir a própria voz.",
            "Não use o celular como esconderijo.",
            "Ocupe seu espaço sem tentar chamar atenção.",
          ],
          missao: "Durante uma semana, observe conscientemente sua postura e sua expressão. Não tente parecer outra pessoa. Apenas perceba quantas vezes você se fecha sem necessidade.",
        },
        {
          titulo: "Você não precisa de roupas caras",
          kicker: "Precisa entender o que a sua imagem comunica.",
          corpo: [
            "Vamos abandonar uma desculpa bastante comum: “Eu não tenho dinheiro para me vestir bem”. Você não precisa de grife para causar uma boa impressão. Precisa de cuidado, caimento, combinação, adequação e intenção.",
            { q: "Elegância não é preço. É intenção." },
            "Você também não precisa apagar sua personalidade para parecer mais feminina ou mais elegante. Se não gosta de vestidos, isso não significa que esteja condenada a se vestir de determinada maneira. Talvez ainda não tenha encontrado cortes, tecidos ou combinações que expressem quem você é de uma forma que lhe agrade.",
            "A questão não é fabricar uma personagem. É ampliar seu repertório. Você pode ter uma versão confortável para o cotidiano e outra mais elaborada para uma ocasião especial. Algumas descobertas só acontecem quando você se permite testar.",
            { q: "Não confunda identidade com resistência à mudança." },
            { mini: "Versão cotidiana" },
            "Confortável, funcional e coerente com sua personalidade.",
            { mini: "Versão especial" },
            "Quando a ocasião importa, você eleva deliberadamente a sua apresentação.",
          ],
          municoes: [
            "Priorize cuidado antes de preço.",
            "Caimento antes de marca.",
            "Adequação antes de tendência.",
            "Experimente antes de rejeitar.",
            "Elegância é intenção.",
          ],
          missao: "Monte duas versões de você: uma cotidiana e outra para ocasiões em que deseja causar uma impressão especial. Não pense primeiro em preço. Pense em mensagem, cuidado e coerência.",
        },
        {
          titulo: "Antes de ele conhecer você…",
          kicker: "Talvez ele já tenha conhecido o seu Instagram.",
          corpo: [
            "Hoje, uma aproximação pode começar antes mesmo de uma conversa. Ele pode encontrar seu perfil, ver uma fotografia, perceber os lugares que você frequenta e formar uma primeira impressão sem nunca ter trocado uma palavra com você.",
            "Seu perfil não precisa ser perfeito. Mas seria interessante que ele revelasse alguma coisa verdadeira: seus interesses, sua rotina, suas amizades, seu trabalho, sua fé, seus projetos ou aquilo que faz seus olhos brilharem.",
            { q: "Seu Instagram deve ser uma janela para sua vida, não a casa inteira." },
            "O mesmo vale para o WhatsApp. Foto, nome, status e principalmente a maneira como você conversa também fazem parte da impressão que deixa. A ideia não é construir uma personagem digital, e sim garantir que o ambiente virtual não contradiga completamente a mulher que você é fora da tela.",
          ],
          municoes: [
            "Mostre personalidade sem fabricar uma vida.",
            "Deixe seus interesses aparecerem naturalmente.",
            "Evite indiretas destinadas a alguém específico.",
            "Não transforme o perfil em um catálogo de validação.",
            "Seja coerente online e offline.",
          ],
          missao: "Abra seu próprio perfil como se fosse alguém conhecendo você pela primeira vez. Pergunte com honestidade: “Eu teria vontade de descobrir mais sobre essa mulher?”",
        },
      ],
      peca: {
        letra: "E",
        comando: "Expresse-se",
        pergunta: "Segunda peça",
        conector: "Você já percebeu que estar em um ambiente é apenas o começo. A maneira como você ocupa esse ambiente também produz informação.",
        frase: "Sua presença fala antes de você.",
        nota: "Mais uma peça foi descoberta. O desenho ainda está incompleto.",
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
            "Imagine que ele demonstra curiosidade e pergunta: “Me conta mais sobre você”. Você quer aproveitar a oportunidade e, sem perceber, conta a história inteira: infância, antigos relacionamentos, inseguranças, planos, problemas familiares, tudo em uma única conversa. Depois volta para casa pensando se falou demais.",
            "Talvez tenha falado. Mas o problema não é ser aberta. O problema é não deixar espaço para que a outra pessoa descubra você ao longo do tempo.",
            { q: "Você não precisa esconder o livro. Só não precisa entregar o final na primeira página." },
            "Mistério não é desaparecer, fazer joguinhos ou responder de propósito com evasivas. Mistério verdadeiro nasce de uma vida que possui camadas. Há coisas que você conta porque a conversa naturalmente chegou até elas e outras que só fazem sentido depois que existe confiança suficiente.",
          ],
          missao: "Escreva cinco coisas sobre você que alguém precisaria conviver para descobrir. Depois observe quantas delas revelam que sua história é muito maior do que aquilo que você costuma mostrar logo de início.",
        },
        {
          titulo: "Não tente parecer interessante",
          kicker: "Construa uma vida que tenha histórias para contar.",
          corpo: [
            "“O que você gosta de fazer?” “Ah… nada demais.”",
            { q: "Você não precisa ter uma vida cinematográfica. Precisa ter uma vida que produza histórias." },
            "Você não precisa ter uma vida extraordinária, viajar para quinze países ou possuir hobbies exóticos. Mas é importante ter alguma coisa que desperte curiosidade em você mesma. Pode ser um livro, um curso, uma atividade, uma viagem simples, um projeto, uma habilidade que esteja aprendendo ou uma experiência que queira viver.",
            "Faça isso porque a sua vida merece ser vivida, e não como uma estratégia para conquistar homens. Curiosamente, é justamente quando você deixa de construir uma vida para ser admirada e começa a construir uma vida que realmente gosta de viver que passa a ter mais coisas para compartilhar.",
          ],
          missao: "Liste três coisas que você sabe, três que gostaria de aprender e três que gostaria de viver. Escolha uma e transforme a intenção em uma pequena ação esta semana.",
        },
      ],
      peca: {
        letra: "R",
        comando: "Revele-se",
        pergunta: "Terceira peça",
        conector: "Talvez você já esteja começando a perceber o padrão: primeiro você cria movimento, depois aprende a comunicar quem é e, agora, começa a entender que aquilo que revela também pode construir curiosidade.",
        frase: "Mostre o suficiente para despertar vontade de descobrir mais.",
      },
    },

    {
      n: "04",
      nome: "Linguagem",
      frase: "Quando a curiosidade encontra uma conversa que vale a pena continuar.",
      img: "/livro/cena5.webp",
      encontros: [
        {
          titulo: "A arte de fazer uma conversa continuar",
          kicker: "Conversa não é entrevista. É dança.",
          corpo: [
            "Ele: “Trabalho com arquitetura.” Você: “Legal.” E então surge aquele silêncio que parece durar uma eternidade.",
            "Agora imagine outra resposta: “Você sempre quis trabalhar com isso?”. Ele explica que não, conta como chegou à profissão e você descobre uma história que não teria aparecido se tivesse parado no “legal”.",
            { mini: "Fato → Experiência → História" },
            "“Você trabalha com arquitetura.” → “Você gosta?” → “Como acabou escolhendo isso?”",
            "Uma boa conversa não é uma entrevista na qual você precisa fazer pergunta atrás de pergunta. Você escuta, encontra um ponto de interesse e acrescenta alguma coisa sua. Ele conta, você comenta, ele desenvolve, você lembra de uma experiência parecida. E, pouco a pouco, duas pessoas deixam de trocar informações e começam a construir uma conversa.",
            { q: "Conversa não é entrevista. É dança." },
          ],
          missao: "Na próxima conversa, faça uma pergunta que você realmente queira saber. Depois, escute a resposta sem preparar mentalmente a próxima pergunta.",
        },
        {
          titulo: "Quando a conversa vai para o WhatsApp",
          kicker: "O celular não deveria carregar, sozinho, o peso da conexão.",
          corpo: [
            "“Oi.” “Oi.” “Tudo bem?” “Tudo.” “O que está fazendo?” “Nada.” “Ah.”",
            { q: "Uma conversa pode morrer de falta de assunto muito antes de existir falta de interesse." },
            "O problema não é o WhatsApp. O problema é quando ele recebe uma responsabilidade que deveria pertencer à conexão. Se vocês tiveram uma conversa interessante, use o WhatsApp para retomá-la: mencione algo que comentaram, compartilhe uma situação que lembrou da conversa ou pergunte por algo que ele havia contado.",
            "E não transforme o celular em instrumento de medição de afeto. Uma resposta em três minutos não prova interesse; uma demora de três horas não prova rejeição. Pessoas continuam trabalhando, estudando, dirigindo, dormindo e vivendo.",
          ],
          municoes: [
            "Não cronometre respostas.",
            "Não interprete cada silêncio como uma mensagem escondida.",
            "Retome histórias que vocês realmente viveram.",
            "Observe reciprocidade ao longo do tempo.",
            "Não permita que o celular se torne o centro da relação.",
          ],
          missao: "Pare de calcular. Responda naturalmente, converse quando tiver algo a dizer e observe como a outra pessoa participa da construção da conversa.",
        },
        {
          titulo: "Você pode deixar ele saber que gostou",
          kicker: "Interesse não diminui o seu valor.",
          corpo: [
            "Existe uma ideia estranha de que demonstrar interesse faria uma mulher perder valor. Não faz.",
            { q: "Interesse não diminui seu valor." },
            "Um sorriso pode demonstrar interesse. Uma pergunta pode demonstrar interesse. Uma resposta entusiasmada, um elogio ou a aceitação de um convite também. O que diferencia interesse de perseguição é a reciprocidade: você oferece um sinal e observa se o outro também se move.",
            { q: "Dê um passo. Observe o próximo." },
            "Você pode simplesmente dizer: “Gostei de conversar com você”. Se ele também gostou, existe espaço para que demonstre isso. Você não precisa carregar a aproximação inteira nas costas.",
          ],
          missao: "Quando gostar genuinamente de uma aproximação, permita que isso apareça de maneira simples e clara. Depois, observe o próximo movimento dele.",
        },
      ],
      peca: {
        letra: "L",
        comando: "Linguagem",
        pergunta: "Quarta peça",
        conector: "Agora a aproximação já não depende apenas de estar no lugar certo ou de causar uma boa impressão. Existe uma conversa, existe troca e existe a possibilidade de construir conexão.",
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
            "Não é preciso criar testes para descobrir se alguém gosta de você. Não desapareça de propósito, não provoque ciúmes e não invente situações para medir a reação dele. Observe o comportamento ao longo do tempo.",
            "Um homem pode ser extremamente intenso durante uma semana e desaparecer na seguinte. Outro pode ser mais discreto, mas aparecer, cumprir o que promete, procurar você e respeitar seus limites. O que importa é o padrão.",
          ],
          missao: "Durante algumas semanas, substitua a pergunta “Será que ele gosta de mim?” por outra: “O comportamento dele está mostrando o quê?”",
        },
        {
          titulo: "O desejo pode ser forte",
          kicker: "Seus limites precisam ser mais fortes.",
          img: "/livro/cena6.webp",
          corpo: [
            "Sentir atração não é uma falha. Gostar de alguém também não. O cuidado começa quando a emoção passa a tomar decisões que deveriam continuar sendo suas.",
            { q: "Você precisa decidir seus limites antes do momento em que precisará defendê-los." },
            "Se você sabe o que é inegociável para você, não precisa improvisar quando a situação ficar emocionalmente intensa. Pode dizer, por exemplo: “Eu gosto de você, mas não quero avançar dessa maneira agora”. Não é necessário transformar isso em discurso ou batalha. É apenas uma decisão clara.",
            "Depois, observe. Ele respeita? Continua interessado em conhecer você? Mantém o respeito quando não consegue aquilo que queria? Ou começa a pressionar, manipular ou diminuir seus limites? O comportamento diante do seu “não” costuma ensinar muito mais do que uma declaração bonita.",
            { q: "O tempo revela intenções." },
            "Para uma mulher cristã, existe ainda um fundamento que não deveria ser negociado para conquistar um relacionamento: aquilo que sua consciência reconhece como correto. A fé não precisa aparecer como um discurso a cada página; ela pode aparecer justamente naquilo que você decide não negociar.",
          ],
          missao: "Escreva: O que é inegociável para mim em um relacionamento? Quais limites protegem essas escolhas?",
        },
        {
          titulo: "Você também escolhe",
          kicker: "Existe diferença entre imperfeição e incompatibilidade.",
          corpo: [
            "“Será que ele vai gostar de mim?” Agora faça uma pergunta diferente: “eu escolheria ele?”.",
            "Essa mudança de perspectiva parece pequena, mas altera completamente a posição em que você se coloca. Ele pode ser bonito, interessante, engraçado, carinhoso e muito atraente. Pode procurar você e fazer seu coração acelerar. Ainda assim, vale perguntar: “Ele combina com a vida que eu quero construir?”.",
            "Atração e compatibilidade não são a mesma coisa. Você pode sentir uma química enorme e, ao mesmo tempo, perceber diferenças profundas em valores, fé, caráter, maturidade, respeito ou visão de relacionamento.",
            { q: "Existe diferença entre imperfeição e incompatibilidade." },
            "Você não precisa transformar um homem em vilão para reconhecer que ele não é adequado para você. Às vezes, não combinar já é informação suficiente.",
          ],
          missao: "Complete a frase: “O homem que eu quero ao meu lado precisa…”. Depois liste características, valores e limites que realmente importam para você.",
        },
      ],
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
        frase: "Observe comportamentos, proteja seus limites e escolha com consciência.",
      },
    },
  ],

  // ── A REVELAÇÃO (a montagem) ────────────────────────────────────────────────
  revelacao: {
    antes: [
      "Você já conhece as cinco peças.",
      "Talvez você tenha percebido o padrão antes mesmo de eu revelar o desenho inteiro.",
    ],
    chamada: "Agora junte as peças",
    depois:
      "Você acabou de descobrir o método. Cada letra apareceu depois que você viveu seu significado. Por isso, quando o nome finalmente aparece, ele não parece uma etiqueta colocada sobre a obra — parece a resposta para uma pergunta que estava sendo construída desde o começo.",
  },

  // ── PERLA (o significado, enfim nomeado) ────────────────────────────────────
  perla: {
    palavra: "PERLA",
    significados: [
      { letra: "P", titulo: "Posicione-se", desc: "Crie movimento e novas possibilidades de convivência." },
      { letra: "E", titulo: "Expresse-se", desc: "Faça sua presença comunicar quem você é." },
      { letra: "R", titulo: "Revele-se", desc: "Mostre o suficiente para despertar curiosidade sem recorrer a jogos." },
      { letra: "L", titulo: "Linguagem", desc: "Transforme aproximação em conversa e conversa em conexão." },
      { letra: "A", titulo: "Ação", desc: "Observe comportamentos, proteja seus limites e escolha com consciência." },
    ],
    sequencia: {
      titulo: "Não são cinco dicas. É uma sequência.",
      linhas: [
        "Você não começa pela conversa. Antes dela, existe a maneira como sua vida cria — ou não cria — oportunidades de encontro.",
        "Antes da conexão, existe a forma como sua presença e sua expressão chegam ao outro. Antes da intimidade, existe aquilo que você escolhe revelar.",
        "E, quando a aproximação se torna real, existe a linguagem que sustenta a troca e a ação que permite discernir o que merece continuar.",
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
      "Você chegou aqui querendo entender como fazer um homem perceber você. Talvez esteja saindo com uma pergunta muito mais importante:",
      { q: "“Eu escolheria esse homem?”" },
      "Essa mudança de perspectiva importa. Você não precisa passar a vida inteira esperando que alguém apareça para então descobrir o que fazer. Pode criar movimento, ampliar seus ambientes, comunicar melhor quem é, aprender a construir conexão e, quando alguém surgir, observar com atenção antes de entregar a ele um lugar que talvez ainda não tenha merecido.",
      "Você não controla quem vai se apaixonar por você. Não controla quando uma história começa. Mas pode controlar muito mais do caminho do que talvez imaginasse.",
      "Você não estava esperando apenas ser escolhida. Estava aprendendo a escolher. A chave está nas suas mãos. Agora use-a.",
    ],
    assinatura: "— A Lady",
  },

  encerramento: {
    linha: "A guinada começa quando você deixa de apenas esperar.",
    rodape: "A jornada continua. Você já descobriu a chave — agora começa a parte mais importante: colocá-la em movimento na sua própria vida.",
  },
};

// Ordem canônica das letras (o rastreador de descoberta consome isto).
export const LETRAS = PERLA.perla.significados.map((s) => s.letra); // ["P","E","R","L","A"]
