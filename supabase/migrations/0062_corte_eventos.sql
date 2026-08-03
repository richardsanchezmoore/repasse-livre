-- ============================================================================
-- DAMAS VIRTUOSAS — log de eventos do app. 1º uso: 'pdf_baixado' — registrar
-- quando um comprador baixa o PDF, pra cruzar com estorno ("pagou, baixou e
-- pediu reembolso"). Só o service role (rota /api/pdf) e o admin (via service
-- role no painel) acessam — RLS deny-all pro anon/authenticated.
-- ============================================================================
create table if not exists public.corte_eventos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  tipo       text not null,        -- pdf_baixado | (futuros)
  referencia text,                 -- ex.: chave do material baixado
  criado_em  timestamptz not null default now()
);
create index if not exists corte_eventos_user_idx on public.corte_eventos(user_id, criado_em desc);
create index if not exists corte_eventos_tipo_idx on public.corte_eventos(tipo, criado_em desc);

alter table public.corte_eventos enable row level security;
-- sem policies: nega tudo pro anon/authenticated; o service role ignora RLS.
