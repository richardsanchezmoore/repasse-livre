-- ════════════════════════════════════════════════════════════════════════════
-- REANÚNCIO: o mesmo carro publicado várias vezes.
--
-- ★ Gustavo viu na home (11/10/2026): *"já vi duplicação de anúncio"* — dois
-- "Kia Morning 2015" a ₲22.900.000, lado a lado, com um minuto de diferença.
--
-- ⚠️ MEDIDO ANTES DE AGIR, e o diagnóstico mudou o remédio:
--     • mesmo link de origem ......... 0 grupos  (a dedupe da captura funciona)
--     • mesma foto ................... 0 grupos  (cada captura re-hospeda nova)
--     • mesmo modelo+ano+preço+cidade . 97 grupos, 158 excedentes  ← é isto
--
-- Não é bug de captura: é o VENDEDOR republicando. O Facebook dá um id novo a
-- cada republicação, então para nós são anúncios distintos. Conferido num
-- grupo: 7 "Pajero" a ₲22.000.000 em Ciudad del Este, mesma descrição palavra
-- por palavra, publicados em 3 dias pela mesma loja.
--
-- ═══ ⚠️⚠️ POR QUE UMA COLUNA, E NÃO UM FILTRO NA CONSULTA ═══
--
-- Colapsar na hora de listar quebraria a paginação: uma página de 40 viraria 35,
-- e a contagem do topo mentiria. Marcando no dado, a consulta filtra
-- `duplicata_de is null` e tudo continua somando certo.
--
-- ⚠️ NÃO APAGA e NÃO REJEITA. O excedente continua no banco, e a OBSERVAÇÃO DE
-- PREÇO dele continua no livro — ela é fato datado. Quem decide o que entra na
-- mediana é `calcularReferencia`, que já conta ofertas DISTINTAS e não anúncios
-- (é o que a tabela imprime como "40 anúncios → 27 ofertas").
--
-- ⚠️ `duplicata_de` aponta para o id do anúncio MANTIDO — o mais recente. Assim
-- dá para desfazer, auditar, e mostrar "republicado 7 vezes" no futuro sem
-- precisar recalcular nada.
-- ════════════════════════════════════════════════════════════════════════════

alter table opportunities add column if not exists duplicata_de text;

-- ⚠️ ÍNDICE PARCIAL: a listagem lê só `duplicata_de is null`, que é a maioria.
-- Índice cheio aqui seria pagar por uma coluna quase toda nula.
create index if not exists opp_nao_duplicata_idx
  on opportunities (pais, status, data_ordenacao desc) where duplicata_de is null;

comment on column opportunities.duplicata_de is
  'Reanúncio: id do anúncio MANTIDO (o mais recente do mesmo carro). Preenchido = não aparece na listagem. Não é rejeição — o registro e a observação de preço continuam valendo.';
