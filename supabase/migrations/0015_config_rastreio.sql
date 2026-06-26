-- Painel de SEO no apps/admin: o usuário precisa colar códigos de rastreio
-- (GA4, Meta Pixel, GTM) sem precisar redeploy. chave/valor (mesmo padrão de
-- worker_config, migration 0013) pra poder adicionar novos serviços de
-- rastreio no futuro só estendendo a lista no painel, sem nova migration.
create table if not exists config_rastreio (
  chave text primary key, -- ex.: 'ga_measurement_id'
  valor text not null,
  atualizado_em timestamptz not null default now()
);

-- Aplicar manualmente no SQL Editor do Supabase (migrations deste projeto
-- não rodam sozinhas).
