-- 0082: Faxina estilo Sweepy/Tody — cômodos e tarefas PERSISTENTES com nível de limpeza
-- (verde→vermelho conforme o tempo) e pontos de esforço. A Marta monta a "faxina do dia
-- do tamanho da sua energia". Estado que dá vício diário; a rotina de IA vira 2ª aba.

create table if not exists public.lar_casa_comodo (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  nome     text not null,
  icone    text,
  ordem    int not null default 0,
  ativo    boolean not null default true
);
create index if not exists lar_casa_comodo_idx on public.lar_casa_comodo(user_id, ordem);

create table if not exists public.lar_casa_tarefa (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  comodo_id  uuid not null references public.lar_casa_comodo(id) on delete cascade,
  nome       text not null,
  freq_dias  int not null default 3,        -- de quantos em quantos dias
  minutos    int not null default 10,       -- esforço
  ultima_vez timestamptz,                    -- null = nunca feita (vermelho)
  ativo      boolean not null default true
);
create index if not exists lar_casa_tarefa_idx on public.lar_casa_tarefa(user_id, comodo_id);

-- Placar da semana (minutos cuidados) — motivação leve; zera na virada da semana
create table if not exists public.lar_casa_semana (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  semana   date not null,
  minutos  int not null default 0
);

alter table public.lar_casa_comodo enable row level security;
alter table public.lar_casa_tarefa enable row level security;
alter table public.lar_casa_semana enable row level security;

drop policy if exists lar_casa_comodo_own on public.lar_casa_comodo;
create policy lar_casa_comodo_own on public.lar_casa_comodo for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists lar_casa_tarefa_own on public.lar_casa_tarefa;
create policy lar_casa_tarefa_own on public.lar_casa_tarefa for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists lar_casa_semana_own on public.lar_casa_semana;
create policy lar_casa_semana_own on public.lar_casa_semana for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
