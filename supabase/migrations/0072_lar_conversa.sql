-- 0072: memória de conversa da "Fala com a Marta" (uma thread por usuária). RLS own.
create table if not exists public.lar_conversa (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  mensagens     jsonb not null default '[]'::jsonb,  -- [{papel:'user'|'marta', texto}]
  atualizado_em timestamptz not null default now()
);
alter table public.lar_conversa enable row level security;
drop policy if exists lar_conversa_own on public.lar_conversa;
create policy lar_conversa_own on public.lar_conversa
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
