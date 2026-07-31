-- ============================================================================
-- A CORTE — incubada dentro do Repasse Livre (Supabase compartilhado).
-- Namespace: TODAS as tabelas com prefixo `corte_*` no schema public.
-- Amputação futura (cortar o cordão umbilical): pg_dump -t 'public.corte_*'
-- -> restaura no projeto Supabase próprio d'A Corte. Nada enrosca nos carros.
--
-- auth.users é COMPARTILHADO (identidade é identidade). O perfil da usuária
-- n'A Corte vive em corte_membros, separado de public.perfis (dos carros).
-- ============================================================================

-- ── Perfil da usuária n'A Corte ─────────────────────────────────────────────
create table if not exists public.corte_membros (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  nome        text,
  criado_em   timestamptz not null default now()
);

-- ── Dossiê = um pretendente que a usuária está "investigando" ───────────────
create table if not exists public.corte_dossies (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  nome          text not null,
  igreja        text,
  emblema       text,                       -- inicial/emoji p/ o card (sem foto ainda)
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists corte_dossies_user_idx
  on public.corte_dossies(user_id, atualizado_em desc);

-- ── Respostas dos "capítulos" (EAV flexível: permite campos que a própria
--    usuária cria; valor em jsonb aceita string, lista, "nao_sei", etc.) ─────
create table if not exists public.corte_respostas (
  id            uuid primary key default gen_random_uuid(),
  dossie_id     uuid not null references public.corte_dossies(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  capitulo      text not null,              -- ex.: 'fe_igreja'
  campo         text not null,              -- ex.: 'estilo_musica'
  valor         jsonb,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (dossie_id, capitulo, campo)
);
create index if not exists corte_respostas_dossie_idx
  on public.corte_respostas(dossie_id);

-- ── RLS: cada usuária só enxerga/edita o que é dela ─────────────────────────
alter table public.corte_membros   enable row level security;
alter table public.corte_dossies   enable row level security;
alter table public.corte_respostas enable row level security;

-- corte_membros
drop policy if exists corte_membros_sel on public.corte_membros;
drop policy if exists corte_membros_ins on public.corte_membros;
drop policy if exists corte_membros_upd on public.corte_membros;
create policy corte_membros_sel on public.corte_membros for select using (auth.uid() = user_id);
create policy corte_membros_ins on public.corte_membros for insert with check (auth.uid() = user_id);
create policy corte_membros_upd on public.corte_membros for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- corte_dossies
drop policy if exists corte_dossies_sel on public.corte_dossies;
drop policy if exists corte_dossies_ins on public.corte_dossies;
drop policy if exists corte_dossies_upd on public.corte_dossies;
drop policy if exists corte_dossies_del on public.corte_dossies;
create policy corte_dossies_sel on public.corte_dossies for select using (auth.uid() = user_id);
create policy corte_dossies_ins on public.corte_dossies for insert with check (auth.uid() = user_id);
create policy corte_dossies_upd on public.corte_dossies for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy corte_dossies_del on public.corte_dossies for delete using (auth.uid() = user_id);

-- corte_respostas
drop policy if exists corte_respostas_sel on public.corte_respostas;
drop policy if exists corte_respostas_ins on public.corte_respostas;
drop policy if exists corte_respostas_upd on public.corte_respostas;
drop policy if exists corte_respostas_del on public.corte_respostas;
create policy corte_respostas_sel on public.corte_respostas for select using (auth.uid() = user_id);
create policy corte_respostas_ins on public.corte_respostas for insert with check (auth.uid() = user_id);
create policy corte_respostas_upd on public.corte_respostas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy corte_respostas_del on public.corte_respostas for delete using (auth.uid() = user_id);
