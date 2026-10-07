-- Modelo normalizado como COLUNA, não só no texto do título.
--
-- ★★ POR QUE: a tabela de preço agrupa por (marca, modelo, ano). Hoje isso vive
-- dentro de `veiculo`, um texto livre que o Facebook entregou — "Toyota New
-- 2011 Ractis", "15.500+000+0994810323 Mitsubishi+pajerito+". Agrupar por
-- substring de texto livre é como somar cédulas pelo que está escrito à caneta
-- na margem.
--
-- Medido em 07/10/2026 sobre os 225 anúncios paraguaios: 211 (94%) são
-- reconhecidos pelo catálogo, e 183 teriam o nome corrigido. Com o modelo em
-- coluna, aparecem 9 grupos com 3+ anúncios — as primeiras linhas reais da
-- tabela de preço.
--
-- ⚠️ `veiculo_bruto` guarda o original ANTES de qualquer limpeza. O
-- normalizador vai melhorar com o tempo, e sem o texto de origem não haveria
-- como reprocessar — eu estaria destruindo a matéria-prima para salvar uma
-- interpretação de hoje.

alter table opportunities add column if not exists marca     text;
alter table opportunities add column if not exists modelo    text;
alter table opportunities add column if not exists segmento  text;
alter table opportunities add column if not exists veiculo_bruto text;

comment on column opportunities.marca is
  'Marca normalizada pelo catálogo (catalogoJdmParaguai.ts). Null = não reconhecida — e aí NÃO entra na tabela de preço.';
comment on column opportunities.modelo is
  'Modelo CANÔNICO: "axio" e "corolla axio" caem no mesmo valor, senão a mediana se divide em dois n pequenos.';
comment on column opportunities.segmento is
  'sedan_luxo | sedan | van_luxo | minivan | hatch | suv | perua | pickup. Alphard e Vitz são os dois "Toyota importado" e não dividem curva de preço.';
comment on column opportunities.veiculo_bruto is
  'O título como o Facebook entregou, antes da normalização. Matéria-prima para reprocessar quando o dicionário melhorar.';

-- ★ O índice que a tabela de preço vai usar em TODA consulta: agrupar por
-- marca+modelo+ano dentro de um país. Sem ele, cada cálculo de mediana vira
-- varredura — e varredura foi o que estourou a cota de egress no projeto velho.
create index if not exists idx_opportunities_modelo_ano
  on opportunities (pais, marca, modelo, ano)
  where marca is not null and modelo is not null;
