-- 0079: Destaque da Marta — moderadora fixa uma mensagem boa (curadoria HUMANA, sem IA).
-- Aparece com ⭐ na roda e numa vitrine "Destaques" na home da Sala (dá alma à comunidade).
alter table public.lar_sala_mensagens
  add column if not exists destaque    boolean not null default false,
  add column if not exists destaque_em timestamptz;
create index if not exists lar_sala_msg_destaque_idx on public.lar_sala_mensagens(destaque_em desc) where destaque;
