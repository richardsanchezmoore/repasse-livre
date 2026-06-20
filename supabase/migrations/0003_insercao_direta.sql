-- Sprint 4: Inserção Direta — formulário público de envio manual

alter table opportunities
  add column if not exists whatsapp text,
  add column if not exists perfil_remetente text; -- 'pessoa_fisica' | 'intermediador' | 'repassador' | 'lojista' | 'investidor'
-- ambas NULL para origem_tipo='descoberta'; obrigatórias quando origem_tipo='insercao_direta'.
-- link_origem permanece UNIQUE NOT NULL; inserção direta usa placeholder
-- "insercao-direta:{uuid}" gerado pelo server action, sem alteração de schema.

create index if not exists idx_opportunities_origem_tipo on opportunities (origem_tipo);

-- Aplicar manualmente no SQL editor do Supabase (bucket de Storage para as fotos do formulário):
--
-- insert into storage.buckets (id, name, public) values ('oportunidades-fotos', 'oportunidades-fotos', true)
--   on conflict (id) do nothing;
--
-- create policy "Leitura pública das fotos" on storage.objects
--   for select using (bucket_id = 'oportunidades-fotos');
--
-- Upload só via supabaseAdmin (service role, ignora RLS) — sem política de insert para anon.
