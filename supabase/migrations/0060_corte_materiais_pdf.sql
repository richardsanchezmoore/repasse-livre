-- Caminho do PDF (no bucket privado corte-pdfs) por material. Se preenchido, o
-- leitor mostra o botão "Salvar em PDF", servido por rota autenticada (só quem
-- tem acesso baixa; a URL do storage nunca fica pública).
alter table public.corte_materiais add column if not exists pdf_path text;
