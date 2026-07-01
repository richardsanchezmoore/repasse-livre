-- Série histórica de FIPE por modelo, pra mostrar valorização/desvalorização
-- na página individual (variação 3/6/12 meses) e alimentar a BIA. Ver
-- project_repasse_livre_fipe_historico.
--
-- Fontes (o melhor de cada): o MÊS VIGENTE vem da FIPE oficial (fresco, e é
-- ela que dá o codigo_fipe do anúncio); os MESES PASSADOS vêm do mirror fipeX
-- (que só atrasa o mês MAIS NOVO — os passados estão completos), casados por
-- codigo_fipe exato (sem fuzzy). O backfill de um modelo novo é automático no
-- fluxo de captação (garantirHistoricoFipe, igual garantirCoordenadasCidade).

create table if not exists fipe_historico (
  codigo_fipe text not null,
  ano_modelo int not null,
  sigla_combustivel text not null,
  mes_referencia int not null,
  ano_referencia int not null,
  valor_centavos bigint not null,
  nome_marca text,
  nome_modelo text,
  atualizado_em timestamptz not null default now(),
  -- Um valor por (veículo, mês de referência). Upsert nessa chave colapsa as
  -- linhas duplicadas que o mirror devolve.
  primary key (codigo_fipe, ano_modelo, sigla_combustivel, ano_referencia, mes_referencia)
);

-- Leitura da série de um modelo (página individual): filtra por codigo+ano,
-- ordena por mês.
create index if not exists idx_fipe_historico_modelo
  on fipe_historico (codigo_fipe, ano_modelo, ano_referencia, mes_referencia);

-- O codigo_fipe canônico do anúncio (vem do lookup na FIPE oficial). É a chave
-- pra buscar a série histórica do veículo daquele anúncio.
alter table opportunities add column if not exists fipe_codigo text;
