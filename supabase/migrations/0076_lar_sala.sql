-- ============================================================================
-- A SALA — comunidade do Lar/Marta (chat estilo grupo WhatsApp/Discord).
-- Freemium: acesso livre; monetização depois. NÍVEIS de usuária:
--   • conta:      lar_membros.is_admin + lar_membros.plano (free/premium)
--   • comunidade: lar_sala_perfil.papel (membro|moderadora|admin) + nivel/pontos
-- Mídia EFÊMERA (TTL 30d, some do servidor; fica no aparelho de quem baixou).
-- Moderação = regras + denúncia (sem filtro de IA — decisão do produto).
-- ============================================================================

-- Perfil PÚBLICO na comunidade (separado do lar_familia, que é privado do lar)
create table if not exists public.lar_sala_perfil (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  apelido          text,
  avatar           text default '🌷',              -- emoji
  bio              text,
  uf               text,
  papel            text not null default 'membro',  -- membro | moderadora | admin
  nivel            int  not null default 1,         -- nível de engajamento/confiança
  pontos           int  not null default 0,         -- acumula com atividade
  avisos           int  not null default 0,         -- advertências de moderação
  banido           boolean not null default false,
  aceitou_termo_em timestamptz,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

-- Rodas (salas temáticas) — geridas por nós (semeadas)
create table if not exists public.lar_sala_rodas (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  nome       text not null,
  descricao  text,
  icone      text,
  ordem      int not null default 0,
  ativa      boolean not null default true
);

-- Mensagens (fluxo por roda) — texto e imagem (mídia efêmera)
create table if not exists public.lar_sala_mensagens (
  id              uuid primary key default gen_random_uuid(),
  roda_id         uuid not null references public.lar_sala_rodas(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  tipo            text not null default 'texto',    -- texto | imagem
  texto           text,
  midia_path      text,                             -- caminho no bucket sala-midia
  midia_mime      text,
  midia_expira_em timestamptz,                       -- TTL (30d) — cron apaga a mídia
  responde_a      uuid references public.lar_sala_mensagens(id) on delete set null,
  anonimo         boolean not null default false,   -- "postar como irmã"
  status          text not null default 'ativo',    -- ativo | oculto | removido
  denuncias       int  not null default 0,
  criado_em       timestamptz not null default now()
);
create index if not exists lar_sala_msg_roda_idx on public.lar_sala_mensagens(roda_id, criado_em desc);
create index if not exists lar_sala_msg_user_idx on public.lar_sala_mensagens(user_id, criado_em desc);
create index if not exists lar_sala_msg_midia_idx on public.lar_sala_mensagens(midia_expira_em) where midia_path is not null;

-- Reações (1 por usuária por mensagem)
create table if not exists public.lar_sala_reacoes (
  mensagem_id uuid not null references public.lar_sala_mensagens(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  tipo        text not null default 'curtir',       -- curtir | amem | abraco | oro
  criado_em   timestamptz not null default now(),
  primary key (mensagem_id, user_id)
);

-- Denúncias (fila de moderação) — 1 por pessoa por mensagem
create table if not exists public.lar_sala_denuncias (
  id             uuid primary key default gen_random_uuid(),
  mensagem_id    uuid not null references public.lar_sala_mensagens(id) on delete cascade,
  denunciante_id uuid not null references auth.users(id) on delete cascade,
  motivo         text,
  status         text not null default 'aberta',    -- aberta | resolvida | descartada
  criado_em      timestamptz not null default now(),
  resolvido_por  uuid,
  resolvido_em   timestamptz,
  unique (mensagem_id, denunciante_id)
);

-- Bloqueios (uma usuária bloqueia outra; filtra o conteúdo dela)
create table if not exists public.lar_sala_bloqueios (
  user_id      uuid not null references auth.users(id) on delete cascade,
  bloqueado_id uuid not null references auth.users(id) on delete cascade,
  criado_em    timestamptz not null default now(),
  primary key (user_id, bloqueado_id)
);

-- ── Seed das rodas ──
insert into public.lar_sala_rodas (slug, nome, descricao, icone, ordem) values
  ('cozinha',   'Cozinha & Receitas', 'Receitas, trocas e o perrengue do jantar',            '🍳', 1),
  ('filhos',    'Filhos',             'Maternidade real — dúvidas, vitórias e desabafos',     '🧒', 2),
  ('casamento', 'Casamento',          'Vida a dois, com fé e sinceridade',                    '💍', 3),
  ('fe',        'Fé & Desabafo',      'Um lugar seguro pra abrir o coração e orar juntas',    '🙏', 4)
on conflict (slug) do nothing;

-- ── Auto-ocultar: 3 denúncias distintas escondem a mensagem até revisão ──
create or replace function public.lar_sala_auto_ocultar() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.lar_sala_denuncias where mensagem_id = new.mensagem_id;
  update public.lar_sala_mensagens
     set denuncias = n,
         status = case when n >= 3 and status = 'ativo' then 'oculto' else status end
   where id = new.mensagem_id;
  return new;
end $$;
drop trigger if exists lar_sala_denuncia_ai on public.lar_sala_denuncias;
create trigger lar_sala_denuncia_ai after insert on public.lar_sala_denuncias
  for each row execute function public.lar_sala_auto_ocultar();

-- ── Rate-limit anti-spam: máx 20 mensagens/minuto por usuária ──
create or replace function public.lar_sala_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.lar_sala_mensagens
   where user_id = new.user_id and criado_em > now() - interval '1 minute';
  if n >= 20 then raise exception 'Você está enviando rápido demais — respire e tente em instantes. 💛'; end if;
  return new;
end $$;
drop trigger if exists lar_sala_msg_bi on public.lar_sala_mensagens;
create trigger lar_sala_msg_bi before insert on public.lar_sala_mensagens
  for each row execute function public.lar_sala_rate_limit();

-- ── RLS ──
alter table public.lar_sala_perfil    enable row level security;
alter table public.lar_sala_rodas     enable row level security;
alter table public.lar_sala_mensagens enable row level security;
alter table public.lar_sala_reacoes   enable row level security;
alter table public.lar_sala_denuncias enable row level security;
alter table public.lar_sala_bloqueios enable row level security;

-- perfil: todas autenticadas leem (apelido/avatar públicos); cada uma edita o SEU
drop policy if exists lar_sala_perfil_read on public.lar_sala_perfil;
create policy lar_sala_perfil_read on public.lar_sala_perfil for select to authenticated using (true);
drop policy if exists lar_sala_perfil_own on public.lar_sala_perfil;
create policy lar_sala_perfil_own on public.lar_sala_perfil for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- rodas: leitura das ativas
drop policy if exists lar_sala_rodas_read on public.lar_sala_rodas;
create policy lar_sala_rodas_read on public.lar_sala_rodas for select to authenticated using (ativa);

-- mensagens: lê as ativas; insere/edita as suas (soft-delete própria via status)
drop policy if exists lar_sala_msg_read on public.lar_sala_mensagens;
create policy lar_sala_msg_read on public.lar_sala_mensagens for select to authenticated using (status = 'ativo');
drop policy if exists lar_sala_msg_ins on public.lar_sala_mensagens;
create policy lar_sala_msg_ins on public.lar_sala_mensagens for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists lar_sala_msg_upd on public.lar_sala_mensagens;
create policy lar_sala_msg_upd on public.lar_sala_mensagens for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reações: lê todas; gerencia as suas
drop policy if exists lar_sala_reac_read on public.lar_sala_reacoes;
create policy lar_sala_reac_read on public.lar_sala_reacoes for select to authenticated using (true);
drop policy if exists lar_sala_reac_own on public.lar_sala_reacoes;
create policy lar_sala_reac_own on public.lar_sala_reacoes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- denúncias: só insere a própria (ninguém lê pelo client; admin usa service role)
drop policy if exists lar_sala_den_ins on public.lar_sala_denuncias;
create policy lar_sala_den_ins on public.lar_sala_denuncias for insert to authenticated with check (auth.uid() = denunciante_id);

-- bloqueios: cada uma gerencia os seus
drop policy if exists lar_sala_bloq_own on public.lar_sala_bloqueios;
create policy lar_sala_bloq_own on public.lar_sala_bloqueios for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Storage: bucket privado da mídia efêmera (o servidor usa service role) ──
insert into storage.buckets (id, name, public) values ('sala-midia', 'sala-midia', false)
on conflict (id) do nothing;

-- ── Realtime: transmitir mensagens novas por roda (chat ao vivo) ──
do $$ begin
  execute 'alter publication supabase_realtime add table public.lar_sala_mensagens';
exception when others then null; end $$;
