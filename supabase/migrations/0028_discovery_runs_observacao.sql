-- Campo de log/observação por execução do worker. Nasceu do Mercado Livre: quando
-- a parede account-verification bloqueia a listagem, o run terminava como
-- "sucesso 0" — indistinguível de "não teve nada novo". Agora o bloqueio TOTAL
-- vira status='erro' (com erro_mensagem), e todo run ML deixa aqui um resumo
-- legível (páginas carregadas x bloqueadas) pra dar visibilidade no painel.
-- Coluna genérica (serve OLX/Webmotors no futuro), nullable, aditiva.
alter table discovery_runs add column if not exists observacao text;
