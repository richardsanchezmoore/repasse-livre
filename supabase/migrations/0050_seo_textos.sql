-- Parágrafo de SEO por página de CATEGORIA (cidade/estado/marca/modelo), gerado
-- por LLM em BATCH (admin/scripts/gerarSeoTextos.ts) e só LIDO no render — mesma
-- filosofia do Copiloto (parecerLLM + gerar:pareceres): a prosa nasce FORA do
-- request e a página só lê. Ataca o "conteúdo fino" (só título + grid de cards),
-- que rankeia mal; um texto ÚNICO por página (não peça montada) melhora o SEO.
-- As páginas de cidade/modelo são as que mais trazem orgânico (Search Console).
--
-- chave = identificador estável da página dentro do tipo:
--   cidade → slug cidadeUf   (ex.: 'porto-alegre-rs')
--   estado → uf minúscula     (ex.: 'rs')
--   marca  → '<loc>:<marca>'  (ex.: 'porto-alegre-rs:chevrolet' | 'rs:chevrolet')
--   modelo → '<loc>:<marca>:<modelo>' (ex.: 'rs:chevrolet:onix')
create table if not exists seo_textos (
  tipo text not null,
  chave text not null,
  texto text not null,
  fingerprint text,          -- hash dos fatos que dirigem a prosa → só regera quando muda
  gerado_em timestamptz not null default now(),
  primary key (tipo, chave)
);

-- Segurança: deny-all como as demais tabelas public (o worker/admin lê e escreve
-- via service role, que ignora RLS). Ver project_repasse_livre_seguranca_rls_supabase.
alter table seo_textos enable row level security;
