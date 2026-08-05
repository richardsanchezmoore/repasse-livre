-- 0073: contatos da família (marido, filhos…) p/ o "Enviar no WhatsApp" (one-tap).
-- Guardado no próprio perfil da família. Base também pro auto-send futuro (PRO).
alter table public.lar_familia
  add column if not exists contatos jsonb not null default '[]'::jsonb;  -- [{nome, whatsapp}]
