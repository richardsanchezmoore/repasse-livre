-- Fase 4 (BIA): tendência mensal de margem + volume por marca/modelo, a
-- partir do snapshot diário (bi_snapshot_diario). A OLX não tem profundidade
-- histórica (paginação trava em ~100 páginas, ~2 dias de volume nacional —
-- ver project_repasse_livre_historico_retroativo_inviavel), então essa série
-- mensal só existe porque o snapshot diário já acumula desde 27/06/2026. Só
-- linhas nacionais (estado is null) nesta primeira versão.

-- Série mensal completa por marca+modelo, pra gráfico de linha.
create or replace function bia_tendencia_mensal_por_modelo(p_meses int default 6)
returns table (
  mes date,
  marca text,
  modelo text,
  quantidade_media numeric,
  margem_media numeric
)
language sql
stable
as $$
  select
    date_trunc('month', data)::date as mes,
    marca,
    modelo,
    avg(quantidade) as quantidade_media,
    avg(margem_media) as margem_media
  from bi_snapshot_diario
  where estado is null
    and data >= date_trunc('month', current_date) - (p_meses - 1) * interval '1 month'
  group by mes, marca, modelo
  order by marca, modelo, mes;
$$;

-- Destaques: maior variação de margem mês atual vs. mês anterior, só pra
-- marca+modelo com dado nos dois meses (senão a variação não é comparável).
create or replace function bia_tendencia_destaques(p_limite int default 5)
returns table (
  marca text,
  modelo text,
  margem_mes_atual numeric,
  margem_mes_anterior numeric,
  quantidade_mes_atual numeric,
  quantidade_mes_anterior numeric
)
language sql
stable
as $$
  with mensal as (
    select
      date_trunc('month', data)::date as mes,
      marca,
      modelo,
      avg(quantidade) as quantidade_media,
      avg(margem_media) as margem_media
    from bi_snapshot_diario
    where estado is null
    group by mes, marca, modelo
  ),
  meses_distintos as (
    select distinct mes from mensal order by mes desc limit 2
  ),
  atual as (
    select * from mensal where mes = (select max(mes) from meses_distintos)
  ),
  anterior as (
    select * from mensal where mes = (select min(mes) from meses_distintos)
  )
  select
    a.marca,
    a.modelo,
    a.margem_media as margem_mes_atual,
    p.margem_media as margem_mes_anterior,
    a.quantidade_media as quantidade_mes_atual,
    p.quantidade_media as quantidade_mes_anterior
  from atual a
  join anterior p on p.marca = a.marca and p.modelo = a.modelo
  where (select count(*) from meses_distintos) = 2
  order by abs(a.margem_media - p.margem_media) desc
  limit p_limite;
$$;
