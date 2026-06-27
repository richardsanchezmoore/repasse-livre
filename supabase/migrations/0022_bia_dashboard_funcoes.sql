-- Funções de agregação pro painel BIA (/bia, painel admin). Marca/modelo
-- extraídos com a mesma heurística já usada em snapshotDiario.ts/lib/marca.ts
-- (1ª e 2ª palavra do título) — replicada em SQL via split_part pra rodar
-- a agregação direto no banco, sem trazer milhares de linhas pra JS.
--
-- "Estoque" (escopo de quase todas as funções) = origem_tipo='descoberta'
-- e status != 'rejeitada' — mesmo critério do snapshot diário (ver
-- supabase/migrations/0021_bi_snapshot_diario.sql), representa tudo que o
-- motor de descoberta já viu e não descartou, não só o que foi aprovado.

create or replace function bia_resumo()
returns table (
  descobertas_hoje bigint,
  descobertas_7d bigint,
  descobertas_30d bigint,
  valor_potencial numeric,
  anuncios_publicados bigint,
  desconto_medio numeric
)
language sql
stable
as $$
  select
    (select count(*) from opportunities where origem_tipo = 'descoberta' and data_captura >= current_date) as descobertas_hoje,
    (select count(*) from opportunities where origem_tipo = 'descoberta' and data_captura >= current_date - interval '7 days') as descobertas_7d,
    (select count(*) from opportunities where origem_tipo = 'descoberta' and data_captura >= current_date - interval '30 days') as descobertas_30d,
    (select coalesce(sum(fipe_valor - preco), 0) from opportunities where origem_tipo = 'descoberta' and status != 'rejeitada') as valor_potencial,
    (select count(*) from opportunities where status = 'aprovada') as anuncios_publicados,
    (select coalesce(avg(margem_percentual), 0) from opportunities where origem_tipo = 'descoberta' and status != 'rejeitada') as desconto_medio;
$$;

-- Descobertas por dia, últimos N dias (gráfico de linha/barra).
create or replace function bia_descobertas_por_dia(p_dias int default 30)
returns table (dia date, quantidade bigint)
language sql
stable
as $$
  select date_trunc('day', data_captura)::date as dia, count(*) as quantidade
  from opportunities
  where origem_tipo = 'descoberta'
    and data_captura >= current_date - (p_dias - 1) * interval '1 day'
  group by dia
  order by dia;
$$;

-- Valor potencial por dia a partir do snapshot (reconstrução exata: soma de
-- médias * quantidade por marca+modelo equivale à soma real do dia, ver
-- snapshotDiario.ts). Só linhas nacionais (estado is null) pra não contar em dobro.
create or replace function bia_valor_potencial_historico(p_dias int default 30)
returns table (dia date, valor_potencial numeric)
language sql
stable
as $$
  select data as dia, sum((fipe_medio - preco_medio) * quantidade) as valor_potencial
  from bi_snapshot_diario
  where estado is null
    and data >= current_date - (p_dias - 1) * interval '1 day'
  group by data
  order by data;
$$;

-- "Mais disputados": ranking marca+modelo+estado por volume, com melhor
-- margem e faixa de KM — onde estão as melhores oportunidades por região.
create or replace function bia_mais_disputados(p_limite int default 20)
returns table (
  marca text,
  modelo text,
  estado text,
  quantidade bigint,
  melhor_margem numeric,
  km_min int,
  km_max int
)
language sql
stable
as $$
  select
    split_part(veiculo, ' ', 1) as marca,
    split_part(veiculo, ' ', 2) as modelo,
    estado,
    count(*) as quantidade,
    max(margem_percentual) as melhor_margem,
    min(km) as km_min,
    max(km) as km_max
  from opportunities
  where origem_tipo = 'descoberta'
    and status != 'rejeitada'
    and estado is not null
    and split_part(veiculo, ' ', 2) != ''
  group by marca, modelo, estado
  order by quantidade desc
  limit p_limite;
$$;

-- Marcas de luxo por estado — lista fixa (mesmo princípio do exemplo do
-- usuário: BMW/Mercedes-Benz/Audi/Lexus). Adicionar marca nova = só incluir
-- no array abaixo, sem migration nova.
create or replace function bia_marcas_luxo_por_estado()
returns table (marca text, estado text, quantidade bigint)
language sql
stable
as $$
  select split_part(veiculo, ' ', 1) as marca, estado, count(*) as quantidade
  from opportunities
  where origem_tipo = 'descoberta'
    and status != 'rejeitada'
    and estado is not null
    and split_part(veiculo, ' ', 1) = any (array['BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Porsche', 'Land'])
  group by marca, estado
  order by marca, quantidade desc;
$$;

-- Estados mais ativos por estoque (volume) e valor médio.
create or replace function bia_estados_mais_ativos()
returns table (estado text, quantidade bigint, preco_medio numeric)
language sql
stable
as $$
  select estado, count(*) as quantidade, avg(preco) as preco_medio
  from opportunities
  where origem_tipo = 'descoberta' and status != 'rejeitada' and estado is not null
  group by estado
  order by quantidade desc;
$$;

-- Cidades mais ativas (top N) por estoque e valor médio.
create or replace function bia_cidades_mais_ativas(p_limite int default 20)
returns table (cidade text, estado text, quantidade bigint, preco_medio numeric)
language sql
stable
as $$
  select cidade, estado, count(*) as quantidade, avg(preco) as preco_medio
  from opportunities
  where origem_tipo = 'descoberta' and status != 'rejeitada' and cidade is not null and estado is not null
  group by cidade, estado
  order by quantidade desc
  limit p_limite;
$$;
