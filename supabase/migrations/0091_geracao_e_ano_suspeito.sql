-- ════════════════════════════════════════════════════════════════════════════
-- O DICIONÁRIO PASSA A ENCOSTAR NO DADO (08/10/2026)
--
-- ★ O pedido do Gustavo, de 05/10 e repetido em 08/10: *"um dicionário próprio
-- para mapear modelos conforme ano e já sabermos quando o anúncio está
-- errado"* · *"é exatamente para BASILAR e CORRIGIR os achados que precisamos
-- do nosso dicionário"*.
--
-- ⚠️⚠️ ELE EXISTIA E NINGUÉM CONSULTAVA. `conferirAnoModelo` era chamado pelo
-- backfill e pelos testes — nunca pela captação. Anúncio novo com ano
-- impossível entrava liso. É o mesmo padrão que achei hoje na guarda de
-- entrega: mecanismo pronto, motor passando ao largo. Duas vezes no mesmo dia,
-- então vale a regra: ★ ferramenta de validação que não é chamada pelo caminho
-- quente não existe.
--
-- ═══ AS DUAS COLUNAS ═══
--
-- `geracao` — "S180", "H200", "NHP10". ★ É a CHAVE DE AGRUPAMENTO que faltava
-- para a referência de preço. Hoje agrupamos por modelo+ano, e no Paraguai
-- quase todo ano tem amostra pequena demais para publicar mediana. Geração
-- junta os anos que são de fato o mesmo carro — agrupamento que existe na
-- engenharia, não conveniência estatística nossa. Ver geracoesPY.ts.
--
-- `ano_suspeito` — o ano declarado não cabe na produção do modelo.
-- ⚠️ SINALIZA, NÃO REJEITA, e o motivo é de mercado: no Paraguai o carro entra
-- por Iquique anos depois de fabricado e o vendedor às vezes escreve o ano de
-- IMPORTAÇÃO. Um "Vitz 2021" pode ser um 2018 importado em 2021 — não é
-- mentira, é outro calendário. Descartar jogaria fora anúncio bom e calaria
-- justamente o sinal que a gente quer estudar.
-- ════════════════════════════════════════════════════════════════════════════

alter table opportunities add column if not exists geracao text;
alter table opportunities add column if not exists ano_suspeito boolean;

-- ⚠️ Índice só sobre PY: a era Brasil não tem geração e ocuparia o índice à toa.
create index if not exists opportunities_geracao_idx
  on opportunities (modelo, geracao) where pais = 'PY' and geracao is not null;

comment on column opportunities.geracao is
  'Código de geração JDM (S180, H200, NHP10) derivado de modelo+ano via geracoesPY.ts. Chave de agrupamento da referência de preço quando o n por ano é pequeno.';
comment on column opportunities.ano_suspeito is
  'O ano declarado não cabe na produção do modelo. SINALIZA, não rejeita: no Paraguai o ano do anúncio pode ser o de importação.';
