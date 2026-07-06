-- Copiloto Fase C — persistência do parecer.
-- A prosa do Copiloto passa a ser GERADA fora do acesso à página (script batch
-- gerar:pareceres no admin) e ARMAZENADA aqui. A página só LÊ (zero delay, zero
-- custo por view). O fingerprint é um hash dos fatos que dirigem a prosa
-- (veredito+posição+coorte+fichas+evidências) — o batch só regenera quando muda,
-- então cohort-relative (posição/percentil) não fica stale sem custo à toa.
-- Ver project_repasse_livre_copiloto_compra_instrumentacao.

alter table opportunities
  add column if not exists copiloto_parecer text,
  add column if not exists copiloto_gerado_em timestamptz,
  add column if not exists copiloto_fingerprint text;

comment on column opportunities.copiloto_parecer is
  'Prosa do parecer do Copiloto (LLM), gerada em lote e servida na leitura. Null = cai no parecer determinístico (template).';
comment on column opportunities.copiloto_fingerprint is
  'Hash dos fatos que dirigem a prosa; o batch só regenera quando muda.';
