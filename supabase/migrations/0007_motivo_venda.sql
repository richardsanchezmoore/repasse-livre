-- Motivo informado pelo remetente na Inserção Direta para estar vendendo o
-- veículo. NULL para origem_tipo='descoberta' (a OLX não expõe esse dado).

alter table opportunities
  add column if not exists motivo_venda text;

-- Aplicar manualmente no SQL Editor do Supabase (migrations deste projeto
-- não rodam sozinhas).
