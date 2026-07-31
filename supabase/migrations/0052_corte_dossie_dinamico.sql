-- ============================================================================
-- A CORTE — Dossiê DINÂMICO (construído pelo painel admin, não no código).
-- corte_etapas (os "capítulos") -> corte_campos (os campos, com tipo+config).
-- O app renderiza a partir daqui; o admin cria/edita/reordena.
-- Namespace corte_* (amputável). RLS: leitura p/ todos logados; escrita só admin.
-- ============================================================================

-- Admin flag na membra
alter table public.corte_membros add column if not exists is_admin boolean not null default false;

-- ── Etapas (capítulos do dossiê) ────────────────────────────────────────────
create table if not exists public.corte_etapas (
  id        uuid primary key default gen_random_uuid(),
  chave     text unique not null,
  titulo    text not null,
  icone     text,
  ordem     int  not null default 0,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ── Campos (pertencem a uma etapa; tipo + config flexível) ──────────────────
-- tipo: 'input' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'slider'
-- config (jsonb): { opcoes:[], multipla:bool, min, max, passo, placeholder, dica, unidade }
create table if not exists public.corte_campos (
  id             uuid primary key default gen_random_uuid(),
  etapa_id       uuid not null references public.corte_etapas(id) on delete cascade,
  chave          text not null,
  rotulo         text not null,
  tipo           text not null default 'input',
  config         jsonb not null default '{}'::jsonb,
  ordem          int  not null default 0,
  obrigatorio    boolean not null default false,
  peso           int  not null default 1,          -- p/ o Veredito por pontuação (fase 2)
  regra_veredito jsonb,                             -- p/ regras crudas por campo (fase 2)
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  unique (etapa_id, chave)
);
create index if not exists corte_campos_etapa_idx on public.corte_campos(etapa_id, ordem);

-- ── Respostas agora referenciam o campo por ID (estável a renomeações) ──────
alter table public.corte_respostas add column if not exists campo_id uuid references public.corte_campos(id) on delete cascade;
alter table public.corte_respostas alter column capitulo drop not null;
alter table public.corte_respostas alter column campo drop not null;
create unique index if not exists corte_respostas_dossie_campo_idx on public.corte_respostas(dossie_id, campo_id) where campo_id is not null;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.corte_etapas enable row level security;
alter table public.corte_campos enable row level security;

-- helper inline: é admin?
--   exists (select 1 from corte_membros m where m.user_id = auth.uid() and m.is_admin)

-- etapas: leitura p/ todos; escrita só admin
drop policy if exists corte_etapas_sel on public.corte_etapas;
drop policy if exists corte_etapas_ins on public.corte_etapas;
drop policy if exists corte_etapas_upd on public.corte_etapas;
drop policy if exists corte_etapas_del on public.corte_etapas;
create policy corte_etapas_sel on public.corte_etapas for select using (true);
create policy corte_etapas_ins on public.corte_etapas for insert with check (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));
create policy corte_etapas_upd on public.corte_etapas for update using (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));
create policy corte_etapas_del on public.corte_etapas for delete using (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));

-- campos: leitura p/ todos; escrita só admin
drop policy if exists corte_campos_sel on public.corte_campos;
drop policy if exists corte_campos_ins on public.corte_campos;
drop policy if exists corte_campos_upd on public.corte_campos;
drop policy if exists corte_campos_del on public.corte_campos;
create policy corte_campos_sel on public.corte_campos for select using (true);
create policy corte_campos_ins on public.corte_campos for insert with check (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));
create policy corte_campos_upd on public.corte_campos for update using (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));
create policy corte_campos_del on public.corte_campos for delete using (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));

-- ── SEMENTE: as perguntas-base já criadas (dão "corpo" ao painel) ───────────
insert into public.corte_etapas (chave, titulo, icone, ordem) values
  ('fe_igreja', 'Fé & Igreja',      '⛪', 0),
  ('gostos',    'Gostos & Cultura', '🎵', 1),
  ('carater',   'Caráter & Frutos', '🌿', 2),
  ('intencoes', 'Intenções & Vida', '💍', 3)
on conflict (chave) do nothing;

-- campos (etapa por subselect da chave; idempotente por unique(etapa_id,chave))
insert into public.corte_campos (etapa_id, chave, rotulo, tipo, config, ordem)
select e.id, v.chave, v.rotulo, v.tipo, v.config::jsonb, v.ordem
from (values
  -- Fé & Igreja
  ('fe_igreja','igreja',      'Qual igreja ele congrega?',            'input',   '{"placeholder":"Ex.: Assembleia de Deus — bairro Belém"}', 0),
  ('fe_igreja','batizado',    'É batizado?',                          'radio',   '{"opcoes":["Sim","Não","Não sei"]}',                       1),
  ('fe_igreja','tempo_fe',    'Há quanto tempo é convertido?',        'input',   '{"placeholder":"Ex.: 3 anos"}',                            2),
  ('fe_igreja','lar_cristao', 'Nasceu em lar cristão?',               'radio',   '{"opcoes":["Sim","Não","Não sei"]}',                       3),
  ('fe_igreja','pregadores',  'Quais pregadores ele admira?',         'input',   '{"dica":"separe por vírgula"}',                            4),
  -- Gostos & Cultura
  ('gostos','estilo_musica',  'Estilos de música que ele curte',      'checkbox','{"multipla":true,"opcoes":["Sertanejo Gospel","Rock Gospel","Adoração","Hip-Hop Gospel","Gospel Internacional","Congregacional","Não sei"]}', 0),
  ('gostos','lazer',          'O que ele faz no tempo livre?',        'textarea','{}',                                                       1),
  ('gostos','esporte',        'Pratica algum esporte?',               'input',   '{}',                                                       2),
  -- Caráter & Frutos
  ('carater','trata_mae',     'Como ele trata a própria mãe?',        'textarea','{}',                                                       0),
  ('carater','pontual_igreja','É constante na igreja?',               'radio',   '{"opcoes":["Sempre","Às vezes","Raramente","Não sei"]}',   1),
  ('carater','paciencia',     'O quanto ele é paciente? (0–10)',      'slider',  '{"min":0,"max":10,"passo":1}',                             2),
  ('carater','reacao_nao',    'Como reage ao ouvir um "não"?',        'textarea','{}',                                                       3),
  -- Intenções & Vida
  ('intencoes','trabalho',    'Do que ele trabalha?',                 'input',   '{}',                                                       0),
  ('intencoes','planos',      'Que planos tem pro futuro?',           'textarea','{}',                                                       1),
  ('intencoes','intencao',    'A intenção com você é clara?',         'radio',   '{"opcoes":["Sim, declarada","Ainda vaga","Não sei"]}',     2)
) as v(etapa_chave, chave, rotulo, tipo, config, ordem)
join public.corte_etapas e on e.chave = v.etapa_chave
on conflict (etapa_id, chave) do nothing;
