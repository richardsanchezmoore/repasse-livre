-- ★★★ OS ALERTAS PASSAM A FALAR PARAGUAIO — 18/10/2026.
--
-- `buscas_salvas` nasceu para o Repasse Livre brasileiro e três coisas dela
-- simplesmente NÃO FUNCIONAM no Paraguai. Medido na base de hoje (5.618
-- anúncios aprovados):
--
--   1. PREÇO SEM MOEDA. 74% dos anúncios estão em guarani e 26% em dólar, e a
--      busca guardava só um número. Um alerta de "até ₲50.000.000" casava um
--      anúncio de "US$ 9.000" (9.000 ≤ 50.000.000), e um alerta de "até US$
--      10.000" casava quase nada. Errado nos dois sentidos, e em silêncio.
--
--   2. `estado` guardava sigla brasileira. No Paraguai o campo traz o
--      departamento ("PY-ASU", "PY-APA") — que o usuário não reconhece. Quem
--      compra pensa em CIDADE, e cidade é o que a praça nos dá (99% preenchido).
--
--   3. `margem_min` era "% abaixo da FIPE". **`margem_percentual` e
--      `fipe_valor` estão NULOS em 100% dos anúncios paraguaios** — não existe
--      FIPE aqui. Um alerta com margem nunca enviaria um único e-mail, para
--      sempre, sem nenhum sinal de que está quebrado.
--      ★ A coluna FICA, com outro sentido: % abaixo da NOSSA tabela de
--      referência. É a mesma pergunta ("está barato?") respondida com o ativo
--      que o produto inteiro existe para construir — e é o que ninguém mais
--      no Paraguai consegue oferecer.
alter table public.buscas_salvas
  add column if not exists moeda text not null default 'PYG';

alter table public.buscas_salvas
  drop constraint if exists buscas_salvas_moeda_check;
alter table public.buscas_salvas
  add constraint buscas_salvas_moeda_check check (moeda in ('PYG', 'USD'));

-- ⚠️ Cidade e não departamento: é o nome que o comprador reconhece, e é o que
-- a praça grava. `null` = qualquer cidade.
alter table public.buscas_salvas
  add column if not exists cidade text;

comment on column public.buscas_salvas.margem_min is
  'Paraguai: % mínimo ABAIXO DA TABELA DE REFERÊNCIA (py_tabela_referencia). '
  'Era "% abaixo da FIPE" na era brasileira — não há FIPE no Paraguai.';
