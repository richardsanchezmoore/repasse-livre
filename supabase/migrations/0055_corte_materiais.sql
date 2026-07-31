-- ============================================================================
-- A CORTE — MATERIAIS (Biblioteca). Conteúdo publicável pelo painel admin:
-- o Panfleto, os bônus, devocionais. O app (Biblioteca + leitor) lê daqui.
-- corpo = markdown. RLS: leitura p/ todos, escrita só admin.
-- (Gate por acesso Kit/assinatura entra no Incremento de Assinaturas.)
-- ============================================================================

create table if not exists public.corte_materiais (
  id            uuid primary key default gen_random_uuid(),
  chave         text unique not null,
  tipo          text not null default 'ebook',   -- ebook | bonus | devocional
  titulo        text not null,
  subtitulo     text,
  icone         text,
  corpo         text not null default '',         -- markdown
  ordem         int  not null default 0,
  acesso        text not null default 'kit',      -- kit | assinatura | livre
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists corte_materiais_ordem_idx on public.corte_materiais(ordem);

alter table public.corte_materiais enable row level security;
drop policy if exists corte_materiais_sel on public.corte_materiais;
drop policy if exists corte_materiais_ins on public.corte_materiais;
drop policy if exists corte_materiais_upd on public.corte_materiais;
drop policy if exists corte_materiais_del on public.corte_materiais;
create policy corte_materiais_sel on public.corte_materiais for select using (true);
create policy corte_materiais_ins on public.corte_materiais for insert with check (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));
create policy corte_materiais_upd on public.corte_materiais for update using (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));
create policy corte_materiais_del on public.corte_materiais for delete using (exists (select 1 from public.corte_membros m where m.user_id = auth.uid() and m.is_admin));

-- ── SEMENTE: metadados (o corpo do Panfleto e do Boaz é portado por script) ──
insert into public.corte_materiais (chave, tipo, titulo, subtitulo, icone, ordem, acesso, corpo) values
('panfleto',   'ebook', 'O Panfleto Secreto do Altar', 'Os 12 perfis a evitar — o diário completo', '📕', 0, 'kit', ''),
('boaz',       'bonus', 'O Cavalheiro que Vale o seu Altar', 'Bônus · o contramodelo (Boaz + Efésios 5)', '👑', 1, 'kit', ''),
('cartas',     'bonus', 'Cartas Entre Nós', 'Bônus · 24 perguntas que revelam o caráter', '🃏', 2, 'kit',
  E'## Em breve\n\nAs 24 cartas que revelam o caráter de um pretendente chegam em breve à sua Biblioteca. Por enquanto, use o **Dossiê** para investigar — é o mesmo espírito.'),
('guia',       'bonus', 'Guia "Verde ou Vermelho?"', 'Bônus · red flags × sinais do homem de Deus', '🚦', 3, 'kit',
  E'## Em breve\n\nO guia lado a lado — bandeiras vermelhas e bandeiras verdes — está sendo preparado. O **Veredito** do seu Dossiê já aplica essa lógica.'),
('wallpapers', 'bonus', 'Wallpapers "Mulher de Valor"', 'Bônus · versículos de identidade', '📱', 4, 'kit',
  E'## Em breve\n\nOs wallpapers com versículos de identidade chegam em breve para embelezar o seu celular.')
on conflict (chave) do nothing;
