-- Guarda o snapshot_id do Bright Data no registro da varredura (Webmotors) —
-- gravado assim que o snapshot é DISPARADO, antes do download. Se o run falha no
-- download ou o processo morre ("em_andamento" preso), o id fica salvo e a
-- recuperação (recuperarSnapshotsWebmotors) reingere de graça sem precisar
-- caçar o id no dashboard do Bright Data. Ver
-- project_repasse_livre_webmotors_async_e_custo.
alter table discovery_runs add column if not exists snapshot_id text;
