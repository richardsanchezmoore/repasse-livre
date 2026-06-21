-- Campos adicionais do formulário de Inserção Direta (/enviar):
-- nome de quem está anunciando, opcionais do veículo e sinistro/leilão.
alter table opportunities add column if not exists nome_remetente text;
alter table opportunities add column if not exists opcionais jsonb default '[]'::jsonb;
alter table opportunities add column if not exists sinistro_leilao jsonb default '[]'::jsonb;
