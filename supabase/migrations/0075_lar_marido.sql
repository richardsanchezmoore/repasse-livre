-- 0075: o perfil da família passa a ter o MARIDO (nome + WhatsApp), não só filhos.
-- Alimenta o one-tap: marido e filhos com WhatsApp viram contatos automáticos.
alter table public.lar_familia add column if not exists marido_nome text;
alter table public.lar_familia add column if not exists marido_whatsapp text;
