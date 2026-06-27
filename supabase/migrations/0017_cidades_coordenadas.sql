-- GEO: tabela de referência cidade+UF -> coordenadas, geocodificada a
-- partir da base de municípios do IBGE. Chave é o par (cidade, estado)
-- exatamente como aparece em opportunities.cidade/estado (sem normalização
-- de acentos/maiúsculas) — grafias diferentes da mesma cidade entram como
-- linhas separadas apontando pra mesma coordenada, evitando precisar de
-- matching difuso no SQL na hora de ordenar por proximidade.

create table if not exists cidades_coordenadas (
  id uuid primary key default gen_random_uuid(),
  cidade text not null,
  estado text not null,
  latitude numeric not null,
  longitude numeric not null,
  created_at timestamptz not null default now(),
  unique (cidade, estado)
);

create index if not exists idx_cidades_coordenadas_cidade_estado on cidades_coordenadas (cidade, estado);

-- Função usada pela ordenação "perto de mim" na vitrine pública
-- (status = 'aprovada'). Replica os mesmos filtros de buscarOportunidades
-- (DiscoveriesBoard.tsx) — classificação, busca por veículo, estado, faixa
-- de preço — mas ordenando por distância haversine (km) até (p_lat, p_lng)
-- em vez de data/margem/preço. Cidades sem coordenada na tabela de
-- referência ficam por último (distancia_km null).
create or replace function oportunidades_por_proximidade(
  p_lat double precision,
  p_lng double precision,
  p_classificacao text default null,
  p_busca text default null,
  p_estado text default null,
  p_preco_min numeric default null,
  p_preco_max numeric default null,
  p_limite int default 40,
  p_deslocamento int default 0
)
returns table (
  id uuid,
  fonte text,
  link_origem text,
  veiculo text,
  versao text,
  ano text,
  cambio text,
  km integer,
  cidade text,
  estado text,
  preco numeric,
  fipe_valor numeric,
  fipe_data_referencia text,
  margem_percentual numeric,
  classificacao text,
  foto_principal text,
  fotos_secundarias jsonb,
  descricao text,
  origem_tipo text,
  status text,
  favorito boolean,
  data_captura timestamptz,
  data_atualizacao timestamptz,
  data_publicacao_origem timestamptz,
  atributos_olx jsonb,
  whatsapp text,
  nome_remetente text,
  perfil_remetente text,
  motivo_venda text,
  opcionais jsonb,
  sinistro_leilao jsonb,
  distancia_km double precision,
  total bigint
)
language sql
stable
as $$
  with filtradas as (
    select o.*,
      c.latitude as cid_lat,
      c.longitude as cid_lng
    from opportunities o
    left join cidades_coordenadas c
      on c.cidade = o.cidade and c.estado = o.estado
    where o.status = 'aprovada'
      and (p_classificacao is null or o.classificacao = p_classificacao)
      and (p_busca is null or o.veiculo ilike '%' || p_busca || '%')
      and (p_estado is null or o.estado = p_estado)
      and (p_preco_min is null or o.preco >= p_preco_min)
      and (p_preco_max is null or o.preco <= p_preco_max)
  ),
  com_distancia as (
    select filtradas.*,
      case when cid_lat is not null then
        2 * 6371 * asin(sqrt(
          power(sin(radians((cid_lat - p_lat) / 2)), 2) +
          cos(radians(p_lat)) * cos(radians(cid_lat)) *
          power(sin(radians((cid_lng - p_lng) / 2)), 2)
        ))
      else null end as distancia_km,
      count(*) over () as total
    from filtradas
  )
  select
    com_distancia.id, com_distancia.fonte, com_distancia.link_origem, com_distancia.veiculo,
    com_distancia.versao, com_distancia.ano, com_distancia.cambio, com_distancia.km,
    com_distancia.cidade, com_distancia.estado, com_distancia.preco, com_distancia.fipe_valor,
    com_distancia.fipe_data_referencia, com_distancia.margem_percentual, com_distancia.classificacao,
    com_distancia.foto_principal, com_distancia.fotos_secundarias, com_distancia.descricao,
    com_distancia.origem_tipo, com_distancia.status, com_distancia.favorito, com_distancia.data_captura,
    com_distancia.data_atualizacao, com_distancia.data_publicacao_origem, com_distancia.atributos_olx,
    com_distancia.whatsapp, com_distancia.nome_remetente, com_distancia.perfil_remetente,
    com_distancia.motivo_venda, com_distancia.opcionais, com_distancia.sinistro_leilao,
    com_distancia.distancia_km, com_distancia.total
  from com_distancia
  order by distancia_km asc nulls last, id asc
  limit p_limite
  offset p_deslocamento;
$$;
