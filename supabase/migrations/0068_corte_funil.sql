-- ============================================================================
-- DAMAS VIRTUOSAS — funil interno do /investigar. Conta o que o Meta não conta
-- de forma exata/nossa: quantas VISITARAM a página, quantas CONCLUÍRAM o quiz
-- (chegaram no gate) e quantas viraram LEAD (WhatsApp). O buraco quiz_fim→lead
-- é o "completou mas não deixou o número". vid = id anônimo (localStorage) p/
-- contar visitantes distintos (dedupa reload). Só service role acessa (deny-all).
-- ============================================================================
create table if not exists public.corte_funil (
  id         bigint generated always as identity primary key,
  vid        text,                 -- id anônimo do visitante (localStorage)
  tipo       text not null,        -- visita | quiz_fim
  quiz_slug  text,
  criado_em  timestamptz not null default now()
);
create index if not exists corte_funil_tipo_idx on public.corte_funil(tipo, criado_em desc);
create index if not exists corte_funil_vid_idx  on public.corte_funil(vid);

alter table public.corte_funil enable row level security;
-- sem policies: nega tudo pro anon/authenticated; o service role ignora RLS.

-- Resumo agregado (total + hoje, fuso SP). Leads = corte_leads (fonte da verdade).
create or replace function public.corte_funil_resumo()
returns table (
  visitas bigint, concluiram bigint, leads bigint,
  visitas_hoje bigint, concluiram_hoje bigint, leads_hoje bigint
)
language sql stable security definer set search_path = public as $$
  select
    (select count(distinct vid) from corte_funil where tipo = 'visita'),
    (select count(distinct vid) from corte_funil where tipo = 'quiz_fim'),
    (select count(*) from corte_leads),
    (select count(distinct vid) from corte_funil
       where tipo = 'visita'
         and (criado_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date),
    (select count(distinct vid) from corte_funil
       where tipo = 'quiz_fim'
         and (criado_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date),
    (select count(*) from corte_leads
       where (criado_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date)
$$;
