-- A data/hora exibida no card como "descoberta em" deve refletir quando o
-- anúncio foi publicado na fonte original (OLX), não quando nosso worker
-- o capturou (data_captura é hora nossa, sempre minutos/horas depois da
-- publicação real). NULL para origem_tipo='insercao_direta', onde não há
-- "data de publicação original" — nesse caso o card cai para data_captura.

alter table opportunities
  add column if not exists data_publicacao_origem timestamptz;

-- Aplicar manualmente no SQL Editor do Supabase (migrations deste projeto
-- não rodam sozinhas).
