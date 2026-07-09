-- "Anúncios mais disputados" AGRUPADO POR MODELO (não por modelo+UF). O
-- bia_mais_disputados original repetia o mesmo modelo uma vez por estado (vários
-- "Onix" na frente), o que deixava a leitura embolada. Aqui soma os estados por
-- modelo, guarda a MELHOR margem e a faixa de KM do país inteiro, mais a UF líder
-- e em quantas UFs o modelo aparece. O recorte por estado fica pra um bloco
-- separado ("mais disputados por estado", futuro). search_path pinado (Security
-- Advisor — ver project_repasse_livre_seguranca_rls_supabase).
create or replace function bia_mais_disputados_modelo(p_limite int default 20)
returns table (
  marca text,
  modelo text,
  quantidade bigint,
  melhor_margem numeric,
  km_min int,
  km_max int,
  uf_lider text,
  qtd_estados int
)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  with base as (
    select
      split_part(veiculo, ' ', 1) as marca,
      split_part(veiculo, ' ', 2) as modelo,
      estado,
      margem_percentual,
      km
    from opportunities
    where origem_tipo = 'descoberta'
      and status != 'rejeitada'
      and estado is not null
      and split_part(veiculo, ' ', 2) != ''
  ),
  por_estado as (
    select marca, modelo, estado, count(*) as q
    from base
    group by marca, modelo, estado
  ),
  lider as (
    select distinct on (marca, modelo) marca, modelo, estado as uf_lider
    from por_estado
    order by marca, modelo, q desc
  )
  select
    b.marca,
    b.modelo,
    count(*) as quantidade,
    max(b.margem_percentual) as melhor_margem,
    min(b.km) as km_min,
    max(b.km) as km_max,
    l.uf_lider,
    count(distinct b.estado)::int as qtd_estados
  from base b
  join lider l on l.marca = b.marca and l.modelo = b.modelo
  group by b.marca, b.modelo, l.uf_lider
  order by quantidade desc
  limit p_limite;
$$;
