-- KPIs do topo do board (inteligência de mercado — o "hero" pro comprador/repassador).
-- Uma função só devolve os 4 números num round-trip (agregados no banco, sem puxar
-- milhares de linhas na página). Cacheada na app (lib/kpisTopo.ts).
--   1. mapeados_7d  = tudo que varremos em 7 dias (novos vistos, incl. descartados)
--   2. abaixo_fipe  = total de oportunidades ativas abaixo da FIPE (não rejeitadas)
--   3. novos_24h    = novas oportunidades abaixo da FIPE nas últimas 24h
--   4. economia_7d  = Σ ganho (fipe - preço) dos anúncios captados nos últimos 7 dias
create or replace function kpis_topo()
returns table (
  mapeados_7d bigint,
  abaixo_fipe bigint,
  novos_24h   bigint,
  economia_7d numeric
)
language sql
stable
as $$
  select
    (select coalesce(sum(novos), 0)::bigint
       from discovery_runs
      where iniciado_em >= now() - interval '7 days'),
    (select count(*)::bigint
       from opportunities
      where status <> 'rejeitada'),
    (select count(*)::bigint
       from opportunities
      where status <> 'rejeitada'
        and data_captura::timestamptz >= now() - interval '24 hours'),
    (select coalesce(sum(fipe_valor - preco), 0)::numeric
       from opportunities
      where status <> 'rejeitada'
        and data_captura::timestamptz >= now() - interval '7 days'
        and fipe_valor is not null
        and fipe_valor > preco)
$$;
