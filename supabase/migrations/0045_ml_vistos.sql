-- Livro-razão de anúncios do Mercado Livre já PROCESSADOS mas NÃO salvos
-- (descartes por estrutura ou margem). Serve pra não reprocessar — e não gastar
-- FIPE/requisição — nos mesmos anúncios que a listagem embaralhada do ML mostra
-- de novo. Os SALVOS (elegíveis) já vivem em `opportunities` (linkOrigemJaExiste),
-- então aqui ficam só os não-salvos. Ver mercadoLivreService.coletarElegiveis.
--
-- motivo:
--   'estrutural' → sem marca/modelo/preço utilizável → pula pra SEMPRE (não muda).
--   'margem'     → tem FIPE mas não passou na margem → pula só enquanto o preço
--                  não mudar (ultimo_preco); se baixar, reprocessa.
-- (sem_fipe NÃO entra aqui de propósito: pode ser 429 transitório → deixa re-tentar.)
create table if not exists ml_vistos (
  mlb_id text primary key,
  motivo text not null,
  ultimo_preco integer,
  visto_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_ml_vistos_atualizado_em on ml_vistos (atualizado_em);

-- Segurança: deny-all como as demais tabelas public (o worker lê/escreve via
-- service role, que ignora RLS). Ver project_repasse_livre_seguranca_rls_supabase.
alter table ml_vistos enable row level security;
