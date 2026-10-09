-- ════════════════════════════════════════════════════════════════════════════
-- O LIVRO DE OBSERVAÇÕES DE PREÇO — o ativo que sobrevive ao anúncio.
--
-- ★★★ A TESE (Gustavo, 09/10/2026): *"os anúncios sem fotos nós vamos
-- descartar, mas os dados de preço seguirão balizando nossa tabela dentro de
-- cada mês... esse é o maior ouro, o COMPORTAMENTO do preço. É isso que
-- estamos captando."*
--
-- ⚠️⚠️ E ISSO TEM UMA CONSEQUÊNCIA QUE PRECISA SER RESOLVIDA ANTES, NÃO DEPOIS:
-- hoje a tabela de referência é calculada direto de `opportunities`. Anúncio
-- que sai do ar e some leva o preço junto. Medido em 09/10: de 159 anúncios
-- revisitados no backfill de fotos, **90 já não existiam** — 57% em um dia.
--
-- ⚠️ Pior: existe no caderno um plano de EXPIRAÇÃO DE 90 DIAS, apagar anúncio
-- velho. Do jeito que está desenhado, ele destruiria exatamente este ouro.
--
-- ★ A separação que resolve: o ANÚNCIO é efêmero — sai da listagem quando
-- perde foto ou sai do ar. A OBSERVAÇÃO DE PREÇO é permanente.
--
-- ═══ POR QUE OBSERVAÇÃO CRUA, E NÃO AGREGADO MENSAL ═══
--
-- `bi_snapshot_diario` (era Brasil) guarda agregado por marca+modelo. Não serve
-- aqui, por duas razões:
--
--   1. mediana de medianas NÃO é mediana — agregar antes de agrupar por geração
--      daria um número que não corresponde a mercado nenhum;
--   2. as regras MELHORAM. O filtro de preço solitário nasceu em 08/10, o raio
--      em 09/10. Guardando o agregado, não dá para reprocessar o passado com a
--      regra nova; guardando a observação, dá.
--
-- ⚠️ Custo: ~1.000 linhas/mês, 12 mil/ano. Irrisório perto do que se perde.
--
-- ═══ IMUTÁVEL DE PROPÓSITO ═══
--
-- Uma observação é um FATO DATADO: "em 09/10/2026 havia um Vitz XP90 a ₲39M em
-- Asunción". Isso não deixa de ser verdade quando o anúncio sai. Por isso a
-- tabela não tem UPDATE no fluxo: só INSERT, e `item_id + mes` impede a mesma
-- oferta de contar duas vezes no mesmo mês.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists py_observacoes_preco (
  id          bigserial primary key,
  item_id     text        not null,
  -- ★ O mês é a unidade do comportamento: dentro dele a oferta é uma só, entre
  -- eles é que a série se move.
  mes         date        not null,
  modelo      text,
  geracao     text,
  ano         int,
  preco       numeric     not null,
  moeda       text        not null,
  cidade      text,
  -- De onde veio a leitura: símbolo, descrição, grandeza, resgate. ⚠️ Sem isto
  -- não dá para, mais tarde, recalcular a série aceitando só as mais firmes.
  confianca   text,
  criado_em   timestamptz not null default now(),

  -- ⚠️ A mesma oferta no mesmo mês é UMA observação. Sem isto, um anúncio
  -- revisitado cinco vezes pesaria cinco vezes na mediana do mês.
  unique (item_id, mes)
);

create index if not exists py_obs_modelo_mes_idx on py_observacoes_preco (modelo, geracao, mes);
create index if not exists py_obs_mes_idx on py_observacoes_preco (mes);

alter table py_observacoes_preco enable row level security;

comment on table py_observacoes_preco is
  'Observações de preço, imutáveis e datadas por mês. Sobrevivem ao anúncio: o anúncio é efêmero, o preço observado é fato histórico. É a base do comportamento do preço ao longo do tempo — e NÃO pode ser alvo da expiração de 90 dias.';
