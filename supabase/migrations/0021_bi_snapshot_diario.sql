-- Frente 2 (BIA): snapshot diário agregado por marca+modelo(+estado).
-- Necessário porque o dado vivo (`opportunities`) não preserva histórico —
-- anúncios saem da base (rejeitados, ou futura regra de expiração de
-- "descobertas" antigas, ver project_repasse_livre_giro_anuncio_pendente) e
-- a série temporal ("Compass abaixo da FIPE pela primeira vez em 18 meses",
-- tendência de preço/estoque por região) se perderia sem um snapshot
-- próprio, gerado uma vez por dia (ver discovery-worker/src/snapshotDiario.ts).
--
-- `estado` nulo = linha agregada nacional; uma linha por UF além dela —
-- evita ter que escolher entre granularidade nacional ou estadual depois.

create table if not exists bi_snapshot_diario (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  marca text not null,
  modelo text not null,
  estado text,
  quantidade integer not null,
  preco_medio numeric,
  fipe_medio numeric,
  margem_media numeric,
  criado_em timestamptz not null default now(),
  unique (data, marca, modelo, estado)
);

create index if not exists idx_bi_snapshot_diario_data on bi_snapshot_diario (data);
create index if not exists idx_bi_snapshot_diario_marca_modelo on bi_snapshot_diario (marca, modelo, data);
