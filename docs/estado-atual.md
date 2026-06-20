# Estado atual do projeto — Repasse Livre

> Resumo de contexto para retomar o trabalho em uma conversa nova.
> Atualizado em 20/06/2026. Sprints 1-4 e a exclusão com histórico foram
> testadas de ponta a ponta nesta data e estão funcionando em produção
> (banco real do Supabase). Mesmo dia: revisão do Sprint 4 (fotos, contato
> do vendedor, data de publicação) — ver seção "Revisão pós-Sprint 4"
> abaixo.

## Stack

- Backend/worker: Node.js + TypeScript (`apps/discovery-worker`)
- Admin/painel: Next.js 14 App Router (`apps/admin`)
- Banco: Supabase (Postgres + Storage), projeto real já configurado e em uso
- Captcha: Cloudflare Turnstile (formulário público)
- Hospedagem planejada: Vercel (admin) + Railway/VPS (worker)
- Controle de versão: GitHub (`richardsanchezmoore/repasse-livre`)
- Node não está no PATH do ambiente local por padrão — usar
  `$env:PATH = "C:\Program Files\nodejs;$env:PATH"` antes de `npm`/`npx` no
  PowerShell desta máquina.

## O que já está pronto

### Documentação (`docs/`)
- `prd-funcional.md` — PRD consolidado da Fase Zero
- `arquitetura.md`, `backlog.md`, `sprints.md` — arquitetura, backlog e
  roadmap de 6 sprints (Sprints 1-4 concluídas, ver `sprints.md`)

### Sprint 1-2 — Motor de Descoberta (`apps/discovery-worker`)
- Captura paginada da listagem da OLX (RS), ordenada por data
- Filtro nativo da OLX "Ofertas abaixo da FIPE" aplicado automaticamente,
  com a chave de query string resolvida dinamicamente da própria página
- FIPE obtido direto da página individual de cada anúncio (campo
  `abuyFipePrice` da OLX) — não usa a API externa de FIPE para a Descoberta
  (correspondência textual por marca/modelo é inconsistente, ~20% de erro)
- Dois modos: `inicial` (bootstrap) e `incremental` (cron de 6h, ainda
  configurado só para execução manual — pendência conhecida)

### Sprint 3 — Central de Oportunidades (`apps/admin`)
- Menu lateral fixo estilo Gmail (`components/Sidebar.tsx`), 4 abas
  combinando dois eixos — **origem** (`origem_tipo`) e **ciclo de vida**
  (`status`):
  - **Descobertas**: `origem_tipo=descoberta` + `status=descoberta`
  - **Enviadas**: `origem_tipo=insercao_direta` + `status=descoberta`
  - **Aprovadas**: `status=aprovada` (qualquer origem)
  - **Rejeitadas**: `status=rejeitada` (qualquer origem)
- Filtro por classificação (chips: Bronze/Prata/Ouro/Diamante) dentro de
  qualquer aba, via query string (`?aba=X&classificacao=Y`)
- Card: foto grande, margem sobre a FIPE em destaque, selo de
  classificação (Bronze/Prata/Ouro/Diamante — `lib/classificacao.ts`,
  fonte única de verdade dos rótulos, usado também no texto de
  compartilhamento), selo de fonte, WhatsApp/perfil do remetente quando
  vem de Inserção Direta, link "🔗 Abrir anúncio original" (oculto quando a
  oportunidade não tem URL real)
- Ações: Aprovar, Rejeitar, Favoritar, Compartilhar (texto pronto pro
  WhatsApp) — todas com tratamento de erro (rede instável, extensões de
  navegador interferindo em `fetch`) mostrando feedback em vez de quebrar
  a tela

### Sprint 4 — Inserção Direta (`apps/admin/app/enviar`)
- Formulário público (`/enviar`) para qualquer pessoa (física,
  intermediador, repassador, lojista, investidor) enviar uma oportunidade
- Selects em cascata (marca → modelo → ano) consultando a FIPE
  (`fipe.parallelum.com.br`, com `FIPE_API_KEY` do fipe.online — sem
  chave, a API pública bloqueia por limite de taxa quase imediatamente)
- **Prévia de margem em tempo real**: ao digitar o preço, calcula a
  margem contra o valor FIPE já consultado e mostra na hora se está
  elegível (≥5%) ou não, com o preço máximo aceito — evita gastar um
  envio completo para descobrir isso só no fim
- Validação campo a campo (no blur, não só no submit), com máscaras de
  preço (milhar) e WhatsApp, e selects para UF/câmbio (não texto livre)
- Captcha Cloudflare Turnstile (modo Managed — pode aprovar
  automaticamente sem interação se o risco for baixo)
- Upload de foto para o bucket público `oportunidades-fotos` no Supabase
  Storage
- Servidor sempre revalida margem mínima de 5% e todos os campos
  obrigatórios antes de gravar — validação client-side é só UX, nunca a
  única barreira
- Oportunidade entra como `origem_tipo='insercao_direta'`,
  `status='descoberta'`, aparece na aba "Enviadas" do painel

### Exclusão de oportunidades com histórico preservado
- Tabela `oportunidades_historico` (migration `0004`) guarda
  `origem_tipo`, `fonte`, `classificacao`, `margem_percentual`, `status` e
  datas de **toda** oportunidade apagada — sem WhatsApp nem foto (sem
  valor de relatório) — para permitir relatórios mensais/anuais mesmo
  depois de limpar o banco operacional
- Botão "Apagar" no card (só visível quando `status='rejeitada'`) e botão
  "Apagar tudo" no cabeçalho da aba Rejeitadas — ambos com confirmação,
  movem pro histórico, removem a foto do Storage (se for nossa) e só
  então apagam a linha de `opportunities`

### Banco de dados (Supabase)
- `opportunities`: tabela principal (migration `0001`), + `favorito`
  (`0002`), + `whatsapp`/`perfil_remetente`/índice em `origem_tipo`
  (`0003`)
- `oportunidades_historico`: contagem preservada de exclusões (`0004`,
  aplicada manualmente no SQL Editor — migrations deste projeto não rodam
  sozinhas, sempre exigem colar o SQL no Supabase)
- `fipe_referencia`: reservada, não usada ativamente ainda
- Storage: bucket público `oportunidades-fotos` (criado manualmente via
  UI do Supabase, não por migration — ver decisões abaixo)
- RLS habilitado; toda escrita do app passa pela service role key
  (`supabaseAdmin`, só server-side)

## Revisão pós-Sprint 4 (20/06/2026, mesma sessão)

### Upload de fotos no formulário `/enviar` — Dropzone
- `components/DropzoneFotos.tsx`: arrastar-e-soltar ou clique (via
  `<label>` envolvendo o `<input type="file" hidden>` — usar `<label>` em
  vez de `onClick` + `ref.click()` evita o bug do diálogo do Windows
  abrindo em duplicidade), até **10 fotos**, preview instantâneo
  (`URL.createObjectURL`), barra de progresso real por arquivo via
  `XMLHttpRequest.upload.onprogress` (a Fetch API não expõe progresso de
  upload no navegador)
- Cada foto é enviada para o Storage assim que é solta no dropzone (não
  espera o submit final) — rota dedicada `app/api/fotos/route.ts`
  (POST/DELETE) faz o upload/remoção usando `supabaseAdmin`, mantendo a
  regra de toda escrita passar pela service role key, só server-side
- O usuário escolhe qual foto é a **principal** (selo "Principal" + botão
  "Definir como principal" nas demais); a primeira a terminar o upload
  vira principal por padrão; se a principal for removida, a próxima foto
  `ok` da lista assume automaticamente
- `enviar/actions.ts` não recebe mais o arquivo bruto: recebe
  `fotoPrincipalUrl` e `fotosSecundariasJson` (URLs já hospedadas) via
  campos hidden do formulário
- Risco aceito conscientemente: o upload por foto acontece *antes* da
  verificação do Turnstile (captcha só valida no submit final), porque a
  foto precisa subir no momento em que é solta. Mitigado com limite de
  tipo (`image/*`) e tamanho (5MB) no servidor; aceitável para o volume
  baixo da Fase Zero — se virar abuso real, próximo passo é limpar
  arquivos órfãos periodicamente
- `fotos_secundarias` agora é gravado de fato (antes sempre `[]`), mas
  **ainda não aparece em nenhuma tela** — só o `foto_principal` é exibido
  no card da Central; o uso de `fotos_secundarias` é reservado para uma
  futura página de "anúncio" (ainda não existe)

### Contato do vendedor (Inserção Direta) clicável
- `lib/compartilhamento.ts`: para oportunidades de Inserção Direta com
  WhatsApp cadastrado, a última linha do texto copiado para o WhatsApp
  trocou de `🔗 Anúncio original: insercao-direta:{uuid}` (link inútil,
  não é uma URL real) para `📲 Vendedor: https://wa.me/55{numero}` — o
  WhatsApp reconhece e deixa esse link clicável automaticamente ao colar
- `components/OpportunityCard.tsx`: o número do WhatsApp exibido no card
  agora é um link `https://wa.me/55{numero}` (`target="_blank"`), com o
  número formatado (`lib/mascaras.ts:formatarWhatsapp`) em vez dos dígitos
  crus

### Data de publicação na origem (não a nossa data de captura)
- Nova coluna `data_publicacao_origem` (`timestamptz`, nullable) — ver
  migration `0005` abaixo. `NULL` para `origem_tipo='insercao_direta'`
  (não existe "publicação original" nesse caso)
- `discovery-worker`: a OLX já entrega `date` (epoch em segundos) na
  própria página do anúncio (mesmo campo já usado para o corte de janela
  do modo `inicial`); `main.ts` converte para ISO e grava em
  `data_publicacao_origem` em toda oportunidade de `origem_tipo='descoberta'`
- Card da Central mostra `🕒 Publicado em {data}`, usando
  `data_publicacao_origem` quando existir, com fallback para
  `data_captura` (caso de Inserção Direta, ou registros antigos salvos
  antes dessa coluna existir)
- **Ordenação da lista** (`components/DiscoveriesBoard.tsx`): trocada de
  `margem_percentual` desc para a mesma data mostrada no card (publicação
  na origem, com fallback à captura), do mais recente para o mais antigo
  — feita em JS após a query, pois o `order()` do supabase-js não suporta
  `COALESCE` de duas colunas diretamente
- Registros gravados antes da migration `0005` ficam com
  `data_publicacao_origem = NULL` para sempre (não há como recuperar
  retroativamente sem reconsultar a página do anúncio na OLX, e a
  oportunidade pode já não existir mais lá)

### Banco de dados — migration pendente de aplicar manualmente
- `supabase/migrations/0005_data_publicacao_origem.sql` — **já aplicada
  manualmente no SQL Editor do Supabase nesta sessão** (`alter table
  opportunities add column if not exists data_publicacao_origem
  timestamptz;`)

## Pendências conhecidas / próximos passos

1. **Agendamento real do worker**: hoje só roda manualmente
   (`npm run discover`); falta configurar cron externo no Railway para
   rodar a cada 6h em modo incremental
2. **Sprint 5** (Distribuição + Audiência) e **Sprint 6** (atualização
   dinâmica de FIPE + hardening) ainda não iniciadas — ver `sprints.md`
3. Webmotors e Mercado Livre como fontes adicionais (Fase futura, fora do
   escopo da Fase Zero) — o card já tem suporte visual a múltiplas fontes
4. Relatórios mensais/anuais usando `oportunidades_historico` ainda não
   têm nenhuma UI — só a tabela existe, pronta para ser consultada

## Decisões importantes (não óbvias do código)

- Motor de Descoberta é só um mecanismo de bootstrap/cold-start (evitar
  "prateleira vazia"), não a essência eterna do produto
- Atribuição de fonte + link de redirecionamento no card reduz risco
  reputacional, mas não elimina questão de termos de uso do scraping
  (decisão consciente: volume baixo, comportamento parecido com humano)
- `.env`/`.env.local` de cada app contêm credenciais reais (Supabase,
  Turnstile, FIPE) e não estão versionados (`.gitignore`) — precisam ser
  recriados ao clonar o repo em outra máquina; ver
  `apps/admin/.env.local.example` para a lista completa de variáveis
- O bucket `oportunidades-fotos` e a política de leitura pública foram
  criados manualmente pela UI do Supabase (Storage → New bucket → Public
  bucket), não por SQL — a UI evita problemas de permissão que o SQL
  Editor tem para `storage.buckets`/`storage.objects` em projetos
  hospedados
- `apps/admin` e `apps/discovery-worker` são independentes, sem
  workspace compartilhado — por isso `lib/margin.ts` no admin é uma
  cópia deliberada de `discovery-worker/src/margin.ts`, não um import
  cruzado
- **Nunca rodar `npm run build` enquanto `npm run dev` está ativo na
  mesma pasta** — os dois disputam a pasta `.next` e corrompem o dev
  server em execução (`Cannot find module './948.js'` e 404s em cascata
  nos chunks estáticos). Para validar tipos sem esse risco, usar
  `npx tsc --noEmit`.
