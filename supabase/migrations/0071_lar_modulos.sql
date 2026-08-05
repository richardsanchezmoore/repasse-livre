-- 0071: persistência dos módulos da Marta (um estado atual por usuária). RLS own.
-- Casa (rotina), Filhos (placar + tracking semanal), Finanças (últimos números).

create table if not exists public.lar_rotina (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  dados         jsonb not null default '{}'::jsonb,  -- {diarias, semana, resgate, recado}
  atualizado_em timestamptz not null default now()
);

create table if not exists public.lar_placar (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  dados         jsonb not null default '{}'::jsonb,  -- {criancas, recompensas, meta, recado}
  marcados      jsonb not null default '{}'::jsonb,  -- {"ci-hi": true}
  estrelas      int   not null default 0,
  semana        date,                                -- segunda da semana (reset semanal do placar)
  atualizado_em timestamptz not null default now()
);

create table if not exists public.lar_financas (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  dados         jsonb not null default '{}'::jsonb,  -- {renda, dizimoOn, gastos:[{nome,valor}]}
  atualizado_em timestamptz not null default now()
);

alter table public.lar_rotina   enable row level security;
alter table public.lar_placar   enable row level security;
alter table public.lar_financas enable row level security;

do $$
declare t text;
begin
  foreach t in array array['lar_rotina','lar_placar','lar_financas']
  loop
    execute format($f$
      drop policy if exists %1$s_own on public.%1$s;
      create policy %1$s_own on public.%1$s
        using (auth.uid() = user_id) with check (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;
