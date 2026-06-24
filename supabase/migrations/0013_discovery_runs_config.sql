-- Painel de controle do worker no apps/admin: o usuário precisa ver
-- status/histórico de varreduras e editar config sem entrar no Railway.
--
-- discovery_runs: histórico de execuções do discovery-worker, uma linha por
-- categoria_url por execução (hoje o worker varre 1+ URLs de estado em
-- sequência numa mesma invocação do cron — ver CATEGORIAS_URL_BASE em
-- main.ts). O próprio worker grava o início e atualiza ao final.
create table if not exists discovery_runs (
  id uuid primary key default gen_random_uuid(),
  categoria_url text not null,
  modo text not null,
  status text not null default 'em_andamento', -- 'em_andamento' | 'sucesso' | 'erro'
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  novos int,
  elegiveis int,
  descartados int,
  sem_fipe int,
  erro_mensagem text
);

create index if not exists discovery_runs_iniciado_em_idx on discovery_runs (iniciado_em desc);

-- worker_config: chave/valor (não colunas fixas) pra poder adicionar novas
-- configs do worker no futuro sem migration. O worker lê daqui no início de
-- cada execução, caindo no env var/default de hoje quando a chave não
-- existe na tabela ainda.
create table if not exists worker_config (
  chave text primary key,
  valor text not null,
  atualizado_em timestamptz not null default now()
);

-- Aplicar manualmente no SQL Editor do Supabase (migrations deste projeto
-- não rodam sozinhas).
