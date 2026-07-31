-- ============================================================================
-- A CORTE — O VEREDITO. Regras por campo (definição crua) + faixas (pontuação).
-- Avaliação cruza as respostas do dossiê com as regras → sinais 🟢🟡🔴 + total
-- de pontos → faixa (parecer geral). Guarda pastoral: discernimento, não sentença.
-- ============================================================================

-- Config genérica chave/valor (guarda as faixas do veredito, e futuro)
create table if not exists public.corte_config (
  chave         text primary key,
  valor         jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- Regras: cada uma avalia UM campo com UMA condição
create table if not exists public.corte_regras (
  id        uuid primary key default gen_random_uuid(),
  campo_id  uuid not null references public.corte_campos(id) on delete cascade,
  condicao  text not null,        -- preenchido | vazio | igual | diferente | contem | nao_contem | faixa
  valor     jsonb,                -- {opcao:"X"} | {min,max} | null
  pontos    int  not null default 0,
  bandeira  text not null default 'neutro',   -- verde | amarelo | vermelho | neutro
  mensagem  text,
  ordem     int  not null default 0,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists corte_regras_campo_idx on public.corte_regras(campo_id);

-- ── RLS: leitura p/ todos; escrita só admin ─────────────────────────────────
alter table public.corte_config enable row level security;
alter table public.corte_regras enable row level security;

drop policy if exists corte_config_sel on public.corte_config;
drop policy if exists corte_config_ins on public.corte_config;
drop policy if exists corte_config_upd on public.corte_config;
create policy corte_config_sel on public.corte_config for select using (true);
create policy corte_config_ins on public.corte_config for insert with check (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));
create policy corte_config_upd on public.corte_config for update using (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));

drop policy if exists corte_regras_sel on public.corte_regras;
drop policy if exists corte_regras_ins on public.corte_regras;
drop policy if exists corte_regras_upd on public.corte_regras;
drop policy if exists corte_regras_del on public.corte_regras;
create policy corte_regras_sel on public.corte_regras for select using (true);
create policy corte_regras_ins on public.corte_regras for insert with check (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));
create policy corte_regras_upd on public.corte_regras for update using (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));
create policy corte_regras_del on public.corte_regras for delete using (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));

-- ── SEMENTE: faixas do veredito ─────────────────────────────────────────────
insert into public.corte_config (chave, valor) values
('veredito_faixas', '[
  {"ate":-2,"rotulo":"Acenda o alerta","bandeira":"vermelho","mensagem":"Vários sinais pedem cautela. Leve esse nome a Deus em oração antes de avançar."},
  {"ate":1,"rotulo":"Requer discernimento","bandeira":"amarelo","mensagem":"Há luz e há sombras. Observe mais, pergunte mais, ore mais — sem pressa."},
  {"ate":9999,"rotulo":"Cavalheiro promissor","bandeira":"verde","mensagem":"Os sinais são bons. Siga conhecendo com sabedoria, mantendo Deus no centro."}
]'::jsonb)
on conflict (chave) do nothing;

-- ── SEMENTE: regras de exemplo (só se a tabela estiver vazia) ───────────────
insert into public.corte_regras (campo_id, condicao, valor, pontos, bandeira, mensagem, ordem)
select c.id, v.condicao, v.valor::jsonb, v.pontos, v.bandeira, v.mensagem, v.ordem
from (values
  ('intencao',       'igual', '{"opcao":"Sim, declarada"}',  2, 'verde',    'A intenção com você é clara e declarada — excelente sinal.', 0),
  ('intencao',       'igual', '{"opcao":"Ainda vaga"}',     -1, 'amarelo',  'A intenção ainda é vaga. Cuidado com o coração que se envolve sem clareza.', 1),
  ('pontual_igreja', 'igual', '{"opcao":"Raramente"}',      -2, 'vermelho', 'Constância na fé é fundamento — a raridade acende um alerta.', 2),
  ('batizado',       'igual', '{"opcao":"Não"}',            -1, 'amarelo',  'Ele ainda não deu esse passo público de fé. Não é o fim — mas observe a caminhada dele com Deus.', 3),
  ('pregadores',     'vazio', null,                          0, 'amarelo',  'Você ainda sabe pouco sobre quem molda a fé dele. Pergunte quais pregadores ele admira — diz muito.', 4),
  ('lar_cristao',    'vazio', null,                          0, 'amarelo',  'Vale descobrir a história de fé da família dele.', 5),
  ('paciencia',      'faixa', '{"min":0,"max":3}',          -1, 'vermelho', 'Pouca paciência hoje vira aspereza amanhã. Observe como ele reage à frustração.', 6)
) as v(campo_chave, condicao, valor, pontos, bandeira, mensagem, ordem)
join public.corte_campos c on c.chave = v.campo_chave
where not exists (select 1 from public.corte_regras);
