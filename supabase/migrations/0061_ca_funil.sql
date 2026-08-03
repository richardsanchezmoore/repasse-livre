-- ============================================================================
-- THE COURTSHIP ALMANAC (US, inglês) — funil de aquisição, INCUBADO dentro do
-- Repasse Livre (Supabase compartilhado). Namespace: prefixo `ca_*` no schema
-- public (espelha o `corte_*` das Damas Virtuosas). auth.users é COMPARTILHADO.
-- Amputação futura: pg_dump -t 'public.ca_*' -> restaura no projeto próprio.
-- ============================================================================

-- ── Perfil da usuária ───────────────────────────────────────────────────────
create table if not exists public.ca_membros (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  nome            text,
  is_admin        boolean not null default false,
  setup_pendente  boolean not null default false,   -- onboarding pós-compra sem e-mail
  setup_expira_em timestamptz,                       -- janela p/ definir senha na /welcome
  criado_em       timestamptz not null default now()
);
alter table public.ca_membros enable row level security;
drop policy if exists ca_membros_sel on public.ca_membros;
drop policy if exists ca_membros_ins on public.ca_membros;
drop policy if exists ca_membros_upd on public.ca_membros;
create policy ca_membros_sel on public.ca_membros for select using (auth.uid() = user_id);
create policy ca_membros_ins on public.ca_membros for insert with check (auth.uid() = user_id);
create policy ca_membros_upd on public.ca_membros for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Config genérica (planos/preços — não sensível, leitura pública) ─────────
create table if not exists public.ca_config (
  chave         text primary key,
  valor         jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
alter table public.ca_config enable row level security;
drop policy if exists ca_config_sel on public.ca_config;
create policy ca_config_sel on public.ca_config for select using (true);

insert into public.ca_config (chave, valor) values
('plans', '{
  "kit": {"name":"The Discernment Kit","price":"$9","currency":"USD","description":"The Courtship Almanac + the bonuses, lifetime access.","checkout_url":"https://courtshipalmanac.lemonsqueezy.com/buy/REPLACE-ME","ls_variant":""}
}'::jsonb)
on conflict (chave) do nothing;

-- ── Acessos (quem tem direito a quê) ────────────────────────────────────────
create table if not exists public.ca_acessos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  tipo          text not null,                      -- kit | assinatura
  status        text not null default 'ativo',      -- ativo | cancelado | expirado
  origem        text,                               -- lemonsqueezy | manual | cortesia
  referencia    text,                               -- id externo (LS order)
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  expira_em     timestamptz,                        -- null = vitalício (Kit)
  unique (user_id, tipo)
);
create index if not exists ca_acessos_user_idx on public.ca_acessos(user_id);
alter table public.ca_acessos enable row level security;
drop policy if exists ca_acessos_sel_own on public.ca_acessos;
drop policy if exists ca_acessos_sel_admin on public.ca_acessos;
drop policy if exists ca_acessos_ins on public.ca_acessos;
drop policy if exists ca_acessos_upd on public.ca_acessos;
drop policy if exists ca_acessos_del on public.ca_acessos;
create policy ca_acessos_sel_own on public.ca_acessos for select using (auth.uid() = user_id);
create policy ca_acessos_sel_admin on public.ca_acessos for select using (exists (select 1 from public.ca_membros m where m.user_id = auth.uid() and m.is_admin));
create policy ca_acessos_ins on public.ca_acessos for insert with check (exists (select 1 from public.ca_membros m where m.user_id = auth.uid() and m.is_admin));
create policy ca_acessos_upd on public.ca_acessos for update using (exists (select 1 from public.ca_membros m where m.user_id = auth.uid() and m.is_admin));
create policy ca_acessos_del on public.ca_acessos for delete using (exists (select 1 from public.ca_membros m where m.user_id = auth.uid() and m.is_admin));

-- ── Claims (auto-login pós-compra, zero-clique) ─────────────────────────────
-- O checkout leva ?checkout[custom][claim]=TOKEN; o webhook do Lemon Squeezy amarra
-- o token à conta; a /welcome troca por sessão em /api/claim (generateLink, sem e-mail).
-- Só o service role acessa (RLS deny-all).
create table if not exists public.ca_claims (
  token       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text,
  status      text not null default 'ready',   -- ready | consumed
  criado_em   timestamptz not null default now()
);
alter table public.ca_claims enable row level security;
-- sem policies: nega tudo pro anon/authenticated; o service role ignora RLS.
