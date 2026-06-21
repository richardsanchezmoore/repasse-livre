-- Autenticação/perfis (admin x público) e favoritos por usuário.
-- Como as demais migrations: aplicar manualmente no SQL Editor do Supabase.

-- 1. Perfil de cada usuário autenticado (role default 'publico').
create table if not exists perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'publico' check (role in ('admin', 'publico')),
  criado_em timestamptz not null default now()
);

-- Cria o perfil automaticamente no primeiro login (cobre Google e magic
-- link igual, pois ambos passam por um insert em auth.users).
create or replace function handle_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into perfis (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_novo_usuario();

-- Promoção manual do primeiro admin (rodar depois do primeiro login de
-- teste, trocando o e-mail):
-- update perfis set role = 'admin'
--   where user_id = (select id from auth.users where email = '<email-do-admin>');

-- 2. Favoritos por usuário (substitui a coluna opportunities.favorito,
-- que fica órfã por ora — sem leitura/escrita pelo app a partir desta
-- sprint, remoção fica para uma migration futura de limpeza).
create table if not exists favoritos (
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);
create index if not exists idx_favoritos_user on favoritos(user_id);

-- 3. RLS — proteção em profundidade. O app hoje lê/grava via
-- supabaseAdmin (service role, ignora RLS); o gate real desta sprint é
-- checado nas Server Actions/Server Components. RLS protege o dia em
-- que algo passar a usar o client anon direto do navegador.
alter table opportunities enable row level security;

drop policy if exists opportunities_select_publico on opportunities;
create policy opportunities_select_publico on opportunities
  for select
  using (
    status = 'aprovada'
    or exists (
      select 1 from perfis where perfis.user_id = auth.uid() and perfis.role = 'admin'
    )
  );

drop policy if exists opportunities_update_admin on opportunities;
create policy opportunities_update_admin on opportunities
  for update
  using (exists (select 1 from perfis where perfis.user_id = auth.uid() and perfis.role = 'admin'));

drop policy if exists opportunities_delete_admin on opportunities;
create policy opportunities_delete_admin on opportunities
  for delete
  using (exists (select 1 from perfis where perfis.user_id = auth.uid() and perfis.role = 'admin'));

alter table favoritos enable row level security;

drop policy if exists favoritos_dono on favoritos;
create policy favoritos_dono on favoritos
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- O Supabase passou a habilitar RLS automaticamente em tabelas novas
-- criadas pelo SQL Editor — sem política de select, nem o próprio usuário
-- conseguia ler o seu perfil (lib/supabase-server.ts usa o client anon,
-- que respeita RLS), então a role nunca chegava como 'admin' no app.
alter table perfis enable row level security;

drop policy if exists perfis_select_proprio on perfis;
create policy perfis_select_proprio on perfis
  for select
  using (user_id = auth.uid());
