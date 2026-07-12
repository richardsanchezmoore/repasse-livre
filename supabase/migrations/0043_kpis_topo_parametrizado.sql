-- KPIs do topo parametrizáveis (controle no painel):
--   dias_mapeadas → janela de "Ofertas mapeadas" E "Economia de mercado" (7/15/30)
--   horas_novos   → janela de "Novos" (24/48/72/168h)
-- "Abaixo da FIPE" segue sem período (total atual). Assinatura mudou (params +
-- nomes de coluna genéricos) → precisa DROP antes de CREATE.
drop function if exists kpis_topo();
drop function if exists kpis_topo(int, int);

-- Colunas mantêm os nomes legados (_7d/_24h são NOMINAIS agora — a janela real
-- vem dos params) pra o código antigo não quebrar durante o deploy.
create function kpis_topo(dias_mapeadas int default 7, horas_novos int default 24)
returns table (
  mapeados_7d bigint,
  abaixo_fipe bigint,
  novos_24h   bigint,
  economia_7d numeric
)
language sql
stable
set search_path = public
as $$
  select
    (select coalesce(sum(dr.novos), 0)::bigint
       from discovery_runs dr
      where dr.iniciado_em >= now() - make_interval(days => dias_mapeadas)),
    (select count(*)::bigint
       from opportunities
      where status <> 'rejeitada'),
    (select count(*)::bigint
       from opportunities
      where status <> 'rejeitada'
        and data_captura::timestamptz >= now() - make_interval(hours => horas_novos)),
    (select coalesce(sum(fipe_valor - preco), 0)::numeric
       from opportunities
      where status <> 'rejeitada'
        and data_captura::timestamptz >= now() - make_interval(days => dias_mapeadas)
        and fipe_valor is not null
        and fipe_valor > preco)
$$;
