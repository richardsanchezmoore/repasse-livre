-- Claims: âncora de auto-login pós-compra SEM email (guest checkout zero-clique).
--
-- Fluxo: deslogado clica "Quero ser Fundador" em /planos → gera um token aleatório
-- (localStorage + ?sck=claim_{token} no checkout da Cakto). O webhook, ao confirmar
-- o pagamento, cria/acha a conta pelo email e grava aqui token → user_id (status
-- 'ready'). No /bem-vindo, o token do localStorage é trocado por uma sessão (via
-- generateLink + verifyOtp, sem mandar email) e o comprador define a senha.
--
-- Segurança: token é aleatório (uso único, curto), o webhook só marca 'ready' após
-- pagamento confirmado, e /api/claim consome (status 'consumed') na 1ª troca. Fonte
-- da verdade do acesso continua sendo perfis (webhook) — isto é só o "handoff" de sessão.
create table if not exists public.claims (
  token      text primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  email      text,
  status     text not null default 'ready', -- ready → consumed
  criado_em  timestamptz not null default now()
);

-- RLS deny-all: só o service role (webhook + /api/claim) acessa; ninguém mais.
-- Segue o padrão das outras tabelas public (ver project_repasse_livre_seguranca_rls_supabase).
alter table public.claims enable row level security;
revoke all on public.claims from anon, authenticated;
