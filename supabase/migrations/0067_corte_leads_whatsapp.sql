-- 0067: o gate do /investigar passa a coletar só WhatsApp (menos fricção; contato mais
-- valioso p/ lista de transmissão / comunidade). WhatsApp vira a chave; e-mail fica opcional.

-- dedupe defensivo por whatsapp (mantém o mais recente) antes de criar o unique
delete from public.corte_leads a using public.corte_leads b
 where a.whatsapp = b.whatsapp and a.whatsapp is not null
   and (a.criado_em < b.criado_em or (a.criado_em = b.criado_em and a.ctid < b.ctid));

alter table public.corte_leads drop constraint if exists corte_leads_pkey;
alter table public.corte_leads alter column email drop not null;
alter table public.corte_leads add constraint corte_leads_whatsapp_key unique (whatsapp);
