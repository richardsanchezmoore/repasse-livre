-- Instrumentação pro "Copiloto de Compra" (Fase 3 BIA): começar a acumular a
-- SÉRIE TEMPORAL que o parecer precisa (liquidez por modelo + histórico de preço).
-- Barato e aditivo; o valor vem do tempo (cada dia sem logar = história perdida).

-- 1) Última vez que re-observamos o anúncio vivo. O first_seen já é data_captura;
--    o lifespan de um anúncio = ultimo_visto - data_captura.
alter table opportunities add column if not exists ultimo_visto timestamptz;
update opportunities set ultimo_visto = data_captura where ultimo_visto is null;

-- 2) Histórico de PREÇO por anúncio — espinha do "2 reduções em uma semana" do
--    parecer. Recebe re-observação do scraper E edição do próprio dono (Meus
--    Anúncios = preço de 1ª mão). O baseline fica em opportunities (data_captura+
--    preco); aqui só entram MUDANÇAS, pra não inflar (1 linha por variação).
create table if not exists anuncio_preco_log (
  id uuid primary key default gen_random_uuid(),
  link_origem text not null,
  preco numeric not null,
  visto_em timestamptz not null default now(),
  origem text not null default 'scraper' -- 'scraper' | 'edicao_usuario'
);
create index if not exists anuncio_preco_log_link_idx on anuncio_preco_log (link_origem, visto_em desc);

-- 3) oportunidades_historico: enriquecer com a identidade do modelo + o MOTIVO da
--    saída. Só motivo='sumiu_da_fonte' (anúncio que deixou o mercado — futuro job
--    de re-check, Stage 1b) conta como LIQUIDEZ; 'duplicata'/'admin'/'fipe_sem_margem'
--    são exclusões operacionais e NÃO devem poluir o cálculo de tempo de venda.
alter table oportunidades_historico add column if not exists veiculo text;
alter table oportunidades_historico add column if not exists versao text;
alter table oportunidades_historico add column if not exists ano text;
alter table oportunidades_historico add column if not exists estado text;
alter table oportunidades_historico add column if not exists preco numeric;
alter table oportunidades_historico add column if not exists fipe_codigo text;
alter table oportunidades_historico add column if not exists data_publicacao_origem timestamptz;
alter table oportunidades_historico add column if not exists ultimo_visto timestamptz;
alter table oportunidades_historico add column if not exists motivo text;
create index if not exists oportunidades_historico_modelo_idx
  on oportunidades_historico (veiculo, estado, motivo);
