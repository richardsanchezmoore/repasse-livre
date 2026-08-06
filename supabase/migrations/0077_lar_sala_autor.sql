-- 0077: snapshot do autor na mensagem (apelido+avatar) — facilita o realtime (payload
-- self-contained, sem join) e PROTEGE o anonimato: mensagem "como irmã" grava
-- autor_apelido = null (renderiza "Uma irmã"), sem expor o apelido real.
alter table public.lar_sala_mensagens
  add column if not exists autor_apelido text,
  add column if not exists autor_avatar  text;
