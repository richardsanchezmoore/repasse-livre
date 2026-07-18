-- CMS PRÓPRIO (páginas institucionais editáveis + blog), sem WordPress. O editor
-- (Tiptap, no painel admin) grava o JSON como FONTE DA VERDADE (reeditar sem perder
-- estrutura) + o HTML sanitizado gerado NO SERVIDOR (render rápido no SSR/SEO, sem
-- risco de XSS). Leitura pública via service role nos Server Components (mesmo padrão
-- do resto do app — RLS deny-all). Ver a memória do CMS/blog.

-- ── paginas: institucionais editáveis (termos, privacidade, exclusao-de-dados, sobre…) ──
-- Substitui o conteúdo hardcode. slug = a rota pública (/termos → slug 'termos').
create table if not exists paginas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  conteudo_json jsonb,                          -- doc do Tiptap (fonte da verdade)
  conteudo_html text not null default '',       -- render sanitizado (SSR/SEO)
  seo_title text,
  seo_description text,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null
);

-- ── posts: o blog ──────────────────────────────────────────────────────────────────
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  resumo text,                                  -- excerpt (lista + fallback da meta description)
  conteudo_json jsonb,
  conteudo_html text not null default '',
  capa_url text,
  capa_alt text,
  seo_title text,
  seo_description text,
  -- rascunho = admin vê, público 404 (mesmo padrão das descobertas). publicado = no ar.
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  publicado_em timestamptz,                     -- setado ao publicar; ordena o blog
  autor_id uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Blog público: só publicados, mais recentes primeiro (índice parcial enxuga a leitura).
create index if not exists idx_posts_publicados on posts(publicado_em desc) where status = 'publicado';

-- RLS deny-all: nenhuma policy = ninguém acessa via anon/authenticated. O app escreve
-- (server actions do admin) e lê (Server Components públicos) via SERVICE ROLE, que
-- ignora RLS. Ver project_repasse_livre_seguranca_rls_supabase.
alter table paginas enable row level security;
alter table posts enable row level security;
