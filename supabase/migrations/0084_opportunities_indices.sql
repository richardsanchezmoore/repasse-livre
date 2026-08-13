-- 0084: mata as varreduras sequenciais em opportunities (Disk IO estourado no FREE).
-- As páginas de SEO /carros/{cidade|estado}/{marca} filtravam por cidade/estado/veiculo
-- SEM índice de apoio → full scan de ~58MB por acesso (818k seq scans; ~9,5k URLs
-- rastreadas por robô). Estes índices trocam o full scan por index scan.
create index if not exists idx_opp_status_cidade_data on public.opportunities (status, cidade, data_ordenacao desc);
create index if not exists idx_opp_status_estado_data on public.opportunities (status, estado, data_ordenacao desc);
-- veiculo é filtrado por ILIKE 'marca%' (marca-nacional) — GIN trgm resolve o ILIKE.
create extension if not exists pg_trgm;
create index if not exists idx_opp_veiculo_trgm on public.opportunities using gin (veiculo gin_trgm_ops);
