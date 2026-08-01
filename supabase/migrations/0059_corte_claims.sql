-- Auto-login pós-compra (guest zero-clique) para A Corte.
-- O link de checkout leva ?sck=claim_{token}; o webhook da Cakto amarra o token à
-- conta criada; a /bem-vinda troca o token por sessão em /api/claim (generateLink,
-- sem enviar e-mail) e a compradora só define a senha — sem digitar o e-mail.
-- Espelha a tabela `claims` do Repasse Livre. Só o service role acessa (RLS deny-all).

create table if not exists public.corte_claims (
  token       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text,
  status      text not null default 'ready',   -- ready | consumed
  criado_em   timestamptz not null default now()
);

alter table public.corte_claims enable row level security;
-- Sem policies: nega tudo pro anon/authenticated; o service role (webhook + /api/claim) ignora RLS.
