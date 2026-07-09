-- Tendência mensal dos PRINCIPAIS modelos (por volume), pro card "Tendências do
-- mês" do /bia. A bia_tendencia_destaques ordena por maior variação de margem →
-- surfaceia ruído de baixo volume (1-2 un/mês com margem oscilando). Aqui a gente
-- ordena por OFERTA do mês atual, com piso de amostra, pra trazer Onix/Compass/
-- HB20S e comparar oferta+margem mês a mês (base pra mensagem de decisão da BIA).
-- Também devolve as datas dos dois meses comparados (pra rotular Jun→Jul).
create or replace function bia_tendencia_principais(p_limite int default 6)
returns table (
  marca text,
  modelo text,
  margem_mes_atual numeric,
  margem_mes_anterior numeric,
  quantidade_mes_atual numeric,
  quantidade_mes_anterior numeric,
  mes_atual date,
  mes_anterior date
)
language sql
stable
set search_path = public, extensions, pg_temp
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
  )
  select
    a.marca,
    a.modelo,
    a.margem_media as margem_mes_atual,
    b.margem_media as margem_mes_anterior,
    a.quantidade_media as quantidade_mes_atual,
    b.quantidade_media as quantidade_mes_anterior,
    (select max(mes) from meses_distintos) as mes_atual,
    (select min(mes) from meses_distintos) as mes_anterior
  from mensal a
  join mensal b on b.marca = a.marca and b.modelo = a.modelo
  where a.mes = (select max(mes) from meses_distintos)
    and b.mes = (select min(mes) from meses_distintos)
    and a.quantidade_media >= 8   -- piso: só principais modelos, corta ruído
  order by a.quantidade_media desc
  limit p_limite;
$$;
