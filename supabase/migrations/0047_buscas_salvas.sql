-- BUSCAS SALVAS + ALERTAS — o pilar "Alertas automáticos" da assinatura PRO.
-- O premium define "quero uma Duster até 80k em SC"; quando entra um anúncio que bate,
-- o event spine (/api/eventos/anuncio) dispara o alerta. Matching = os MESMOS filtros do
-- board (veiculo ILIKE marca%, preço, estado, ano, km, margem), só invertidos: em vez de
-- "usuário filtra a lista", é "anúncio novo bate nas buscas salvas". Ver a memória de
-- notificações por pré-definição.

-- ── buscas_salvas: uma pré-definição do usuário ──────────────────────────────────
create table if not exists buscas_salvas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text,                                   -- rótulo livre opcional ("Duster pra revenda")
  -- marca/modelo NÃO são colunas em opportunities (só o texto `veiculo`, normalizado
  -- "Marca Modelo Ano Versão"). Matching: veiculo ILIKE 'marca%' + (modelo? ILIKE '%modelo%').
  marca text not null,                         -- obrigatório
  modelo text,                                 -- OPCIONAL (afina dentro da marca)
  preco_min numeric,                           -- opcional (piso; null = 0)
  preco_max numeric not null,                  -- obrigatório (teto da faixa)
  estado text,                                 -- SIGLA (SC, SP…) ou NULL = Brasil inteiro
  ano_min int,                                 -- opcional
  ano_max int,                                 -- opcional
  km_max int,                                  -- opcional (teto de KM)
  margem_min numeric,                          -- opcional (% mínimo abaixo da FIPE; null = qualquer)
  -- 'na_hora' = alerta imediato (default; o timing É o valor do produto).
  -- 'diario'  = junta o dia num e-mail só (pra modelo comum que entra muito).
  frequencia text not null default 'na_hora' check (frequencia in ('na_hora', 'diario')),
  ativo boolean not null default true,         -- desliga sem apagar
  criado_em timestamptz not null default now()
);

create index if not exists idx_buscas_salvas_user on buscas_salvas(user_id);
-- Só as ativas entram no matching de cada anúncio novo — índice parcial enxuga a varredura.
create index if not exists idx_buscas_salvas_ativas on buscas_salvas(ativo) where ativo;

-- RLS: cada um gerencia as SUAS (padrão favoritos). O matching roda via service role
-- (ignora RLS). Admin não precisa de acesso especial aqui.
alter table buscas_salvas enable row level security;
drop policy if exists buscas_salvas_dono on buscas_salvas;
create policy buscas_salvas_dono on buscas_salvas
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── alertas_enviados: 1 linha por (busca, anúncio) — dedupe + fila do resumo diário ──
create table if not exists alertas_enviados (
  id uuid primary key default gen_random_uuid(),
  busca_id uuid not null references buscas_salvas(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  -- NULL = casou mas ainda não foi enviado (fila do resumo diário). Preenchido no envio.
  -- No modo 'na_hora' nasce e é preenchido no mesmo instante.
  enviado_em timestamptz,
  criado_em timestamptz not null default now(),
  -- ★ DEDUPE: nunca avisa 2× o mesmo carro pra mesma busca. O matching faz
  --   INSERT ... ON CONFLICT DO NOTHING; se já existe, não re-alerta.
  unique (busca_id, opportunity_id)
);

-- Fila do resumo diário: os pendentes (enviado_em null) de cada busca.
create index if not exists idx_alertas_pendentes on alertas_enviados(busca_id) where enviado_em is null;

-- Deny-all (só o worker/matching escreve via service role). Ver
-- project_repasse_livre_seguranca_rls_supabase.
alter table alertas_enviados enable row level security;
