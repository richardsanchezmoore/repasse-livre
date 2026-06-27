-- A OLX já classifica cada anúncio como profissional (lojista/concessionária)
-- ou particular (campo `professionalAd` na listagem e na página individual,
-- ver olxService.ts) — captura sem custo de requisição extra na listagem;
-- a página individual também carrega o mesmo campo, usado pelo backfill dos
-- anúncios capturados antes desta coluna existir.

alter table opportunities add column if not exists anunciante_profissional boolean;

create index if not exists idx_opportunities_status_anunciante
  on opportunities (status, anunciante_profissional);

-- Recria oportunidades_por_proximidade (migration 0017) com o novo filtro
-- de tipo de anunciante, mesmo princípio dos demais filtros (estado, preço
-- etc.) — null = não filtra.
create or replace function oportunidades_por_proximidade(
  p_lat double precision,
  p_lng double precision,
  p_classificacao text default null,
  p_busca text default null,
  p_estado text default null,
  p_preco_min numeric default null,
  p_preco_max numeric default null,
  p_anunciante boolean default null,
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
  anunciante_profissional boolean,
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
      and (p_anunciante is null or o.anunciante_profissional = p_anunciante)
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
    com_distancia.anunciante_profissional, com_distancia.distancia_km, com_distancia.total
  from com_distancia
  order by distancia_km asc nulls last, id asc
  limit p_limite
  offset p_deslocamento;
$$;
