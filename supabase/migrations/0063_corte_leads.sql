-- ============================================================================
-- DAMAS VIRTUOSAS — LEADS do funil de quiz público (/investigar). A visitante
-- responde o quiz (valor primeiro) e, pra ver o Veredito, deixa e-mail + WhatsApp.
-- Vira audiência própria (remarketing + comunidade). Só service role acessa.
-- ============================================================================
create table if not exists public.corte_leads (
  email        text primary key,
  whatsapp     text,
  quiz_total   int,
  quiz_faixa   text,                 -- green | amber | red
  origem       text default 'investigar',
  virou_membro boolean not null default false,   -- marca se depois criou conta/comprou
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists corte_leads_criado_idx on public.corte_leads(criado_em desc);

alter table public.corte_leads enable row level security;
-- sem policies: nega tudo pro anon/authenticated; o service role (API + admin) ignora RLS.
