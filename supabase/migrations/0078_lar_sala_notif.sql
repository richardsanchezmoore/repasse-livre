-- 0078: Notificações d'A Sala (retenção). Quando alguém REAGE ou RESPONDE a mensagem
-- de uma irmã, ela recebe um aviso. Gerado por trigger (nunca notifica a si mesma).
-- Snapshot do apelido de quem gerou (null = "Uma irmã", respeita o anônimo).
create table if not exists public.lar_sala_notif (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,  -- destinatária
  tipo           text not null,               -- reacao | resposta
  origem_apelido text,                         -- quem gerou (null → "Uma irmã")
  preview        text,                         -- trecho da mensagem
  roda_slug      text,
  mensagem_id    uuid,
  lida           boolean not null default false,
  criado_em      timestamptz not null default now()
);
create index if not exists lar_sala_notif_user_idx on public.lar_sala_notif(user_id, lida, criado_em desc);

alter table public.lar_sala_notif enable row level security;
drop policy if exists lar_sala_notif_own on public.lar_sala_notif;
create policy lar_sala_notif_own on public.lar_sala_notif for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reação → avisa a autora da mensagem
create or replace function public.lar_sala_notif_reacao() returns trigger
language plpgsql security definer set search_path = public as $$
declare autora uuid; rslug text; prev text; quem text;
begin
  select m.user_id, r.slug, left(coalesce(m.texto, '📷 foto'), 60)
    into autora, rslug, prev
    from public.lar_sala_mensagens m join public.lar_sala_rodas r on r.id = m.roda_id
   where m.id = new.mensagem_id;
  if autora is null or autora = new.user_id then return new; end if;
  select apelido into quem from public.lar_sala_perfil where user_id = new.user_id;
  insert into public.lar_sala_notif(user_id, tipo, origem_apelido, preview, roda_slug, mensagem_id)
    values (autora, 'reacao', quem, prev, rslug, new.mensagem_id);
  return new;
end $$;
drop trigger if exists lar_sala_reac_notif on public.lar_sala_reacoes;
create trigger lar_sala_reac_notif after insert on public.lar_sala_reacoes
  for each row execute function public.lar_sala_notif_reacao();

-- Resposta → avisa a autora da mensagem respondida
create or replace function public.lar_sala_notif_resposta() returns trigger
language plpgsql security definer set search_path = public as $$
declare autora uuid; rslug text;
begin
  if new.responde_a is null then return new; end if;
  select user_id into autora from public.lar_sala_mensagens where id = new.responde_a;
  if autora is null or autora = new.user_id then return new; end if;
  select slug into rslug from public.lar_sala_rodas where id = new.roda_id;
  insert into public.lar_sala_notif(user_id, tipo, origem_apelido, preview, roda_slug, mensagem_id)
    values (autora, 'resposta', new.autor_apelido, left(coalesce(new.texto, '📷 foto'), 60), rslug, new.responde_a);
  return new;
end $$;
drop trigger if exists lar_sala_resp_notif on public.lar_sala_mensagens;
create trigger lar_sala_resp_notif after insert on public.lar_sala_mensagens
  for each row execute function public.lar_sala_notif_resposta();
