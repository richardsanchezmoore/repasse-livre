-- O upsert (ON CONFLICT dossie_id,campo_id) precisa de índice único NÃO-parcial
-- pra ser inferido pelo PostgREST. Nulos seguem distintos no índice, então
-- linhas legadas (campo_id null, keyed por capitulo/campo) não conflitam.
drop index if exists public.corte_respostas_dossie_campo_idx;
create unique index corte_respostas_dossie_campo_idx on public.corte_respostas(dossie_id, campo_id);
