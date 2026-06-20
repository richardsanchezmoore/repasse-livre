-- Histórico agregado de oportunidades apagadas (ex: rejeitadas removidas
-- manualmente). Guarda só os campos relevantes para relatórios mensais/anuais
-- (volume por origem, classificação, margem) — sem dados pessoais (whatsapp)
-- nem foto, que não têm valor de relatório e não precisam ser retidos.

create table if not exists oportunidades_historico (
  id uuid primary key default gen_random_uuid(),
  origem_tipo text not null,
  fonte text not null,
  classificacao text,
  margem_percentual numeric,
  status text not null,
  data_captura timestamptz not null,
  data_exclusao timestamptz not null default now()
);

create index if not exists idx_oportunidades_historico_data_exclusao on oportunidades_historico (data_exclusao);
create index if not exists idx_oportunidades_historico_origem_tipo on oportunidades_historico (origem_tipo);
