-- Normaliza marca/modelo nas RPCs da BIA. As fontes gravam veiculo em caixas
-- diferentes ("Jeep" vs "JEEP", "Chevrolet" vs "CHEVROLET", "Mercedes-Benz" vs
-- "MERCEDES-BENZ"), então split_part(veiculo,' ',1) gerava marcas duplicadas —
-- dois chips "Jeep", cores diferentes (o canônico casa cor, o maiúsculo caía no
-- hash) — e "Land Rover" quebrava em marca="Land"/modelo="Rover". Aqui:
--   • marca via initcap + casos de 2 palavras (Land Rover) e hifenizados (Mercedes)
--   • modelo via initcap (305 registros vinham TODO-MAIÚSCULO → não mergeavam)
-- Return type das funções não muda → create or replace basta, mas RE-PINA o
-- search_path (o replace reseta settings não declaradas — ver mig 0035).

-- ── Anúncios mais disputados (agrupado por modelo) ──────────────────────────
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
      case
        when lower(split_part(veiculo, ' ', 1)) = 'land'
             and lower(split_part(veiculo, ' ', 2)) = 'rover' then 'Land Rover'
        when lower(split_part(veiculo, ' ', 1)) like 'mercedes%' then 'Mercedes-Benz'
        else initcap(split_part(veiculo, ' ', 1))
      end as marca,
      case
        when lower(split_part(veiculo, ' ', 1)) = 'land'
             and lower(split_part(veiculo, ' ', 2)) = 'rover' then initcap(split_part(veiculo, ' ', 3))
        else initcap(split_part(veiculo, ' ', 2))
      end as modelo,
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
    where modelo != ''
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
  where b.modelo != ''
  group by b.marca, b.modelo, l.uf_lider
  order by quantidade desc
  limit p_limite;
$$;

-- ── Marcas de luxo por estado ───────────────────────────────────────────────
-- Antes usava match EXATO de caixa (excluía "MERCEDES-BENZ"/"LAND" maiúsculos) e
-- chamava a marca de "Land". Agora casa por lower() e devolve o nome canônico.
create or replace function bia_marcas_luxo_por_estado()
returns table (marca text, estado text, quantidade bigint)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  with lux as (
    select
      case
        when lower(split_part(veiculo, ' ', 1)) = 'land' then 'Land Rover'
        when lower(split_part(veiculo, ' ', 1)) like 'mercedes%' then 'Mercedes-Benz'
        when lower(split_part(veiculo, ' ', 1)) = 'bmw' then 'BMW'
        when lower(split_part(veiculo, ' ', 1)) = 'audi' then 'Audi'
        when lower(split_part(veiculo, ' ', 1)) = 'lexus' then 'Lexus'
        when lower(split_part(veiculo, ' ', 1)) = 'porsche' then 'Porsche'
      end as marca,
      estado
    from opportunities
    where origem_tipo = 'descoberta'
      and status != 'rejeitada'
      and estado is not null
      and lower(split_part(veiculo, ' ', 1)) = any (
        array['land', 'mercedes-benz', 'mercedes', 'bmw', 'audi', 'lexus', 'porsche']
      )
  )
  select marca, estado, count(*) as quantidade
  from lux
  where marca is not null
  group by marca, estado
  order by marca, quantidade desc;
$$;
