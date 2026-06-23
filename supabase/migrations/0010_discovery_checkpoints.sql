-- A varredura incremental usava "encontrei um anúncio já salvo" como sinal
-- de parada. Isso quebra quando a OLX "renova" (reposiciona no topo) um
-- anúncio antigo já capturado: ele aparece no meio da listagem ordenada por
-- data com data aparente recente, faz a varredura parar ali, e anúncios
-- genuinamente novos posicionados abaixo dele (mas mais antigos que a
-- renovação) nunca são vistos.
--
-- Esta tabela guarda, por categoria/URL varrida, a data de publicação do
-- anúncio mais recente já alcançado numa varredura anterior. A parada passa
-- a ser por essa referência de tempo, não por "já existe no banco" — um
-- anúncio renovado é só pulado (upsert por link_origem já evita duplicar),
-- não interrompe mais a varredura.

create table if not exists discovery_checkpoints (
  categoria_url text primary key,
  ultimo_anuncio_em timestamptz not null,
  atualizado_em timestamptz not null default now()
);

-- Aplicar manualmente no SQL Editor do Supabase (migrations deste projeto
-- não rodam sozinhas).
