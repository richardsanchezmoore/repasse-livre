-- Login passa a ser exigido pra anunciar (/enviar) — captura nome e
-- WhatsApp na própria conta na primeira vez que a pessoa anuncia (ou via
-- /completar-dados, pra quem só criou a conta simples e nunca anunciou).
-- NULL = conta ainda não "completou os dados".

alter table perfis add column if not exists nome text;
alter table perfis add column if not exists whatsapp text;

-- Permite ao próprio usuário atualizar seu nome/whatsapp (perfis hoje só
-- tinha política de select — ver migration 0009). Sem isso, o update feito
-- pelo client anon (criarSupabaseServer, respeita RLS) seria bloqueado.
drop policy if exists perfis_update_proprio on perfis;
create policy perfis_update_proprio on perfis
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Vínculo opcional de uma oportunidade com a conta que a enviou — null para
-- todo o histórico anterior a esta coluna e para origem_tipo='descoberta'
-- (a OLX não tem usuário nosso associado). Base pra um futuro painel "minhas
-- oportunidades" por vendedor, sem precisar de nenhum retrabalho nos dados
-- já capturados a partir de agora.
alter table opportunities add column if not exists criado_por uuid references auth.users(id) on delete set null;

create index if not exists idx_opportunities_criado_por on opportunities (criado_por);
