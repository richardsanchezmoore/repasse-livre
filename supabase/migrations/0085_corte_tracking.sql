-- Tracking de atribuição do checkout nativo (Damas Virtuosas).
-- O checkout roda no NOSSO domínio → capturamos _fbp/_fbc/fbclid/utm no momento da
-- compra e guardamos por order_id. O webhook (pago) lê daqui e enriquece o Purchase
-- do Meta CAPI (match alto + atribuição de clique) — sinal confiável mesmo quando a
-- compradora paga o PIX no app do banco e não volta pra aba.
create table if not exists public.corte_tracking (
  order_id      text primary key,
  email         text,
  valor         numeric,
  fbp           text,
  fbc           text,
  fbclid        text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  criado_em     timestamptz not null default now()
);

-- RLS deny-all: só o service_role (API routes + webhook) acessa; ninguém do cliente.
alter table public.corte_tracking enable row level security;

-- Limpeza: tracking vira lixo depois de alguns dias (só serve na janela compra→webhook).
create index if not exists corte_tracking_criado_idx on public.corte_tracking (criado_em);
