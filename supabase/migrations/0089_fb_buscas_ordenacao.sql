-- ════════════════════════════════════════════════════════════════════════════
-- O INSTRUMENTO DO "ÚLTIMO VISTO" (Gustavo, 07/10/2026)
--
-- ★ A PERGUNTA DELE: *"precisamos averiguar o mecanismo que utilizávamos para
-- identificar se alcançávamos o último visto no Facebook, para saber se
-- realmente estamos pegando anúncios frescos a cada visita ou aleatórios, com o
-- Facebook forçando nossa visualização com 'perto de você' / 'recém anunciado'."*
--
-- ⚠️⚠️ FUI OLHAR E O MECANISMO NÃO EXISTE PARA O FACEBOOK. `fb_vistos` tem
-- (item_id, status, visto_em) e grava "vi este id uma vez"; a dedup então salta
-- o anúncio para sempre. O `ultimo_visto` que aparece no código da captação é
-- coluna de `opportunities`, escrita só no insert. O livro-razão com
-- reavistamento é o do Mercado Livre (`ml_vistos`), nunca portado para cá.
--
-- Resultado: a informação que responderia a pergunta é JOGADA FORA a cada
-- rodada. Nenhuma análise das faixas conserta isso — falta o registro.
--
-- ═══ POR QUE UMA LINHA POR BUSCA, E NÃO UMA POR ANÚNCIO ═══
--
-- Uma linha por anúncio avistado daria ~19 mil linhas/dia. ⚠️ Já estouramos o
-- egress do Supabase uma vez neste projeto; não vou instrumentar criando o
-- próximo problema. Guardando os ids NA ORDEM em que o Facebook devolveu, uma
-- linha por busca resolve com ~800 linhas/dia — e responde MAIS, porque a ordem
-- é o dado que denuncia a ordenação:
--
--   · mesmas buscas em rodadas seguidas se sobrepõem?  → ele honra a ordenação
--   · as posições embaralham entre rodadas?            → ele está rodando o que mostra
--   · o id mais antigo que conhecemos aparece no fim?   → alcançamos o fundo da faixa
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists fb_buscas (
  id            bigserial primary key,
  -- carimbo do início da rodada: agrupa as ~132 buscas de uma varredura só
  rodada        timestamptz not null,
  praca         text        not null,
  faixa_min     bigint      not null,
  faixa_max     bigint      not null,
  executada_em  timestamptz not null default now(),
  -- ★ NA ORDEM em que o Facebook devolveu, ANTES de qualquer dedup nosso:
  -- filtrar aqui destruiria justamente o sinal de posição.
  ids           text[]      not null default '{}',
  total         int         not null default 0
);

create index if not exists fb_buscas_praca_faixa_idx
  on fb_buscas (praca, faixa_min, executada_em desc);
create index if not exists fb_buscas_rodada_idx on fb_buscas (rodada desc);

-- ⚠️ Tabela de telemetria: ninguém lê pelo site. RLS deny-all, igual ao resto
-- (o worker usa service_role e passa por cima).
alter table fb_buscas enable row level security;

comment on table fb_buscas is
  'Telemetria de ordenação do Marketplace: ids devolvidos por cada busca, na ordem. Serve para saber se alcançamos o último visto ou se o Facebook rotaciona o que mostra. Retenção de 14 dias, limpa pela própria captação.';
