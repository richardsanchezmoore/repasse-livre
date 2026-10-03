-- KPIs do topo: passam a conhecer PAÍS.
--
-- ⚠️ Por que (03/10/2026): o Gustavo abriu o site do Auto Radar e os quatro
-- números do topo eram brasileiros — 1.571 ofertas mapeadas, "Abaixo da FIPE"
-- 1.694, R$ 2,2 mi de economia — enquanto a listagem embaixo já mostrava os
-- 106 carros de Ciudad del Este. A função agregava a base inteira, sem país.
--
-- ★ Assinatura NOVA de 3 argumentos, com o país SEM default, e a antiga de 2
-- fica de pé por enquanto. Essa escolha é deliberada:
--   - se o país tivesse default, uma chamada de 2 argumentos casaria nas DUAS
--     funções e o Postgres levantaria ambiguidade — quebrando o site no ar;
--   - sem default, a chamada antiga continua indo para a função antiga, o
--     deploy do front pode acontecer depois, e nada quebra no meio.
-- A de 2 argumentos sai numa migração seguinte, quando o front já estiver
-- publicado chamando a de 3.
--
-- ⚠️⚠️ DOIS DESTES KPIs NÃO FAZEM SENTIDO NO PARAGUAI e isto aqui NÃO conserta
-- isso: `abaixo_fipe` e `economia_7d` dependem de `fipe_valor`, que é NULO em
-- 100% dos 156 registros paraguaios — porque no Paraguai não existe FIPE, que
-- é justamente a tese do produto. Com o filtro de país eles passam a devolver
-- 0 em vez de um número brasileiro: menos errado, ainda não certo. O redesenho
-- (mediana + n visível, no lugar da margem) é trabalho à parte.
--
-- `mapeados_7d` tem um limite conhecido: discovery_runs não guarda país, então
-- ele é derivado das oportunidades captadas na janela, não da soma de
-- `dr.novos`. Fica mais honesto — conta o que entrou mesmo, por país.

create or replace function public.kpis_topo(
  dias_mapeadas integer,
  horas_novos integer,
  pais_filtro text
)
returns table(mapeados_7d bigint, abaixo_fipe bigint, novos_24h bigint, economia_7d numeric)
language sql
stable
set search_path to 'public'
as $function$
  select
    (select count(*)::bigint
       from opportunities
      where status <> 'rejeitada'
        and pais = pais_filtro
        and data_captura::timestamptz >= now() - make_interval(days => dias_mapeadas)),
    (select count(*)::bigint
       from opportunities
      where status <> 'rejeitada'
        and pais = pais_filtro),
    (select count(*)::bigint
       from opportunities
      where status <> 'rejeitada'
        and pais = pais_filtro
        and data_captura::timestamptz >= now() - make_interval(hours => horas_novos)),
    (select coalesce(sum(fipe_valor - preco), 0)::numeric
       from opportunities
      where status <> 'rejeitada'
        and pais = pais_filtro
        and data_captura::timestamptz >= now() - make_interval(days => dias_mapeadas)
        and fipe_valor is not null
        and fipe_valor > preco)
$function$;
