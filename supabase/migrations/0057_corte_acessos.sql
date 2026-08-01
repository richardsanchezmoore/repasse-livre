-- ============================================================================
-- A CORTE — ACESSOS (Kit vitalício / assinatura) + planos configuráveis.
-- corte_acessos: quem tem direito a quê. Concedido manualmente (admin) ou
-- automaticamente pelo webhook da Cakto. Gate dos materiais lê daqui.
-- ============================================================================

create table if not exists public.corte_acessos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  tipo          text not null,                      -- kit | assinatura
  status        text not null default 'ativo',      -- ativo | cancelado | expirado
  origem        text,                               -- cakto | manual | cortesia
  referencia    text,                               -- id externo (Cakto)
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  expira_em     timestamptz,                        -- null = vitalício (Kit)
  unique (user_id, tipo)
);
create index if not exists corte_acessos_user_idx on public.corte_acessos(user_id);

alter table public.corte_acessos enable row level security;
-- usuária lê o PRÓPRIO acesso; admin lê todos (políticas permissivas = OR)
drop policy if exists corte_acessos_sel_own on public.corte_acessos;
drop policy if exists corte_acessos_sel_admin on public.corte_acessos;
drop policy if exists corte_acessos_ins on public.corte_acessos;
drop policy if exists corte_acessos_upd on public.corte_acessos;
drop policy if exists corte_acessos_del on public.corte_acessos;
create policy corte_acessos_sel_own on public.corte_acessos for select using (auth.uid() = user_id);
create policy corte_acessos_sel_admin on public.corte_acessos for select using (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));
create policy corte_acessos_ins on public.corte_acessos for insert with check (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));
create policy corte_acessos_upd on public.corte_acessos for update using (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));
create policy corte_acessos_del on public.corte_acessos for delete using (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));

-- planos (config editável no painel Assinaturas)
insert into public.corte_config (chave, valor) values
('planos', '{
  "kit": {"nome":"Kit da Temporada","preco":"R$ 29,90","descricao":"O Panfleto + os bônus, acesso vitalício.","cakto_url":"https://pay.cakto.com.br/39wc86g_1010439","cakto_produto":""},
  "assinatura": {"nome":"A Corte","preco":"R$ 19,90/mês","descricao":"Jornada semanal, o Salão e as ferramentas de discernimento.","cakto_url":"","cakto_produto":"","trial_dias":7}
}'::jsonb)
on conflict (chave) do nothing;
