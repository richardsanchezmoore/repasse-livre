-- Livro-razão de anúncios do Facebook Marketplace já PROCESSADOS (item_id da URL
-- /marketplace/item/<id>). Serve pra 2 coisas: (1) dedup/incremental — pular o que já
-- vimos entre runs (o feed vem ordenado por "mais recentes"); (2) medir COBERTURA do
-- radar por região: se um run alcança ids já vistos antes do limite, cobrimos 100% do
-- intervalo; se bate no limite ainda vendo id novo, abriu um GAP. Ver facebookMain.ts.
--
-- status: 'salvo' (virou oportunidade), 'isca_loja', 'sem_motor', 'sem_fipe', 'acima_fipe'.
create table if not exists fb_vistos (
  item_id text primary key,
  status text not null,
  visto_em timestamptz not null default now()
);

create index if not exists idx_fb_vistos_visto_em on fb_vistos (visto_em);

-- Segurança: deny-all como as demais public (worker lê/escreve via service role, que
-- ignora RLS). Ver project_repasse_livre_seguranca_rls_supabase.
alter table fb_vistos enable row level security;
