-- ★★ CATEGORIA NO LIVRO DE OBSERVAÇÕES DE PREÇO.
--
-- A migração 0097 criou `categoria` em `opportunities` para separar carro de
-- moto — mas a mediana não sai de lá: sai de `py_observacoes_preco`, que é o
-- livro que sobrevive ao anúncio. Sem a coluna aqui, uma Kenton de ₲6,5
-- milhões entra no mesmo caldeirão de um Prado, e a separação existe só no
-- papel.
--
-- ⚠️ Medido em 16/10/2026: a mediana da moto é ₲7,5 milhões contra ₲34,8
-- milhões do carro. Não é ruído em torno da mesma média — são dois mercados.
--
-- `default 'carro'` porque tudo o que já está no livro é carro: a varredura de
-- moto começou hoje.
alter table public.py_observacoes_preco
  add column if not exists categoria text not null default 'carro';

alter table public.py_observacoes_preco
  drop constraint if exists py_observacoes_preco_categoria_check;
alter table public.py_observacoes_preco
  add constraint py_observacoes_preco_categoria_check
  check (categoria in ('carro', 'moto'));

-- ⚠️ Índice PARCIAL: a tabela é lida quase sempre com `categoria = 'carro'`,
-- e um índice cheio pagaria escrita em todas as linhas para servir a poucas.
create index if not exists py_observacoes_preco_moto_idx
  on public.py_observacoes_preco (modelo, geracao, moeda)
  where categoria = 'moto';
