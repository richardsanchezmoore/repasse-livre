-- 0074: pré-checkout. Antes de mandar pra Cakto, um pop-up capta nome + e-mail +
-- WhatsApp e salva o lead AQUI. Assim todo checkout iniciado vira contato nosso —
-- dá pra chamar no Whats quem começou e não concluiu (hoje ficávamos às cegas).
alter table public.corte_leads add column if not exists nome text;
alter table public.corte_leads add column if not exists chegou_checkout boolean not null default false;
alter table public.corte_leads add column if not exists checkout_em timestamptz;

create index if not exists corte_leads_checkout_idx
  on public.corte_leads(checkout_em desc) where chegou_checkout;
