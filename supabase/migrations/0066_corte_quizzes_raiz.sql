-- 0066: "quiz raiz" — escolha EXPLÍCITA de qual quiz o /investigar serve sem ?q=.
-- Antes era implícito (ativo + atualizado_em mais recente), o que podia trocar sozinho.
alter table public.corte_quizzes add column if not exists raiz boolean not null default false;

-- no máximo 1 quiz marcado como raiz
create unique index if not exists corte_quizzes_raiz_uniq on public.corte_quizzes (raiz) where raiz;

-- preserva o comportamento atual: fixa o "Cavalheiro ou Libertino" como raiz (se nenhum estiver)
update public.corte_quizzes set raiz = true
  where slug = 'cavalheiro-ou-libertino'
    and not exists (select 1 from public.corte_quizzes where raiz);
