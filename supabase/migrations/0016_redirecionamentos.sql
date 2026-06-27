-- Redirect manager: quando uma página de carro/cidade/estado/marca daria
-- 404 (link antigo, slug mudou, anúncio saiu do ar), em vez de simplesmente
-- perder o link equity já indexado, dá pra cadastrar um redirecionamento
-- 301 pra URL nova. Checado só nos pontos onde a página chamaria
-- notFound() (ver lib/redirecionamentos.ts), não em todo request.
create table if not exists redirecionamentos (
  origem text primary key, -- caminho relativo, ex.: '/carros/recife-pe/civic-2015-<uuid-antigo>'
  destino text not null, -- caminho relativo ou URL completa
  criado_em timestamptz not null default now()
);

-- Aplicar manualmente no SQL Editor do Supabase (migrations deste projeto
-- não rodam sozinhas).
