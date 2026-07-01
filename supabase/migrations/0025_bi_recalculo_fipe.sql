-- BIA: saúde de margem da base a cada recálculo mensal de FIPE (o "dia da
-- FIPE"). Cada linha = um run do recalcularFipeMensal, com quantos anúncios
-- subiram/caíram/ficaram iguais de margem contra a FIPE nova, + quantos saíram
-- (<3%) e quantos viraram 3-5%. É um indicador macro: mostra se o mercado
-- (FIPE) desvalorizou ou valorizou frente ao nosso estoque no mês. Ver
-- project_repasse_livre_fipe_recalculo_mensal.

create table if not exists bi_recalculo_fipe (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  mes_referencia_fipe int,
  ano_referencia_fipe int,
  total_processados int not null,
  atualizados int not null,
  excluidos int not null,          -- margem < 3% (saíram da base)
  ficaram_3_5 int not null,        -- 3-5% (sem selo + aviso)
  sem_fipe int not null,           -- sem fipe_codigo/histórico (mantidos)
  subiram int not null,
  cairam int not null,
  iguais int not null,
  criado_em timestamptz not null default now()
);

-- Um recálculo por dia (idempotente se rodar de novo no mesmo dia).
create unique index if not exists idx_bi_recalculo_fipe_data on bi_recalculo_fipe (data);
