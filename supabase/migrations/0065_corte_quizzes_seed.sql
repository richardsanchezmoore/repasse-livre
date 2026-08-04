-- 0065: "transplante" do quiz hardcode (lib/quiz.js) para o banco, virando editável no
-- /admin/quizzes, + um 2º quiz com 8 perguntas novas do nicho (pronto p/ A/B, inativo).
-- Idempotente: ON CONFLICT (slug) DO NOTHING (não sobrescreve edições futuras do admin).

-- 1) Transplante do "Cavalheiro ou Libertino" (ATIVO — o que o /investigar já serve)
insert into public.corte_quizzes (slug, titulo, ativo, dados)
values (
  'cavalheiro-ou-libertino',
  'Ele é um Cavalheiro ou um Libertino?',
  true,
  $json$
  {
    "lead": "Responda com honestidade. Some os pontos e descubra se o rapaz que ocupa as suas orações realmente merece o seu altar.",
    "max": 12,
    "questoes": [
      {"t":"Quando você discorda dele ou questiona uma atitude, como ele reage?","opcoes":[
        {"p":3,"t":"Ele ouve com paciência, reflete de forma madura e busca o entendimento."},
        {"p":2,"t":"Ele fica em silêncio, muda de assunto ou finge que nada aconteceu."},
        {"p":1,"t":"Ele se irrita, usa a Bíblia para dizer que você é rebelde ou inverte a culpa."}]},
      {"t":"Como é a vida financeira e de trabalho dele no dia a dia?","opcoes":[
        {"p":3,"t":"É trabalhador, honrado, cuida do que tem e assume responsabilidades."},
        {"p":2,"t":"Fala muito de investimentos futuros, mas vive mudando de planos e empregos."},
        {"p":1,"t":"É escorado na família, reclama de trabalhar e adora que você pague as contas."}]},
      {"t":"O que os frutos dele dizem quando ele está fora do ambiente de culto?","opcoes":[
        {"p":3,"t":"Trata bem os garçons, cumpre o que promete e não vive de fofocas."},
        {"p":1,"t":"É um rapaz neutro, mas liga muito para aparências e redes sociais."},
        {"p":0,"t":"Tem uma vida dupla, fala mal das pessoas pelas costas e tem explosões de raiva."}]},
      {"t":"Há quanto tempo vocês conversam sem que ele tome uma atitude clara de compromisso?","opcoes":[
        {"p":3,"t":"O tempo necessário para se conhecer; ele já demonstrou intenção clara."},
        {"p":1,"t":"Pouquíssimo tempo, mas ele já fala em casamento como se fôssemos noivos de anos."},
        {"p":0,"t":"Meses ou anos \"esperando o tempo de Deus\", mas nunca oficializa."}]}
    ],
    "faixas": [
      {"min":10,"cls":"green","titulo":"O Cavalheiro de Verdade","texto":"Respire aliviada, minha querida. O seu pretendente demonstra frutos reais de um homem que teme ao Senhor. Ele não é perfeito (afinal, perfeição só no céu), mas está pronto para construir um lar seguro com você. Prossiga com oração."},
      {"min":6,"cls":"amber","titulo":"Alerta Amarelo na Corte","texto":"Atenção. Este homem carrega traços de indecisão ou aparências. Fala coisas bonitas nos bailes, mas faltam atitudes firmes na vida real. Observe os frutos dele de perto por mais uma temporada antes de entregar a chave do seu jardim fechado."},
      {"min":0,"cls":"red","titulo":"Fuja para as Colinas!","texto":"O diagnóstico é claro: este homem é uma autêntica armadilha bíblica. Seja o Duque Oculto, o Visconde Iracundo ou o Cavalheiro de Palavras Doces, ele vai destruir a sua paz. Guarde seu coração e corra antes que a temporada termine em desastre."}
    ]
  }
  $json$::jsonb
)
on conflict (slug) do nothing;

-- 2) Quiz novo — "O Raio-X do Pretendente" (8 perguntas do nicho; INATIVO, pronto p/ testar)
insert into public.corte_quizzes (slug, titulo, ativo, dados)
values (
  'raio-x-do-pretendente',
  'O Raio-X do Pretendente',
  false,
  $json$
  {
    "lead": "Um raio-x honesto do rapaz que ocupa as suas orações. Responda com o coração e os olhos abertos — os frutos não mentem.",
    "max": 24,
    "questoes": [
      {"t":"Como ele trata a própria mãe e as mulheres da família dele?","opcoes":[
        {"p":3,"t":"Com honra, paciência e respeito — o jeito que ele trata a mãe é o ensaio de como tratará você."},
        {"p":1,"t":"É educado, mas distante; cumpre a obrigação sem muito carinho."},
        {"p":0,"t":"Trata com desprezo ou deboche — sinal de como falará de você amanhã."}]},
      {"t":"Diante dos limites físicos de vocês antes do casamento, como ele age?","opcoes":[
        {"p":3,"t":"Protege a sua pureza mais do que você — prefere honrar a Deus a satisfazer a vontade."},
        {"p":1,"t":"Respeita quando você impõe, mas testa os limites de vez em quando."},
        {"p":0,"t":"Pressiona ou faz chantagem: 'se me amasse, provaria'."}]},
      {"t":"A fé dele é de intimidade ou de vitrine?","opcoes":[
        {"p":3,"t":"Busca a Deus no escondido, mesmo quando ninguém está vendo."},
        {"p":1,"t":"É fiel ao culto, mas a fé some no dia a dia fora da igreja."},
        {"p":0,"t":"Usa a linguagem espiritual como palco — muita aparência, pouca raiz."}]},
      {"t":"Estar com ele te aproxima ou te afasta de Deus, da família e das amigas?","opcoes":[
        {"p":3,"t":"Me aproxima — ele celebra as minhas boas amizades e a minha fé, sem ciúmes."},
        {"p":1,"t":"Não atrapalha, mas também não faz questão dessas relações."},
        {"p":0,"t":"Me isola aos poucos — critica minha família, minhas amigas e minha igreja."}]},
      {"t":"Como ele reage quando é corrigido por um líder, um pastor ou alguém mais velho?","opcoes":[
        {"p":3,"t":"Recebe com humildade, pondera e amadurece — coração ensinável."},
        {"p":1,"t":"Aceita na frente, mas reclama depois nos bastidores."},
        {"p":0,"t":"Se ofende ou acha que ninguém tem autoridade sobre ele."}]},
      {"t":"E quando ele é contrariado ou não consegue o que quer?","opcoes":[
        {"p":3,"t":"Mantém o domínio próprio, conversa e busca o bem comum."},
        {"p":1,"t":"Fica emburrado por um tempo, mas passa."},
        {"p":0,"t":"Explode, ameaça terminar ou me pune com silêncio para me controlar."}]},
      {"t":"Ele assume os próprios erros e pede perdão de verdade?","opcoes":[
        {"p":3,"t":"Reconhece quando erra, pede perdão sincero e muda a atitude."},
        {"p":1,"t":"Pede desculpa rápida para encerrar o assunto, mas repete o erro."},
        {"p":0,"t":"Nunca é o culpado — sempre dá um jeito de virar a culpa para mim."}]},
      {"t":"Ele te apresenta abertamente à vida dele — família, igreja, amigos — ou te mantém na sombra?","opcoes":[
        {"p":3,"t":"Me apresenta com orgulho a todos; a relação tem luz e testemunhas."},
        {"p":1,"t":"Me apresenta a alguns, mas evita certos círculos sem explicar."},
        {"p":0,"t":"Me mantém escondida e some das redes — uma relação de segredo."}]}
    ],
    "faixas": [
      {"min":20,"cls":"green","titulo":"O Boaz da sua Temporada","texto":"Que alegria, minha querida! Os frutos deste rapaz revelam caráter, domínio próprio e fé de raiz. Ele te aproxima de Deus e não te esconde do mundo. Prossiga com sabedoria, oração e alegria — este é solo bom para plantar um lar."},
      {"min":12,"cls":"amber","titulo":"Um Pretendente a Observar","texto":"Há coisas boas nele, mas também sombras que pedem tempo. Palavras bonitas ainda não são atitudes firmes. Não entregue a chave do seu jardim fechado por pressa: observe os frutos por mais uma temporada, de olhos abertos e coração guardado."},
      {"min":0,"cls":"red","titulo":"Guarda o teu Coração","texto":"O raio-x acusou feridas sérias: controle, orgulho ou vida dupla. Por mais doce que seja o encantamento, esse caminho rouba a sua paz. Recue, busque conselho de quem te ama de verdade e lembre: é melhor esperar por Boaz do que se casar com a armadilha."}
    ]
  }
  $json$::jsonb
)
on conflict (slug) do nothing;
