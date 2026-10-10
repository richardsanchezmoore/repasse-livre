-- ════════════════════════════════════════════════════════════════════════════
-- A TABELA DE REFERÊNCIA DO AUTO RADAR PY — publicada, datada, consultável.
--
-- ★★★ O QUE ISTO DESTRAVA: até agora `tabelaReferenciaPY.ts` só IMPRIMIA no
-- terminal. O site nunca viu a tabela, e por isso o selo que o Gustavo desenhou
-- — *"3% por debajo de la tabla AutoRadarPY"* — era impossível de mostrar.
--
-- ★★ A TESE DO PRODUTO: no Paraguai NÃO EXISTE FIPE. O Auto Radar não acha
-- desconto contra uma referência pronta; ele CRIA a referência. Esta tabela é
-- esse ativo — e é o que nos separa do Carden, que publica a "média" de UM
-- anúncio sem dizer quantos.
--
-- ═══ ⚠️⚠️ POR QUE A CHAVE INCLUI O MÊS ═══
--
-- A tentação é uma linha por (modelo, ano) e recalcular por cima. Isso apaga o
-- passado a cada rodada — exatamente o que o Gustavo proibiu: *"não podemos
-- nunca desperdiçar os preços... como faz a tabela FIPE... observável anos
-- depois"*.
--
-- ★ Com `mes` na chave, cada recálculo escreve O MÊS CORRENTE e os anteriores
-- ficam intactos. Em um ano isto responde "quanto valia um Vitz XP90 em
-- outubro de 2026?" sem nenhum trabalho extra — que é literalmente o que a
-- FIPE vende.
--
-- ⚠️ E o recálculo DENTRO do mês é idempotente (upsert na chave), então rodar
-- dez vezes no mesmo dia não duplica nada.
--
-- ═══ ⚠️ DUAS LINHAS PARA O MESMO CARRO, DE PROPÓSITO ═══
--
-- `escopo` = 'ano' ou 'geracao'. As duas coexistem porque respondem perguntas
-- diferentes — "quanto vale um Vitz 2010?" e "quanto vale um Vitz XP90?" —, do
-- mesmo jeito que a FIPE tem modelo e ano. Quem consulta usa a mais específica
-- que existir; a geração é a rede para o ano que não reuniu amostra.
--
-- ⚠️ Nenhum anúncio é contado duas vezes DENTRO de um escopo. Entre escopos,
-- sim: a linha da geração é calculada sobre TODOS os anúncios dela (ver o
-- cabeçalho de tabelaReferenciaPY.ts — a versão que usava só as sobras produzia
-- um número que não significava mercado nenhum).
--
-- ═══ ⚠️ A MOEDA É PARTE DA CHAVE ═══
--
-- No Paraguai o mesmo carro sai anunciado em guarani por um e em dólar por
-- outro. Fundir as duas amostras exigiria converter por uma cotação — e a
-- cotação do dia da consulta não é a do dia do anúncio. Então são escadas
-- separadas, e a comparação do selo é sempre contra a linha da MESMA moeda.
--
-- ⚠️ Custo conhecido: parte a amostra em duas e atrasa a publicação de algumas
-- linhas. É o preço de não inventar número.
--
-- ═══ O n FICA GUARDADO, mesmo sem ir para a tela ═══
--
-- O Gustavo decidiu que o site NÃO mostra "(11 ofertas)": *"mostrar ofertas
-- enfraquece"*. Mas o n precisa estar aqui — é ele que decide se a linha é
-- publicável, é ele que pondera o agrupamento de anos, e é ele que permite
-- auditar a tabela depois. Decisão de TELA não é decisão de DADO.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists py_tabela_referencia (
  id              bigserial   primary key,

  -- ★ O mês de referência (dia 1). Mesma unidade do livro de observações.
  mes             date        not null,

  marca           text,
  modelo          text        not null,

  -- 'ano' | 'geracao'
  escopo          text        not null,
  -- O ano ("2010") ou o código da geração ("XP90").
  chave           text        not null,
  moeda           text        not null,

  -- ⚠️ Quando o PAVA juntou anos que a amostra não separa: "2006+2007".
  -- Sem isto a tela não tem como dizer "referência agrupada 2006–2007", que o
  -- Gustavo aprovou manter.
  anos_agrupados  text,
  -- "2005–2010" para a linha de geração — sem isso "Vitz XP90" não diz nada
  -- para quem tem um Vitz 2007 na mão.
  intervalo_anos  text,

  -- Ofertas DISTINTAS (não anúncios): é o n que vale.
  n               int         not null,
  -- Quantos anúncios existiam de fato. A diferença revela o reanúncio.
  anuncios        int         not null,

  mediana         numeric     not null,
  q1              numeric,
  q3              numeric,
  minimo          numeric,
  maximo          numeric,

  -- 'boa' (5+) | 'fraca' (3+). 'insuficiente' NÃO é gravado: não é tabela.
  confianca       text        not null,

  calculado_em    timestamptz not null default now(),

  -- ⚠️ A chave do upsert. Recalcular o mesmo mês sobrescreve; meses anteriores
  -- ficam de pé.
  unique (mes, modelo, escopo, chave, moeda)
);

-- A consulta que o site faz: "a tabela do mês corrente", de uma vez só.
create index if not exists py_tabref_mes_idx on py_tabela_referencia (mes);
-- A consulta do selo: "a linha deste modelo".
create index if not exists py_tabref_busca_idx on py_tabela_referencia (mes, modelo, escopo, chave, moeda);
-- A página da tabela: Marca → Modelo.
create index if not exists py_tabref_marca_idx on py_tabela_referencia (mes, marca, modelo);

-- ⚠️ RLS ligada e SEM policy = ninguém lê pelo anon. O site lê pela service key
-- no servidor, como o resto. Mesma postura de 0035/0036.
alter table py_tabela_referencia enable row level security;

comment on table py_tabela_referencia is
  'A tabela de referência de preço do Auto Radar PY, publicada por MÊS (como a FIPE). Recalcular escreve só o mês corrente; os anteriores ficam como registro histórico. Derivada de py_observacoes_preco, não de opportunities — o anúncio é efêmero, a observação não.';

comment on column py_tabela_referencia.n is
  'Ofertas distintas. NÃO vai para a tela (decisão do Gustavo: "mostrar ofertas enfraquece"), mas decide se a linha é publicável e pondera o agrupamento de anos.';
