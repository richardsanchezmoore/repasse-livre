-- 0080: A Agenda da Casa — calendário da família (o recurso #1 amado no Cozi/FamilyWall),
-- na nossa versão SIMPLISTA à la brasileira: vista agenda, cor por pessoa (da família que
-- já temos), adicionar num toque. A Marta vira a dona da agenda (carga mental da mãe).
create table if not exists public.lar_agenda (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  titulo     text not null,
  quem       text,                                -- rótulo da pessoa (Mãe / João / A casa toda)
  cor        text,                                -- cor da pessoa (hex) — snapshot
  data       date not null,
  hora       time,                                -- opcional
  repete     text not null default 'nao',         -- nao | semanal
  observacao text,
  criado_em  timestamptz not null default now()
);
create index if not exists lar_agenda_user_idx on public.lar_agenda(user_id, data);

alter table public.lar_agenda enable row level security;
drop policy if exists lar_agenda_own on public.lar_agenda;
create policy lar_agenda_own on public.lar_agenda for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
