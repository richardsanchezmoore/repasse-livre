-- ★★★ PAÍS NO LIVRO DE OBSERVAÇÕES — e isto nasceu de um erro grande.
--
-- ⚠️⚠️ Em 16/10/2026 descobri que a praça "Concepción" aponta para a
-- Concepción do CHILE, não a do Paraguai. A URL configurada era
-- `/marketplace/concepcion/carros/` — um slug de NOME, sem id de localidade —
-- e o Facebook resolve para a cidade maior, que é a chilena (220 mil
-- habitantes contra 80 mil da paraguaia).
--
-- O estrago, medido: 1.704 anúncios na base, 1.652 deles publicados, com
-- mediana de ₲11,5 milhões contra ₲40 a 58 milhões de TODAS as outras praças.
-- São pesos chilenos lidos como guarani. As provas no texto são inequívocas:
-- "BENCINERO" (no Paraguai se diz nafta), "se puede ver en Santiago centro",
-- "permiso de circulación", "revisión técnica".
--
-- ★ A correção é de DADO, não de domínio: esses anúncios são fatos verdadeiros
-- sobre o Chile e falsos sobre o Paraguai. `opportunities.pais` já existe e o
-- site inteiro filtra por ele, então lá basta corrigir o valor. O livro de
-- observações não tinha a coluna — e sem ela a mediana paraguaia continuaria
-- comendo preço chileno mesmo com os anúncios fora do ar.
--
-- ⚠️ Nada é apagado. A observação chilena segue sendo uma observação válida, e
-- se um dia o produto for ao Chile ela já está no livro, datada.
alter table public.py_observacoes_preco
  add column if not exists pais text not null default 'PY';

alter table public.py_observacoes_preco
  drop constraint if exists py_observacoes_preco_pais_check;
alter table public.py_observacoes_preco
  add constraint py_observacoes_preco_pais_check
  check (pais in ('PY', 'CL', 'BR', 'AR', 'UY', 'BO'));

-- A tabela é lida por (mes, pais, categoria) na publicação da referência.
create index if not exists py_observacoes_preco_pais_idx
  on public.py_observacoes_preco (mes, pais, categoria);
