-- Painel de SEO no apps/admin: o usuário precisa editar título/descrição/
-- imagem OG de cada página sem precisar redeploy. chave/valor por campo (não
-- colunas fixas por página) pra poder adicionar novas páginas no futuro só
-- estendendo a lista no painel, sem nova migration.
create table if not exists seo_paginas (
  chave text primary key, -- ex.: 'home'
  titulo text,
  descricao text,
  imagem_og text,
  atualizado_em timestamptz not null default now()
);

-- Aplicar manualmente no SQL Editor do Supabase (migrations deste projeto
-- não rodam sozinhas).
