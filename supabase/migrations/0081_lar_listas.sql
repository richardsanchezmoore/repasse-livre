-- 0081: Listas colaborativas + Lembretes.
-- Listas: a mãe cria; um LINK (token) deixa marido/família marcarem junto SEM login
-- (o link é a credencial; escrita pública via service role). À la brasileira: manda no Whats.
-- Lembretes: nudges ("não esquecer") que aparecem no card Hoje.

create table if not exists public.lar_lista (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  titulo        text not null,
  tipo          text not null default 'compras',        -- compras | tarefas
  token         uuid not null default gen_random_uuid(),-- link de compartilhamento
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists lar_lista_user_idx on public.lar_lista(user_id, atualizado_em desc);
create unique index if not exists lar_lista_token_idx on public.lar_lista(token);

create table if not exists public.lar_lista_item (
  id         uuid primary key default gen_random_uuid(),
  lista_id   uuid not null references public.lar_lista(id) on delete cascade,
  texto      text not null,
  feito      boolean not null default false,
  feito_por  text,                                       -- quem marcou (opcional)
  ordem      int not null default 0,
  criado_em  timestamptz not null default now()
);
create index if not exists lar_lista_item_idx on public.lar_lista_item(lista_id, feito, criado_em);

create table if not exists public.lar_lembrete (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  texto      text not null,
  data       date,                                       -- opcional
  feito      boolean not null default false,
  criado_em  timestamptz not null default now()
);
create index if not exists lar_lembrete_user_idx on public.lar_lembrete(user_id, feito, data);

-- ── RLS: a dona gerencia as suas; o link público escreve via service role ──
alter table public.lar_lista      enable row level security;
alter table public.lar_lista_item enable row level security;
alter table public.lar_lembrete   enable row level security;

drop policy if exists lar_lista_own on public.lar_lista;
create policy lar_lista_own on public.lar_lista for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists lar_lista_item_own on public.lar_lista_item;
create policy lar_lista_item_own on public.lar_lista_item for all to authenticated
  using (exists (select 1 from public.lar_lista l where l.id = lista_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lar_lista l where l.id = lista_id and l.user_id = auth.uid()));

drop policy if exists lar_lembrete_own on public.lar_lembrete;
create policy lar_lembrete_own on public.lar_lembrete for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
