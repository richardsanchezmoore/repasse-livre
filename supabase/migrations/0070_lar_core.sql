-- ============================================================================
-- DAMAS VIRTUOSAS · LAR & FAMÍLIA — "Marta", a assistente do lar (apps/lar).
-- Incubado no MESMO Supabase (tabelas prefixo `lar_`). Dados por USUÁRIA:
-- RLS user_id = auth.uid() (cada mãe vê só o seu). A IA/admin escreve via
-- service role (supabaseAdmin), que ignora RLS.
-- ============================================================================

-- Quem usa o app (espelha corte_membros; login é o auth.users compartilhado)
create table if not exists public.lar_membros (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  nome       text,
  is_admin   boolean not null default false,
  plano      text not null default 'trial',      -- trial | ativa | cancelada
  criado_em  timestamptz not null default now()
);

-- Perfil da família (o que a Marta usa pra personalizar tudo)
create table if not exists public.lar_familia (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  nome_mae      text,
  filhos        jsonb not null default '[]'::jsonb,  -- [{nome, idade}]
  comodos       int,
  trabalha_fora boolean not null default false,
  restricoes    text,                                -- alergias/restrições alimentares
  observacoes   text,                                -- rotina, igreja, etc.
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Config global do app (chave/valor) — só service role escreve
create table if not exists public.lar_config (
  chave        text primary key,
  valor        jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- ── COZINHA ────────────────────────────────────────────────────────────────
-- Banco de receitas favoritas da família
create table if not exists public.lar_receitas (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  nome         text not null,
  categoria    text,                                 -- rápida | almoço | jantar | lanche | domingo
  ingredientes jsonb not null default '[]'::jsonb,   -- [{item, qtd}]
  favorita     boolean not null default false,
  origem       text not null default 'manual',       -- manual | marta
  criado_em    timestamptz not null default now()
);
create index if not exists lar_receitas_user_idx on public.lar_receitas(user_id, criado_em desc);

-- Cardápio da semana (gerado pela Marta ou montado à mão)
create table if not exists public.lar_cardapio (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  inicio_semana date not null,
  dados         jsonb not null default '{}'::jsonb,  -- {segunda:{almoco:{nome,ingredientes},jantar:{...}}, ...}
  criado_em     timestamptz not null default now(),
  unique (user_id, inicio_semana)
);

-- Lista de compras (gerada do cardápio; guarda os checks)
create table if not exists public.lar_lista_compras (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  inicio_semana date not null,
  itens         jsonb not null default '[]'::jsonb,  -- [{item, qtd, comprado}]
  criado_em     timestamptz not null default now(),
  unique (user_id, inicio_semana)
);

-- ── RLS: cada usuária CRUD só as suas linhas ────────────────────────────────
alter table public.lar_membros        enable row level security;
alter table public.lar_familia        enable row level security;
alter table public.lar_config         enable row level security;
alter table public.lar_receitas       enable row level security;
alter table public.lar_cardapio       enable row level security;
alter table public.lar_lista_compras  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['lar_membros','lar_familia','lar_receitas','lar_cardapio','lar_lista_compras']
  loop
    execute format($f$
      drop policy if exists %1$s_own on public.%1$s;
      create policy %1$s_own on public.%1$s
        using (auth.uid() = user_id) with check (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;
-- lar_config: sem policy (nega anon/auth; só service role lê/escreve)
