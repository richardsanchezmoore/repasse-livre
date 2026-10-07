-- As três colunas do Paraguai que NUNCA viraram migração.
--
-- ⚠️ NUMERADA 0085b, não 0087, DE PROPÓSITO: estas colunas existem desde
-- setembro, antes da 0086 (kpis_topo por país), que DEPENDE delas. Numerar como
-- 0087 deixaria o conjunto irreproduzível num banco vazio — a 0086 falharia de
-- novo, exatamente como falhou aqui.
--
-- ⚠️⚠️ ACHADO NA MIGRAÇÃO PARA O PROJETO NOVO (06/10/2026): `moeda`,
-- `procedencia` e `pais` foram criadas À MÃO no banco antigo em setembro,
-- durante a virada para o Paraguai, e nunca foram escritas como migração.
--
-- O sintoma: a 0086 (kpis_topo por país) falhou com `column "pais" does not
-- exist` depois de 85 migrações terem passado. As 85 reconstruíram o schema
-- BRASILEIRO perfeitamente — e o Paraguai inteiro, que é o produto de hoje,
-- não existia no histórico.
--
-- ★ A lição não é "faltou uma migração": é que o schema deixou de ser
-- reproduzível sem ninguém perceber, e só a mudança de projeto revelou. Coluna
-- criada pelo editor do painel não deixa rastro em lugar nenhum.
--
-- Definições copiadas do banco antigo, não inventadas:
--   moeda        text, nulo permitido, sem default
--   procedencia  text, nulo permitido, sem default
--   pais         text, NOT NULL, default 'BR'

alter table opportunities add column if not exists moeda       text;
alter table opportunities add column if not exists procedencia text;
alter table opportunities add column if not exists pais        text not null default 'BR';

comment on column opportunities.moeda is
  'Moeda do anúncio: PYG, USD ou BRL. O preço é FATO na moeda de origem; o real é LEITURA, convertido na exibição.';
comment on column opportunities.procedencia is
  'zero_km | importado | uso_local | desconhecida — segmenta a curva de preço paraguaia.';
comment on column opportunities.pais is
  'BR ou PY. Separa as eras por DADO, nunca por domínio: o Auto Radar PY e o Repasse Livre dividem a mesma base.';

-- ★ O filtro por país roda em TODA consulta pública da listagem (23 pontos,
-- desde 06/10), sempre junto de `status`. Sem índice, cada visita vira varredura
-- — e foi exatamente esse tipo de desperdício que estourou a cota de egress.
create index if not exists idx_opportunities_pais_status
  on opportunities (pais, status);
