-- Assinatura premium via Stripe (2º estágio da monetização). O `premium`
-- booleano (mig 0034) continua como OVERRIDE manual (cortesia/admin); estas
-- colunas guardam o estado da assinatura paga. O gate premium passa a valer se
-- o override manual está ligado OU a assinatura está ativa e dentro da validade.
-- Escrita SÓ pelo webhook (service role); o usuário só lê a própria linha (RLS).
alter table perfis add column if not exists stripe_customer_id text;
alter table perfis add column if not exists stripe_subscription_id text;
-- Status espelhado do Stripe: active | trialing | past_due | canceled | unpaid | incomplete...
alter table perfis add column if not exists assinatura_status text;
-- Fim do período pago atual (current_period_end) — enquanto > now() e status
-- ativo, o premium vale (cobre o "cancelar no fim do período").
alter table perfis add column if not exists premium_expira_em timestamptz;

create index if not exists idx_perfis_stripe_customer on perfis (stripe_customer_id);
