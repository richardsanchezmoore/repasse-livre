-- ════════════════════════════════════════════════════════════════════════════
-- CATEGORIA: carro × moto — a fundação de /motos
--
-- ★★ Pedido do Gustavo desde 09/10 ("iremos cuidar das motos como uma subpasta
-- dedicada /motos") e autorizado em 16/10/2026.
--
-- ★★★ POR QUE UMA COLUNA, E NÃO OUTRO SITE OU OUTRA TABELA: é a mesma regra
-- que separou a era Brasil da era Paraguai e que já evitou um desastre ali —
-- *"separar as eras é por DADO, NUNCA por domínio"*. Moto e carro dividem tudo
-- (captação, praças, hash de foto, motor de duplicata, livro de observações);
-- o que NÃO podem dividir é a mediana.
--
-- ⚠️⚠️ E a mediana é a razão de verdade. Medido em 15/10/2026 na base:
--
--     mediana moto  ₲ 7.500.000
--     mediana carro ₲34.800.000     → 4,6×
--
-- Sem a coluna, uma Kenton de ₲7 milhões entra na mesma distribuição de um
-- Vitz de ₲45 milhões. Não é só uma linha feia na tabela: é o selo "X% abaixo"
-- mentindo nos dois lados ao mesmo tempo.
--
-- ⚠️ DEFAULT 'carro' de propósito: a base inteira nasceu de varredura na
-- categoria /carros/ do Marketplace. Deixar nulo obrigaria todo consumidor a
-- tratar o nulo, e a primeira consulta que esquecesse voltaria a misturar.
--
-- ⚠️ As motos que JÁ existem entraram por acidente (o Marketplace mistura) e
-- são reconhecíveis pela MARCA, não pelo texto: tentar achá-las por cilindrada
-- foi medido e reprovado — o padrão casa com "Pajero 1.1cc", "Motor 1300" e
-- "Ort 720", devolvendo 339 candidatas das quais quase todas são carro.
-- ════════════════════════════════════════════════════════════════════════════

alter table opportunities
  add column if not exists categoria text not null default 'carro';

-- ⚠️ Restrição, não convenção: sem ela um typo em 'moto' cria uma terceira
-- categoria fantasma que só aparece quando a vitrine vier vazia.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'opportunities_categoria_check'
  ) then
    alter table opportunities
      add constraint opportunities_categoria_check
      check (categoria in ('carro', 'moto'));
  end if;
end $$;

-- As motos que já estão na base, pelas marcas que só fazem moto.
-- ⚠️ `honda_moto` NÃO entra aqui: a chave é interna do normalizador e a marca
-- gravada é "Honda", que também faz carro. Esses casos ficam como carro até
-- alguém olhar — errar para o lado do carro é o erro barato, porque a base
-- inteira já é carro.
update opportunities
   set categoria = 'moto'
 where pais = 'PY'
   and categoria = 'carro'
   and lower(coalesce(marca, '')) in (
     'kenton', 'buler', 'skua', 'ktm', 'yamaha', 'leopard',
     'zanella', 'motomel', 'bajaj', 'gtr', 'star'
   );

create index if not exists opp_categoria_pais_idx
  on opportunities (pais, categoria)
  where status = 'aprovada';

comment on column opportunities.categoria is
  'carro | moto. Separa as duas curvas de preco: a mediana da moto e ~4,6x menor que a do carro (medido 15/10/2026). Default carro porque a base nasceu da varredura /carros/.';
