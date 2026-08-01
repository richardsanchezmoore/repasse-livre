-- ============================================================================
-- A CORTE — etapas de TEMA ÚNICO (fim das "etapas duplas") + campos de Igreja
-- + avatar do pretendente. Move campos existentes (mantém o id → as regras do
-- Veredito, que referenciam campo_id, seguem valendo).
-- ============================================================================

-- avatar (id do avatar ilustrado escolhido na criação do pretendente)
alter table public.corte_dossies add column if not exists avatar text;

-- novas etapas de tema único
insert into public.corte_etapas (chave, titulo, icone, ordem) values
  ('igreja', 'Igreja', '⛪',  0),
  ('fe',     'Fé',     '✝️', 1)
on conflict (chave) do nothing;

-- renomeia as antigas "duplas" para tema único + reordena
update public.corte_etapas set titulo = 'Gostos',    ordem = 2 where chave = 'gostos';
update public.corte_etapas set titulo = 'Caráter',   ordem = 3 where chave = 'carater';
update public.corte_etapas set titulo = 'Intenções', ordem = 4 where chave = 'intencoes';

-- move campos da antiga 'fe_igreja' → Igreja (igreja) e Fé (batizado/tempo/lar/pregadores)
update public.corte_campos set etapa_id = (select id from corte_etapas where chave='igreja'), ordem = 0
  where chave='igreja' and etapa_id = (select id from corte_etapas where chave='fe_igreja');
update public.corte_campos set etapa_id = (select id from corte_etapas where chave='fe'), ordem = 0
  where chave='batizado' and etapa_id = (select id from corte_etapas where chave='fe_igreja');
update public.corte_campos set etapa_id = (select id from corte_etapas where chave='fe'), ordem = 1
  where chave='tempo_fe' and etapa_id = (select id from corte_etapas where chave='fe_igreja');
update public.corte_campos set etapa_id = (select id from corte_etapas where chave='fe'), ordem = 2
  where chave='lar_cristao' and etapa_id = (select id from corte_etapas where chave='fe_igreja');
update public.corte_campos set etapa_id = (select id from corte_etapas where chave='fe'), ordem = 3
  where chave='pregadores' and etapa_id = (select id from corte_etapas where chave='fe_igreja');

-- "É constante na igreja?" pertence a Igreja (estava em Caráter)
update public.corte_campos set etapa_id = (select id from corte_etapas where chave='igreja'), ordem = 4
  where chave='pontual_igreja';

-- novos campos de Igreja (demonstração da granularidade)
insert into public.corte_campos (etapa_id, chave, rotulo, tipo, config, ordem)
select e.id, v.chave, v.rotulo, v.tipo, v.config::jsonb, v.ordem
from (values
  ('ministerio',          'Em qual ministério ele serve?',        'checkbox', '{"multipla":true,"opcoes":["Infantil","Juventude","Música","Louvor","Assistência Social","Missões","Nenhum","Não sei"]}', 1),
  ('cargo',               'Exerce algum cargo de liderança?',     'radio',    '{"opcoes":["Líder","Auxiliar","Nenhum","Não sei"]}',                                                                    2),
  ('cargo_eclesiastico',  'Possui cargo eclesiástico?',           'select',   '{"opcoes":["Membro","Auxiliar","Diácono","Evangelista","Presbítero","Pastor","Não sei"]}',                              3)
) as v(chave, rotulo, tipo, config, ordem)
join public.corte_etapas e on e.chave = 'igreja'
on conflict (etapa_id, chave) do nothing;

-- remove a etapa antiga 'fe_igreja' se ficou vazia
delete from public.corte_etapas
  where chave = 'fe_igreja'
    and not exists (select 1 from corte_campos c where c.etapa_id = corte_etapas.id);
