-- KM do veículo. Vem direto do campo `mileage` já presente na listagem da
-- OLX (mesmo lugar de onde vêm marca/modelo/ano/câmbio), sem requisição
-- extra. Na Inserção Direta o remetente informa manualmente. NULL para
-- registros antigos, salvos antes desta coluna existir.

alter table opportunities
  add column if not exists km integer;

-- Aplicar manualmente no SQL Editor do Supabase (migrations deste projeto
-- não rodam sozinhas).
