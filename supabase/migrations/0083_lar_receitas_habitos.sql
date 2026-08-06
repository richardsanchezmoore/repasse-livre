-- 0083: Caderno de receitas (pessoal, à mão) + Rastreador de hábitos DA MÃE.
-- Duas coisas pequenas e de uso diário (bússola: prático > gigante).

-- lar_receitas já existe (0070). Só falta o "modo de fazer".
alter table public.lar_receitas add column if not exists preparo text;

-- Hábitos da mãe (só dela — cuidar de si também é cuidar da casa)
create table if not exists public.lar_habito (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  nome     text not null,
  icone    text default '💛',
  ordem    int not null default 0,
  ativo    boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists lar_habito_idx on public.lar_habito(user_id, ordem);

create table if not exists public.lar_habito_log (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  habito_id uuid not null references public.lar_habito(id) on delete cascade,
  dia       date not null,
  unique (habito_id, dia)
);
create index if not exists lar_habito_log_idx on public.lar_habito_log(user_id, dia);

alter table public.lar_habito     enable row level security;
alter table public.lar_habito_log enable row level security;
drop policy if exists lar_habito_own on public.lar_habito;
create policy lar_habito_own on public.lar_habito for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists lar_habito_log_own on public.lar_habito_log;
create policy lar_habito_log_own on public.lar_habito_log for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
