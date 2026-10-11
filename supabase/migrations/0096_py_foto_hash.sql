-- ════════════════════════════════════════════════════════════════════════════
-- HASH PERCEPTUAL DA FOTO — "é a mesma foto?"
--
-- ★★ Pedido do Gustavo (11/10/2026): *"acho que é o mais correto, aliás é como
-- faz o Facebook, quando percebe mesma foto"*. E ele está certo: o reanúncio me
-- derrotou TRÊS vezes pelo texto, porque loja usa o mesmo template para carros
-- diferentes. Foto é evidência; texto é indício.
--
-- ⚠️ 64 caracteres hex = 256 bits. NÃO são 64 bits: a grade 8×8 clássica foi
-- medida e reprovada — num acervo cheio de foto de showroom, um Mustang e um
-- Mercedes davam a mesma distância que uma foto recomprimida. Ver o cabeçalho
-- de src/hashPerceptual.ts para a medição.
--
-- ⚠️ Índice comum e não especial: a busca por quase-igual é por distância de
-- Hamming, que índice B-tree não resolve. O índice serve para o caso EXATO
-- (recompressão idêntica, que é comum) e para o backfill saber o que falta.
-- No nosso volume a varredura por distância roda em memória, sem banco.
-- ════════════════════════════════════════════════════════════════════════════

alter table opportunities add column if not exists foto_hash text;

create index if not exists opp_foto_hash_idx on opportunities (foto_hash) where foto_hash is not null;

comment on column opportunities.foto_hash is
  'dHash 16x16 (256 bits, 64 hex) da foto principal. Criterio de duplicata que vem ANTES do texto: foto e evidencia, texto e indicio.';
