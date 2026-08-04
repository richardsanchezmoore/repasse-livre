-- ============================================================================
-- DAMAS VIRTUOSAS — QUIZZES dinâmicos (criados no admin). O quiz é um DOCUMENTO
-- (JSONB) — edita holístico, espelha o lib/quiz.js. Vários quizzes p/ A/B test:
-- o funil público /investigar?q=<slug> serve um específico; /investigar serve um ativo.
-- Leitura PÚBLICA (só conteúdo de quiz, não sensível); escrita só service role (admin).
-- ============================================================================
create table if not exists public.corte_quizzes (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  titulo        text not null,
  ativo         boolean not null default false,
  dados         jsonb not null default '{}'::jsonb,  -- { lead, max, questoes:[{t,opcoes:[{p,t}]}], faixas:[{min,cls,titulo,texto}] }
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.corte_quizzes enable row level security;
drop policy if exists corte_quizzes_sel on public.corte_quizzes;
create policy corte_quizzes_sel on public.corte_quizzes for select using (true);
-- writes (insert/update/delete): só o service role (admin). Sem policy pro anon/authenticated.

-- de qual quiz veio o lead (pra medir A/B no /admin/leads)
alter table public.corte_leads add column if not exists quiz_slug text;
