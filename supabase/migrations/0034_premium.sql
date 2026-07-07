-- Monetização — 1º estágio (funil): flag premium no perfil (manual por ora, sem
-- gateway). Quem é premium (ou admin) vê tudo; o resto encara o overlay nas
-- ofertas acima do limite (config worker_config.MARGEM_PREMIUM_PERCENTUAL).
alter table perfis add column if not exists premium boolean not null default false;
