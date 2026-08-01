-- ============================================================================
-- A CORTE — onboarding pós-compra SEM email. O webhook cria a conta e marca
-- setup_pendente (com validade). A tela /bem-vinda deixa a compradora DEFINIR
-- A SENHA e entrar na hora, sem link mágico — só enquanto a conta está pendente
-- e dentro da janela (janela curta = mitiga alguém reivindicar a conta alheia).
-- ============================================================================
alter table public.corte_membros add column if not exists setup_pendente boolean not null default false;
alter table public.corte_membros add column if not exists setup_expira_em timestamptz;
