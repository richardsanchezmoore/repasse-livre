-- Frente 2 do roadmap (analytics/BI): tabela genérica de eventos —
-- cobre busca/filtro, visualização de oportunidade e clique no WhatsApp
-- hoje, qualquer evento futuro sem precisar de migration nova. `payload`
-- guarda os detalhes específicos de cada tipo (termo buscado, filtros
-- ativos etc.); `opportunity_id`/`usuario_id` ficam como colunas próprias
-- (não dentro do jsonb) por serem o caso comum de JOIN/filtro em relatório.

create table if not exists eventos_analytics (
  id uuid primary key default gen_random_uuid(),
  tipo text not null, -- 'busca' | 'visualizacao_oportunidade' | 'clique_whatsapp'
  payload jsonb not null default '{}'::jsonb,
  opportunity_id uuid references opportunities(id) on delete set null,
  usuario_id uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_eventos_analytics_tipo_criado_em on eventos_analytics (tipo, criado_em desc);
create index if not exists idx_eventos_analytics_opportunity_id on eventos_analytics (opportunity_id);
