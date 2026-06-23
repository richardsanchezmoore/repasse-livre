-- Paginação da Central de Oportunidades: hoje a ordenação ("Mais recente",
-- "Maior Margem" etc.) é feita em JavaScript depois de buscar TODAS as linhas
-- do banco, o que não escala — a lista já passou de 100 itens em produção.
--
-- Para paginar de fato (LIMIT/OFFSET no SQL) é preciso ordenar no banco. O
-- caso "Mais recente" usa coalesce(data_publicacao_origem, data_captura) —
-- não é uma coluna simples, por isso a coluna gerada abaixo.

alter table opportunities
  add column if not exists data_ordenacao timestamptz
  generated always as (coalesce(data_publicacao_origem, data_captura)) stored;

-- Um índice por opção de ordenação, já combinando com o filtro de status
-- que toda aba aplica primeiro (descobertas/enviadas/aprovadas/rejeitadas).
create index if not exists idx_opportunities_status_data_ordenacao
  on opportunities (status, data_ordenacao desc);

create index if not exists idx_opportunities_status_margem
  on opportunities (status, margem_percentual desc);

create index if not exists idx_opportunities_status_preco
  on opportunities (status, preco);

-- Aplicar manualmente no SQL Editor do Supabase (migrations deste projeto
-- não rodam sozinhas).
