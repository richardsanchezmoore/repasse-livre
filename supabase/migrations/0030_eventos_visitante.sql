-- Enriquece o eventos_analytics (0020) pra virar métrica de DEMANDA confiável do
-- Copiloto de Compra, sem duplicar infra. Faltava identidade do visitante
-- ANÔNIMO: hoje só logados têm usuario_id, então não dava pra contar "views
-- únicos" (1 por visitante/anúncio/dia) nem separar bot de gente. Agora todo
-- evento carrega um visitor_id (cookie first-party anônimo).
alter table eventos_analytics add column if not exists visitor_id text;

-- Índices pras consultas de demanda do Copiloto:
--  - views de um anúncio / únicos por dia (opportunity_id + tempo).
--  - "mais visto" e tendência de procura por modelo (tipo + tempo; o veiculo/
--    estado ficam denormalizados no payload jsonb, que sobrevive à exclusão do
--    anúncio — o opportunity_id é 'on delete set null').
create index if not exists eventos_analytics_opp_idx on eventos_analytics (opportunity_id, criado_em desc);
create index if not exists eventos_analytics_tipo_idx on eventos_analytics (tipo, criado_em desc);
