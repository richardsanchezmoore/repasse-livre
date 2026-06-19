-- Sprint 1: estrutura inicial do Banco Nacional de Oportunidades

create table if not exists fipe_referencia (
  id uuid primary key default gen_random_uuid(),
  marca text not null,
  modelo text not null,
  ano text not null,
  valor numeric not null,
  mes_referencia text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fipe_referencia_marca_modelo_ano
  on fipe_referencia (marca, modelo, ano);

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  fonte text not null,
  link_origem text not null unique,
  veiculo text not null,
  versao text,
  ano text,
  cambio text,
  cidade text,
  estado text,
  preco numeric not null,
  fipe_valor numeric,
  fipe_data_referencia text,
  margem_percentual numeric,
  classificacao text,
  foto_principal text,
  fotos_secundarias jsonb default '[]'::jsonb,
  descricao text,
  origem_tipo text not null default 'descoberta', -- 'descoberta' | 'insercao_direta'
  status text not null default 'descoberta', -- 'descoberta' | 'aprovada' | 'rejeitada' | 'enviada' | 'favoritada'
  data_captura timestamptz not null default now(),
  data_atualizacao timestamptz not null default now()
);

create index if not exists idx_opportunities_status on opportunities (status);
create index if not exists idx_opportunities_estado on opportunities (estado);
