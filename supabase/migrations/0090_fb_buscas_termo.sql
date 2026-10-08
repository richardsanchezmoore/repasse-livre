-- ════════════════════════════════════════════════════════════════════════════
-- VARREDURA POR TERMO: o catálogo JDM vira PLANO DE BUSCA (07/10/2026)
--
-- ★★★ POR QUE: a sonda provou que a varredura por categoria + faixa de preço
-- NÃO ENXERGA a frota JDM. hiace, aqua, crown, noah, wish e alphard devolveram
-- 248 anúncios em CDE e Asunción — e NENHUM deles estava na nossa base de 307.
-- Dois segmentos inteiros do catálogo (van_luxo, sedan_luxo) estavam zerados.
--
-- ⚠️ Isso é a tese do produto passando batido: a frota japonesa é o mercado
-- paraguaio, e era justamente ela que faltava.
--
-- A busca por PALAVRA-CHAVE acha o que a busca por categoria não acha. Então o
-- catálogo deixa de ser só o dicionário que confronta o anúncio e passa a gerar
-- as consultas.
--
-- ═══ A COLUNA ═══
--
-- `termo` registra qual palavra gerou aquela busca (null = varredura por faixa).
-- ★ Ela não é só etiqueta: é o ESTADO que decide o que varrer na próxima rodada.
-- Sem cursor em config e sem lista fixa — a prioridade sai de duas perguntas
-- feitas ao próprio banco:
--
--   1. qual modelo do catálogo tem MENOS anúncio na base?   → vai na frente
--   2. qual termo já foi buscado nas últimas 24h?           → fica para depois
--
-- ⚠️ A regra 2 existe porque a 1 sozinha trava: um modelo que realmente não
-- circula ficaria eternamente em primeiro lugar, bloqueando a fila inteira.
-- ════════════════════════════════════════════════════════════════════════════

alter table fb_buscas add column if not exists termo text;

create index if not exists fb_buscas_termo_idx
  on fb_buscas (termo, executada_em desc) where termo is not null;

comment on column fb_buscas.termo is
  'Palavra-chave que gerou a busca (null = varredura por faixa de preço). Serve de estado: a próxima rodada escolhe os termos menos cobertos que não foram buscados nas últimas 24h.';
