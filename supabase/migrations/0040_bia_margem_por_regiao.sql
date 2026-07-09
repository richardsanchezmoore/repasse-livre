-- Adiciona MARGEM MÉDIA por estado e por cidade nas RPCs da BIA. A métrica de
-- valor ("quanto dá pra ganhar aqui") vende mais que volume bruto de estoque,
-- que esfria o usuário de UF pequena. margem_media = média de margem_percentual
-- (nulos ignorados pelo avg). Redefino as duas funções por completo, então
-- REPINO o search_path (create or replace reseta as settings não declaradas —
-- ver project_repasse_livre_seguranca_rls_supabase / mig 0035).

-- Mudar as colunas do returns table = mudar o tipo de retorno → Postgres exige DROP antes.
drop function if exists bia_estados_mais_ativos();
create or replace function bia_estados_mais_ativos()
returns table (estado text, quantidade bigint, preco_medio numeric, margem_media numeric)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select
    estado,
    count(*) as quantidade,
    avg(preco) as preco_medio,
    avg(margem_percentual) as margem_media
  from opportunities
  where origem_tipo = 'descoberta' and status != 'rejeitada' and estado is not null
  group by estado
  order by quantidade desc;
$$;

drop function if exists bia_cidades_mais_ativas(int);
create or replace function bia_cidades_mais_ativas(p_limite int default 20)
returns table (cidade text, estado text, quantidade bigint, preco_medio numeric, margem_media numeric)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select
    cidade,
    estado,
    count(*) as quantidade,
    avg(preco) as preco_medio,
    avg(margem_percentual) as margem_media
  from opportunities
  where origem_tipo = 'descoberta' and status != 'rejeitada' and cidade is not null and estado is not null
  group by cidade, estado
  order by quantidade desc
  limit p_limite;
$$;
