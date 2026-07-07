-- Correção dos alertas do Security Advisor do Supabase (email 06/07/2026).
--
-- (A) 6 ERROS "RLS Disabled in Public": tabelas no schema public sem Row-Level
--     Security → qualquer um com a URL do projeto lê/edita/apaga via API anon.
--     TODAS as 6 são acessadas SÓ pelo service role (supabaseAdmin no servidor
--     do admin) e pelo worker (service role) — nenhum cliente anon as lê direto
--     (auditado: fipe_historico e anuncio_preco_log via supabaseAdmin em
--     lib/fipeHistorico.ts e lib/bia/*; BIA/KPIs via .rpc no service role;
--     HistoricoPrecos.tsx recebe por props). Service role IGNORA RLS, então
--     habilitar RLS SEM policy nenhuma (deny-all pro anon) não quebra nada.
--     schema_migrations é a tabela de controle do runner, que conecta via
--     DATABASE_URL (dono da tabela, bypassa RLS) — segue gravando normal.
alter table anuncio_preco_log   enable row level security;
alter table fipe_historico      enable row level security;
alter table fipe_mapa_aprendido enable row level security;
alter table bi_snapshot_diario  enable row level security;
alter table bi_recalculo_fipe   enable row level security;
alter table schema_migrations   enable row level security;

-- (B) 15 WARNINGS "Function Search Path Mutable": funções public sem search_path
--     fixo herdam o do chamador (risco de search_path hijacking). Pina um
--     search_path fixo em TODA função public (idempotente; cobre as bia_*,
--     kpis_topo e futuras). Inclui public (tabelas do projeto), extensions
--     (extensões do Supabase) e pg_temp (exigido por segurança). Como as
--     funções referenciam tabelas de public sem qualificar, manter public no
--     caminho preserva o comportamento.
do $$
declare
  r record;
begin
  for r in
    select p.proname as nome,
           pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
  loop
    execute format(
      'alter function public.%I(%s) set search_path = public, extensions, pg_temp',
      r.nome, r.args
    );
  end loop;
end $$;
