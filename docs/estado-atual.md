# Estado atual do projeto — Repasse Livre

> Resumo de contexto para retomar o trabalho em uma conversa nova.
> Atualizado em 19/06/2026.

## Stack

- Backend/worker: Node.js + TypeScript (`apps/discovery-worker`)
- Admin/painel: Next.js 14 App Router (`apps/admin`)
- Banco: Supabase (Postgres), projeto real já configurado e em uso
- Hospedagem planejada: Vercel (admin) + Railway/VPS (worker)
- Controle de versão: GitHub (`richardsanchezmoore/repasse-livre`)

## O que já está pronto

### Documentação (`docs/`)
- `prd-funcional.md` — PRD consolidado da Fase Zero
- `arquitetura.md`, `backlog.md`, `sprints.md` — arquitetura, backlog e
  roadmap de 4 sprints

### Sprint 1 — Motor de Descoberta (`apps/discovery-worker`)
- Captura paginada da listagem da OLX (RS), ordenada por data
- Filtro nativo da OLX "Ofertas abaixo da FIPE" aplicado automaticamente,
  com a chave de query string resolvida dinamicamente da própria página
  (não fixada no código) — reduz o universo de ~24.000 para ~800 anúncios
- FIPE obtido direto da página individual de cada anúncio (campo
  `abuyFipePrice` da OLX) — **não usa mais a API externa de FIPE para
  a Descoberta**, porque a correspondência textual por marca/modelo se
  mostrou inconsistente (~20% de erro em teste real)
- Dois modos: `inicial` (bootstrap, varre N dias) e `incremental` (para
  no primeiro anúncio já conhecido — pensado para cron de 6h)
- `fipeService.ts` (API externa `fipe.parallelum.com.br`, com suporte a
  `FIPE_API_KEY` do fipe.online) continua no projeto, reservado para a
  futura Inserção Direta (onde o formulário usa selects exatos)

### Sprint 2 — Central de Oportunidades (`apps/admin`)
- App Next.js com Server Components + Server Actions, lendo/escrevendo
  direto no Supabase (service role key, só server-side)
- Boards "Descobertas" (status `descoberta`) e "Enviadas" (status
  `aprovada`), grid responsivo
- Card: foto grande, margem sobre a FIPE em destaque, classificação
  nomeada com selo colorido, selo de fonte (OLX), câmbio discreto,
  comparativo preço vs. FIPE, link "Ver anúncio na OLX" (com
  `referrerPolicy="no-referrer"` por causa de bloqueio de hotlinking)
- Ações: Aprovar, Rejeitar, Favoritar (coluna `favorito` própria, não
  reaproveita o campo `status`), Compartilhar (gera texto formatado com
  emojis pronto para colar no WhatsApp — `lib/compartilhamento.ts`)

### Banco de dados (Supabase)
- Tabelas `opportunities` e `fipe_referencia` (migration
  `0001_init_opportunities.sql`)
- Coluna `favorito` (migration `0002_add_favorito.sql`)
- RLS habilitado
- Dados reais sendo capturados desde 18-19/06/2026

## Pendências conhecidas / próximos passos

1. **Inserção Direta** (segunda metade da Sprint 2, ainda não implementada):
   formulário público para envio manual de oportunidades, com validações
   (captcha, WhatsApp, foto, consulta FIPE via API externa com selects
   exatos, margem mínima 5%)
2. **Agendamento real do worker**: hoje só roda manualmente
   (`npm run discover`); falta configurar cron externo no Railway para
   rodar a cada 6h em modo incremental
3. **Sprint 3** (Distribuição + Audiência) e **Sprint 4** (atualização
   dinâmica de FIPE + hardening) ainda não iniciadas — ver `sprints.md`
4. Webmotors e Mercado Livre como fontes adicionais (Fase futura, fora do
   escopo da Fase Zero) — o card já tem suporte visual a múltiplas fontes
   (selo colorido), só falta implementar os scrapers

## Decisões importantes (não óbvias do código)

- Motor de Descoberta é só um mecanismo de bootstrap/cold-start (evitar
  "prateleira vazia"), não a essência eterna do produto
- Atribuição de fonte + link de redirecionamento no card reduz risco
  reputacional, mas não elimina questão de termos de uso do scraping
  (decisão consciente: volume baixo, comportamento parecido com humano)
- `.env` e `.env.local` de cada app contêm credenciais reais do Supabase
  e não estão versionados (`.gitignore`) — precisam ser recriados ao
  clonar o repo em outra máquina
