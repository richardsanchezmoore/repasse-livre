# Estado atual do projeto — Repasse Livre

> Resumo de contexto para retomar o trabalho em uma conversa nova.
> **25-26/06/2026, sessão mais recente**: rodada extensa de **SEO** —
> máscara de telefone na descrição de anúncios captados, base técnica
> (robots/sitemap/metadata/JSON-LD), **URLs amigáveis** com cidade/estado
> no path (`/carros/{cidade-uf}/{slug}`), páginas reais de **cidade,
> estado e marca** (3 níveis: cidade+marca, estado+marca, Brasil+marca),
> breadcrumb na página individual, e um **painel `/seo` completo** com 5
> páginas-âncora (Home/Cidade/Estado/Marca/Individual) e mapa de
> variáveis (`$title_ad`, `$description_ad`, `$tag`, `$tags`, `$estado`,
> `$cidade`) — ver seção "SEO: máscara de telefone, URLs amigáveis,
> páginas de cidade/estado/marca e painel de variáveis (25-26/06/2026)"
> abaixo, a mais detalhada. **Pendências em aberto ao final: backfill
> residual de descrições (278 registros, aguardando janela livre de cron
> no Railway), decisão cron 2h vs 4h, analytics/BI, Google AI Overview.**
>
> **23/06/2026, sessão anterior**: refino completo do layout responsivo
> do admin (mobile-first, já que ~75% do tráfego é celular), implementação
> de **paginação real** na Central de Oportunidades (até então carregava
> todas as linhas do banco de uma vez) e um **cabeçalho-breadcrumb** com
> filtro de estado imediato — ver seção "Refino responsivo + paginação +
> breadcrumb (23/06/2026)" abaixo, a mais detalhada e a que reflete o estado
> real do código hoje. **Próximo passo já definido pelo usuário: tratamento
> de imagens nas oportunidades "Enviadas" (Inserção Direta)** — ver
> "Pendências conhecidas" no final.
>
> Atualizado em 21/06/2026. Sprints 1-4 e a exclusão com histórico foram
> testadas de ponta a ponta nesta data e estão funcionando em produção
> (banco real do Supabase). Mesmo dia: revisão do Sprint 4 (fotos, contato
> do vendedor, data de publicação) — ver seção "Revisão pós-Sprint 4"
> abaixo. Depois da revisão, rodada uma varredura manual incremental
> (`MODO_VARREDURA=incremental npm run discover` em
> `apps/discovery-worker`): 38 anúncios novos, 13 elegíveis salvos com
> `data_publicacao_origem` já populada, 25 descartados por margem, 0 sem
> FIPE. Mesmo dia, mais tarde: rodada uma segunda sessão de **refinamento
> visual da Central de Oportunidades** (menu colapsável, ícones modernos,
> busca/filtro/ordenação, skeleton de loading, redesenho completo do card,
> campos novos KM e Motivo da venda) — ver seção "Refinamento visual da
> Central de Oportunidades" abaixo. Depois dela, rodada outra varredura
> incremental: 16 anúncios novos, 2 elegíveis salvos (já com `km`
> populado), 14 descartados por margem, 0 sem FIPE — total 51 em
> Descobertas. Ainda no mesmo dia, sessão seguinte: criado o **modo
> `intervalo`** de varredura (ver seção "Modo `intervalo`" abaixo) e usado
> para ampliar a base de testes com os dias 18/06, 17/06 e 16/06/2026 —
> total agora **114 oportunidades em Descobertas**. Sessão seguinte ainda
> no mesmo dia: corrigido o scroll da Central de Oportunidades, que estava
> preso dentro do `.board-lista` (como um "iframe" interno) — ver seção
> "Correção de scroll" abaixo.
>
> **21/06/2026, sessão seguinte**: implementado o **Módulo Favoritor**
> (ícone de coração sobre a foto, aba "Favoritos", pop-up de primeiro
> favorito) e o botão **"Anunciar"** na TopBar levando para `/enviar`; ver
> seção "Módulo Favoritor" abaixo. Na mesma sessão, uma rodada extensa de
> ajustes no **formulário `/enviar`**: labels textuais trocadas por
> máscara/placeholder nos campos e selects, reordenação de campos, cards
> visuais para mensagens de margem/FIPE/incentivo de desconto, novos
> campos (Descrição, Nome do anunciante, Opcionais do veículo, Sinistro ou
> Leilão?), remoção do campo "Título" (agora gerado automaticamente a
> partir de Marca+Modelo) e um overlay de loading durante o envio — ver
> seção "Reforma do formulário de Inserção Direta" abaixo. Por fim,
> **corrigido um bug de extração de título no Motor de Descoberta** (o
> campo `veiculo` usava só a propriedade `vehicle_model`, incompleta, sem
> o nome base do modelo) e rodado um **backfill** que corrigiu o título de
> 114 das 116 oportunidades de Descobertas já salvas — ver seção
> "Correção de título da OLX + backfill" abaixo.
>
> **21/06/2026, sprint extra**: implementada **Autenticação, perfis
> (admin x público) e favoritos por usuário** — Supabase Auth com
> login/cadastro por e-mail+senha, Google OAuth, recuperação de senha, e
> separação de quem pode aprovar/rejeitar oportunidades (admin) de quem só
> vê a vitrine pública e favorita por conta própria — ver seção "Sprint
> extra — Autenticação, perfis e favoritos por usuário" abaixo.
>
> **21/06/2026, sessão seguinte**: criada a **UI de gestão de usuários**
> (rota `/usuarios`, só admin) para promover/despromover admin direto pelo
> painel, sem precisar do SQL Editor — pensada como base para futuros
> tiers de permissão ligados a planos pagos (ainda não definidos); ver
> seção "UI de gestão de usuários" abaixo. Na sessão seguinte, implementado
> o mecanismo de **aprovação/rejeição/exclusão em massa**: botão
> "Selecionar Vários" na TopBar, checkbox por card, e barra de ações em
> lote — testado ao vivo aprovando 2 oportunidades de uma vez; ver seção
> "Aprovação/rejeição/exclusão em massa" abaixo.
>
> **21/06/2026, sessão seguinte**: rodada de ajustes finos pedidos sobre o
> que já estava no ar — selo de fonte escondido durante o modo de seleção
> (estava sobrepondo o checkbox), skeleton de loading durante o
> processamento das ações em massa (reaproveitando `BoardSkeleton`),
> padronização visual das mensagens de erro/sucesso de Login/Cadastro/
> Redefinir Senha (usavam texto verde simples mesmo para erro — agora usam
> os mesmos cards `.formulario-erro`/`.formulario-sucesso` do formulário
> `/enviar`), botões "Login"/"Criar Conta" redesenhados no tamanho do
> "Anunciar" (um com contorno, outro com fundo sólido), e **redesenho da
> busca da TopBar + novo filtro de Estado (UF)** embutido na mesma caixa,
> no espírito do cabeçalho da OLX — preparando o painel para quando o
> Motor de Descoberta passar a varrer SC além do RS; ver seção "Ajustes
> finos pós-seleção em massa" abaixo.
>
> **22/06/2026, sessão seguinte**: identidade visual oficial da marca
> inserida no projeto — logo real (SVG vetorial, fundo transparente) no
> lugar do texto "Repasse Livre" e favicon usando o mesmo ícone "RL".
> Sidebar reformulada para um **menu overlay no estilo r7.com** (carril
> fino de ícones sempre visível + painel que sobrepõe o conteúdo ao abrir,
> com o logo no topo). TopBar reorganizada: "Ordenar"/"Filtrar Preço"
> saíram da TopBar e foram pro lado dos chips de classificação (com label
> "Ordenar por:"), "Anunciar" ficou ao lado da busca, e corrigido um bug de
> overflow/sobreposição no layout responsivo (logo+busca de um lado,
> botões do outro, quebrando linha corretamente em telas estreitas) — ver
> seção "Identidade visual + menu overlay + reorganização da TopBar"
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
  (`0003`), + `data_publicacao_origem` (`0005`), + `km` (`0006`), +
  `motivo_venda` (`0007`), + `nome_remetente`/`opcionais`/
  `sinistro_leilao` (`0008`)
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

## Refinamento visual da Central de Oportunidades (20/06/2026, sessão seguinte)

Sessão inteiramente de UI/UX no `apps/admin`, guiada por uma referência
visual externa (painel de outro produto, Deeptube — só a home pôde ser
vista, plano gratuito bloqueava o resto) e depois por rodadas de ajuste
fino pedidas diretamente sobre o resultado já no ar. Tudo testado em
`npm run dev` via Chrome MCP, sem rodar `npm run build` (regra do
projeto). `npx tsc --noEmit` validado a cada mudança.

### Ícones e navegação
- Trocados todos os emojis por `lucide-react` (outline, monocromático,
  acompanha a cor do texto via `currentColor`).
- `components/Sidebar.tsx`: client component, colapsa para só ícones ao
  clicar no hambúrguer (estado persistido em `localStorage`,
  `repasse-livre:sidebar-colapsada`). Além disso, **expande
  temporariamente ao passar o mouse por cima quando está colapsada**
  (`expandidaPorHover`, estado local que não persiste) — só o clique no
  hambúrguer muda a preferência salva.
- Itens da sidebar viraram `<button>` (antes `<Link>`) para participar do
  `NavegacaoProvider` (ver "Skeleton de loading" abaixo).

### Busca, ordenação e filtro de preço
- `components/TopBar.tsx` (novo): barra "slim" de busca por nome do
  veículo (`busca`, debounce de 400ms, `ilike` no Supabase) + dois
  ícones com `IconDropdown` (novo, `components/IconDropdown.tsx` —
  hover ou clique abrem um "box" de opções, fecha ao clicar fora ou ao
  sair do hover com pequeno delay):
  - **Ordenar**: Mais recente (padrão) / Maior Margem / Menor valor /
    Maior Valor (`ordem` na querystring).
  - **Filtrar**: Faixa de Preço, dois campos com máscara de moeda
    (reaproveita `lib/mascaras.ts`), botões Aplicar/Limpar
    (`precoMin`/`precoMax`).
- `components/DiscoveriesBoard.tsx`: `buscarOportunidades` agora aceita
  `{ classificacao, busca, precoMin, precoMax, ordem }`; a ordenação por
  margem/menor valor/maior valor é feita em JS (mesmo motivo do sort por
  data já documentado: `order()` do supabase-js não cobre esses casos
  direto na query combinada).
- `components/FiltroClassificacao.tsx` (extraído do `DiscoveriesBoard`):
  chips de classificação virou client component para participar do
  mesmo estado de loading compartilhado.

### Skeleton de loading
- `components/NavegacaoProvider.tsx` (novo): contexto compartilhado com
  `navegar(url)` (= `router.push` dentro de `startTransition`) e
  `pendente` (= `isPending`), usado por `Sidebar`, `TopBar` e
  `FiltroClassificacao` em vez de cada um ter seu próprio
  `useRouter`/`useTransition`.
- `components/BoardArea.tsx` + `components/BoardSkeleton.tsx` (novos):
  envolvem o `<Board>` (server component); quando `pendente` é true,
  mostram um grid de placeholders com animação de gradiente
  (`@keyframes skeleton-shimmer`) por cima, escondendo o conteúdo real
  (`opacity: 0`) até o novo RSC payload terminar de carregar.

### Redesenho do card (`components/OpportunityCard.tsx`)
Ordem final, de cima para baixo: foto → **selo de classificação** (cor
sólida escura por nível, texto branco, sem gradiente — testado com
gradiente antes e revertido a pedido) → título (maior, 17px/700) →
"GANHO" (rótulo pequeno, centralizado) → valor da diferença em R$
(`#2bac60`) → "Margem de **X%** abaixo da FIPE" (rótulo 13px, percentual
18px/700) → Ano + KM (ícones `Calendar`/`Gauge`) → `.precos-grupo` com
"Preço" (`.linha-preco-anuncio`, 700) e "FIPE" (`.linha-preco-fipe`,
600, era "Tabela FIPE") → data de publicação + localização lado a lado
(`.data-local`, mesmo alinhamento — "Hoje, HH:mm" quando é o dia atual,
senão "dd/mm, HH:mm") → WhatsApp/perfil do remetente → motivo da venda
(só Inserção Direta) → link do anúncio original.

- Câmbio removido da exibição do card (estava na linha de localização).
- `.board` e `.board-header` perderam fundo/borda (estilo "flat"), para o
  card se destacar sozinho contra o fundo cinza da página — decisão
  consciente do usuário após ver o board com caixa branca + cards
  brancos ficando sem contraste.
- `.filtro-chip`: removidos os emojis de medalha e o "(%+)" entre
  parênteses do rótulo (`lib/classificacao.ts`,
  `ROTULO_CLASSIFICACAO_FILTRO`), cantos levemente arredondados (8px, não
  mais pill) e fundo no mesmo tom do hover anterior (para não desaparecer
  no fundo flat do board).

### Campos novos: KM e Motivo da venda
- **KM** (`km`, `integer`, migration `0006_km.sql`): a OLX já expõe esse
  dado na própria listagem (propriedade `mileage`, mesmo lugar de onde
  já vinham marca/modelo/ano/câmbio) — confirmado inspecionando o HTML
  real da listagem, **sem precisar de requisição extra** por anúncio.
  Capturado em `discovery-worker/src/olxService.ts`
  (`parseKm`/`buscarPropriedade(..., "mileage")`) e propagado em
  `main.ts`. Na Inserção Direta o campo é opcional, preenchido manualmente
  (`FormularioEnvio.tsx`, logo depois de Câmbio, ambos reordenados para
  ficar logo após o select de Ano).
- **Motivo da venda** (`motivo_venda`, `text` livre, migration
  `0007_motivo_venda.sql`): só relevante para `origem_tipo='insercao_direta'`
  (a OLX não expõe esse dado) — `lib/motivoVenda.ts`, mesmo padrão de
  `lib/perfilRemetente.ts`. Select obrigatório no formulário `/enviar`.
  Opções atuais: Liquidez imediata, Troca de veículo, Já tenho outro,
  Encomendei um zero, Encerramento de atividade, Outro (passou por duas
  rodadas de ajuste a pedido do usuário antes de chegar nesta lista).
- Câmbio do formulário `/enviar` perdeu a opção "CVT" (a pedido do
  usuário — "Automático" já cobre o caso).
- **Migrations `0006` e `0007` já aplicadas manualmente pelo usuário no
  SQL Editor do Supabase nesta sessão** (confirmado por ele no chat).

### Varredura rodada após o refinamento
`npm run discover` (modo incremental, padrão) em `apps/discovery-worker`:
16 anúncios novos, 2 elegíveis salvos (Hyundai Comfort Plus, BMW Sdrive
20I — ambos já com `km` populado, confirmando a captura nova), 14
descartados por margem, 0 sem FIPE. Total em Descobertas: 51.

## Modo `intervalo` de varredura (20/06/2026, sessão seguinte)

Criado em `apps/discovery-worker/src/main.ts` para ampliar a base de
oportunidades com dias anteriores ao início real da operação (primeira
varredura começou 19/06/2026 às 00h06) — útil para ter volume suficiente
para testar paginação etc. Diferente do modo `incremental` (que para no
primeiro anúncio já conhecido) e do `inicial` (que para numa janela de
dias corridos a partir de agora), o modo `intervalo` varre uma faixa de
datas fixa e arbitrária, ignorando se o anúncio já é conhecido até atingir
o início da janela — necessário porque dias anteriores ficam "atrás" (mais
antigos) de tudo que já foi capturado, então o atalho do modo incremental
pararia antes de alcançá-los.

- Uso: `MODO_VARREDURA=intervalo JANELA_INICIO=<ISO> JANELA_FIM=<ISO> npm run discover`
  (datas com timezone explícito, ex.: `2026-06-18T00:00:00-03:00`)
- Anúncios mais novos que `JANELA_FIM` são pulados (`continue`, segue
  paginando); ao encontrar um anúncio mais antigo que `JANELA_INICIO`, a
  varredura para (`break`); anúncios sem `dataPublicacao` são pulados sem
  parar a varredura (não há como saber se estão na janela)
- Resultados desta sessão, cada um rodado separadamente:
  - **18/06/2026** (00:00–23:59:59): 60 novos, 22 elegíveis salvos, 38
    descartados por margem, 0 sem FIPE
  - **17/06/2026**: 14 novos, 8 elegíveis salvos, 6 descartados, 0 sem
    FIPE
  - **16/06/2026**: 65 novos, 33 elegíveis salvos, 31 descartados, 1 sem
    FIPE
  - Dia 15/06 não foi rodado (parada a pedido do usuário, meta de ~120 já
    alcançada com 114)
- Total em Descobertas após as três rodadas: **114** (era 51 antes desta
  sessão)

## Correção de scroll da Central de Oportunidades (20/06/2026, sessão seguinte)

O `.board-lista` (grid de cards) tinha `max-height: 80vh` + `overflow-y:
auto` — criava um scroll interno isolado, como se o board fosse um
"iframe" dentro da página, em vez de a página rolar normalmente pelo
corpo do navegador. Corrigido em
`apps/admin/app/globals.css`:

- `.board-lista`: removidos `max-height` e `overflow-y` — agora é só um
  grid sem altura fixa, cresce com o conteúdo
- `.top-bar` (busca/ordenar/filtrar): ganhou `position: sticky; top: 0`
  com fundo (`#f0f2f5`, mesma cor do body) e `z-index: 6`, para ficar
  fixa no topo da viewport ao rolar, como pedido
- `.sidebar`: também precisou de `position: sticky; top: 0; height:
  100vh; overflow-y: auto` — sem isso, ela rolava junto com a página e
  desaparecia (regressão percebida só depois de testar no navegador,
  corrigida na mesma sessão). No breakpoint mobile (`max-width: 800px`,
  onde a sidebar vira barra horizontal no topo), o sticky é revertido
  (`position: static; height: auto; overflow-y: visible`) pois lá ela já
  ocupa largura total e não faz sentido fixá-la separado da topo-bar
- Validado com `npm run dev` + Chrome MCP: rolagem de ~114 cards
  confirmada com sidebar e top-bar fixas e o body como único container de
  scroll

## Módulo Favoritor (21/06/2026)

Inspirado visualmente na OLX (ícone maior) e no pop-up de primeiro
favorito da Webmotors.

- `components/OpportunityCard.tsx`: botão de coração (`lucide-react`
  `Heart`) sobreposto à foto (canto superior direito), `hover` fica
  vermelho, ao marcar fixa vermelho preenchido — substitui o antigo botão
  "Favoritar"/"Favoritado" do rodapé do card (removido)
- Pop-up de primeiro favorito: mostrado uma única vez por navegador
  (`localStorage`, chave `repasse-livre:popup-primeiro-favorito-visto`),
  texto e botão "Fazer Login" iguais ao conceito da Webmotors — é só
  visual/mock, não existe sistema de usuários ainda; o botão mostra um
  feedback "Login ainda não implementado nesta fase"
- Nova aba **Favoritos** na `Sidebar`, com contador — filtra
  `favorito=true` independente de `status`/`origem_tipo` (diferente das
  outras abas, que filtram por `status`); reaproveita toda a infra de
  busca/filtro/ordenação já existente em `DiscoveriesBoard.tsx`
- Reaproveita a coluna `favorito` (`boolean`) já existente desde o
  Sprint 3 — nenhuma migration nova para isso

### Botão "Anunciar"

`components/TopBar.tsx`: botão verde (`#2bac60`, mesma cor do "Ganho" no
card), cantos arredondados, `font-weight: 700`, ao lado da busca — link
direto para `/enviar`.

## Reforma do formulário de Inserção Direta (21/06/2026, sessão seguinte)

Várias rodadas de ajuste fino no `FormularioEnvio.tsx` e `globals.css`,
pedidas diretamente sobre o resultado já no ar.

### Labels → máscara/placeholder
A maioria dos labels textuais (`<span>` acima do campo) foi removida em
favor do texto direto como placeholder (inputs) ou como primeira `option`
em cinza (selects, via `.campo select:has(option[value=""]:checked)`,
simulando um placeholder nativo). Mantém o label real só onde fazia
sentido como título de grupo (`.campo-titulo-grupo`, ex.: "Opcionais",
"Sinistro ou Leilão?", "Seus Dados").

### Campo "Título" removido
Não fazia mais sentido pedir um título livre quando já se escolhe
Marca/Modelo/Ano via FIPE. O campo `veiculo` (coluna obrigatória no
banco) agora é montado automaticamente como `"{Marca} {Modelo}"` a partir
do texto das `option`s selecionadas, enviado via `<input type="hidden">` —
o usuário não vê nem preenche mais esse campo.

### Mensagens de FIPE/margem/incentivo como cards
`.formulario-fipe`, `.formulario-margem` e `.formulario-incentivo` viraram
cards com ícone (`lucide-react`), fundo e borda próprios, fonte ~20%
maior — em vez de texto corrido. `.campo-erro` ganhou o mesmo tratamento
visual (fundo vermelho claro, mais legível). A mensagem de margem
negativa (preço acima da FIPE) deixou de mostrar o percentual negativo
(confuso) e passou a dizer "Valor acima da FIPE! Preço máximo aceito:
R$X. Mínimo aceito é de 5% abaixo!".

`.formulario-incentivo` (novo, fundo âmbar `#fff7e6`, ícone `Sparkles` —
visual "sugestivo", não de alerta) lista os próximos níveis de
classificação ainda não alcançados (Prata/Ouro/Diamante) com o preço
necessário para cada um, calculado a partir do `valorFipe` — incentiva o
anunciante a baixar o preço.

### Reordenação de campos
Ordem final: Veículo (auto) → Marca → Modelo → Ano → mensagens FIPE →
**Preço** → mensagem de margem/incentivo → **KM Atual** → **Opcionais**
(checkboxes) → **Sinistro ou Leilão?** (checkboxes) → Câmbio → Fotos →
**Descrição** (textarea) → **Seus Dados / Seu nome** → WhatsApp →
**Estado** → **Cidade** → Seu Perfil de Anunciante? → Motivo da venda.

### Campos novos
- **Descrição** (`descricao`, coluna já existia desde o Sprint 1, só
  não era usada na Inserção Direta): `<textarea>`, placeholder
  "(Opcional) Descreva detalhes, pneus fracos, motor precisa revisar,
  lataria boa..."
- **Nome do anunciante** (`nome_remetente`, coluna nova — migration
  `0008`): input "Seu nome", opcional, mostrado no card (substituiu o
  rótulo de Perfil de Anunciante ao lado do WhatsApp) e no texto de
  compartilhamento (`lib/compartilhamento.ts`)
- **Opcionais** (`opcionais`, `jsonb`, coluna nova — migration `0008`):
  checkboxes múltiplos (Ar Condicionado, Direção Hidráulica/Elétrica,
  Vidros Elétricos, Travas Elétricas)
- **Sinistro ou Leilão?** (`sinistro_leilao`, `jsonb`, coluna nova —
  migration `0008`): checkboxes múltiplos (Leilão, Sinistro, Não, Não
  sei) — ainda não exibidos em nenhuma tela além do formulário
- **Modelo correto no card de Enviadas**: o nome do modelo (texto da
  `option` selecionada na FIPE) agora é capturado e salvo na coluna
  `versao` (já existente, mesma coluna usada pelo `discovery-worker` para
  o modelo da OLX) — `OpportunityCard.tsx` usa `versao` como título do
  card para `origem_tipo='insercao_direta'`, com fallback para `veiculo`

### Loading durante o envio
Sprint anterior já usava `useFormState`; agora dois componentes novos
usam `useFormStatus` (que só funciona em componente filho do `<form>`,
não no mesmo componente que renderiza a tag `<form>`):
- `components/EstadoEnvioFormulario.tsx`: overlay cobrindo o formulário
  inteiro com spinner e aviso "Não saia da página nem clique novamente."
- `components/BotaoEnviarFormulario.tsx`: o próprio botão de envio
  também desabilita e mostra spinner + "Enviando…"

Resolve o problema de usuários impacientes clicando em "Enviar" mais de
uma vez, já que a Server Action não dava nenhum feedback visual durante
o `await`.

### Migration `0008` — pendente de aplicar manualmente
- `supabase/migrations/0008_campos_adicionais_envio.sql` — **já aplicada
  manualmente pelo usuário no SQL Editor do Supabase nesta sessão**
  (`nome_remetente text`, `opcionais jsonb default '[]'`,
  `sinistro_leilao jsonb default '[]'`)

## Correção de título da OLX + backfill (21/06/2026, sessão seguinte)

Usuário reportou que buscar por "Punto" não achava um anúncio que devia
estar elegível. Investigação: o anúncio **estava** salvo corretamente
(margem 5.68%, Bronze), mas com título incompleto — "Fiat Essence
Dualogic 1.6 Flex 16V 5P" em vez de "Fiat **Punto** Essence Dualogic 1.6
Flex 16V 5P".

- **Causa**: `apps/discovery-worker/src/main.ts` montava `veiculo` a
  partir de `anuncio.modelo` (propriedade estruturada `vehicle_model` da
  OLX), que só traz a versão/trim (ex.: "Comfort Plus"), sem o nome base
  do modelo (ex.: "HB20"). O título completo e correto já vinha em
  `anuncio.titulo` (`ad.subject`), só não estava sendo usado.
- **Correção**: `veiculo: anuncio.titulo` (era
  `anuncio.modelo ?? anuncio.titulo`). `versao` continua sendo
  `anuncio.modelo` (usado como complemento no texto de compartilhamento,
  só quando diferente de `veiculo`).
- **Backfill retroativo**: `apps/discovery-worker/src/backfillTitulos.ts`
  (novo, `npm run backfill:titulos`) — revisita a página de cada
  oportunidade de `origem_tipo='descoberta'` já salva, extrai o título
  completo correto (`olxService.ts`, nova função
  `buscarTituloDaPaginaAnuncio`, mesmo padrão de regex tolerante a
  `&quot;` usado para o FIPE) e atualiza `veiculo` se diferente. Pausa de
  400ms entre requisições (mesma lógica de "comportamento parecido com
  humano" já documentada nas decisões abaixo).
- **Resultado desta sessão**: 116 oportunidades revisadas, **114
  corrigidas**, 1 já estava certo, 1 falhou (anúncio do Toyota Hilux SW4
  provavelmente removido/expirado na OLX nesse meio tempo — manteve o
  título antigo, sem quebrar nada).

## Sprint extra — Autenticação, perfis e favoritos por usuário (21/06/2026)

Objetivo: separar "gestão da plataforma" (quem aprova/rejeita) de "demais
usuários" (vitrine pública + favoritos próprios), inspirado visualmente em
cadastro.adminer.pro.

### Supabase Auth (`apps/admin`)
- `@supabase/ssr` instalado; `lib/supabase-browser.ts` (client-side, anon
  key) e `lib/supabase-server.ts` (Server Components/Actions, anon key +
  cookie de sessão — respeita RLS, diferente do `supabaseAdmin` em
  `lib/supabase.ts`, que é service role e continua só para as operações
  administrativas internas já existentes)
- `middleware.ts`: renova o cookie de sessão a cada request (padrão
  `@supabase/ssr` para o App Router)
- `app/auth/callback/route.ts`: troca `code` (Google OAuth, confirmação de
  cadastro, magic link de recuperação) por sessão e redireciona para `/`
- Env vars novas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (anon/public key do painel do Supabase — diferente da service role key
  já existente)

### Telas (`app/login`, `app/cadastro`, `app/redefinir-senha`)
- `/login`: e-mail + senha (`signInWithPassword`) + Google OAuth + modo
  "Esqueci minha senha" (toggle na mesma tela — esconde o campo senha,
  troca o botão pra "Redefinir Senha", chama `resetPasswordForEmail`)
- `/cadastro`: e-mail + senha + confirmar senha (`signUp`) + Google —
  Supabase exige confirmação por e-mail antes do primeiro login (regra já
  ativa no painel)
- `/redefinir-senha`: recebe o link do e-mail de recuperação (que já
  estabelece sessão), formulário de nova senha (`updateUser`), depois
  manda direto para `/` já logado — sem pedir a senha de novo
- Magic link "puro" foi descartado como método principal de login (só
  sobrou disfarçado dentro do fluxo de recuperação de senha) — decisão
  trocada no meio da sprint: o pedido original era a la adminer.pro
  (Gmail + e-mail), e o usuário pediu explicitamente uma tela de login
  com senha depois de ver a versão só-magic-link na prática

### Perfis e roles (migration `0009_perfis_favoritos.sql`)
- Tabela `perfis` (`user_id` FK `auth.users`, `role` `'admin'|'publico'`,
  default `'publico'`) + trigger `on_auth_user_created` que cria o
  perfil automaticamente no primeiro login (cobre Google e e-mail igual)
- **Pegadinha encontrada em produção**: o Supabase passou a habilitar RLS
  automaticamente em tabelas criadas pelo SQL Editor, mas sem nenhuma
  política — isso bloqueava silenciosamente até o próprio usuário ler o
  seu perfil (a role nunca chegava como `admin` no app, mesmo já promovido
  no banco). Corrigido com uma política `perfis_select_proprio` (`user_id
  = auth.uid()`) — já incluída na migration
- **Promoção do primeiro admin**: como o usuário fez o primeiro
  cadastro/login antes da migration existir, o trigger nunca rodou para
  essa conta — precisou de um `insert` manual em `perfis` (não só
  `update`) para criar a linha já como admin. Próximos usuários (criados
  depois da migration) só precisam do `update`
- Sem UI de gestão de usuários ainda — promoção continua manual no SQL
  Editor

### Favoritos por usuário (tabela `favoritos`)
- Tabela nova `favoritos` (`user_id` + `opportunity_id`, PK composta) —
  substitui a coluna antiga `opportunities.favorito` (boolean global),
  que fica órfã (sem leitura/escrita pelo app, remoção fica para limpeza
  futura)
- `DiscoveriesBoard.tsx`: aba "favoritos" passa a filtrar pela tabela
  nova por `user_id`; demais abas recebem um `Set` de ids favoritados
  pelo usuário atual pra marcar o coração certo no card
- `app/actions.ts`: nova `alternarFavoritoUsuario(opportunityId)` (usa
  `obterUsuarioAtual()` pra saber quem é; lança erro se deslogado) —
  substitui o antigo `alternarFavorito` baseado na coluna boolean
- Popup do coração (antigo "popup de primeiro favorito", hoje mock) ficou
  funcional: deslogado → abre popup com link real pra `/login`; logado →
  favorita de fato

### Controle de acesso por role
- `DiscoveriesBoard.tsx`: `podeAcessarAba()` bloqueia Descobertas/
  Enviadas/Rejeitadas pra quem não é admin (a query roda com
  `supabaseAdmin`, que ignora RLS — o gate real é checado aqui, não só
  na UI); `app/page.tsx` força a aba pra `aprovadas` se a URL pedir uma
  aba restrita sem ser admin
- `Sidebar.tsx`: só admin vê as 3 abas de gestão; rótulo de "Aprovadas"
  renomeado pra **"Oportunidades"** pra todo mundo (mesmo conteúdo,
  nome mais amigável pro público)
- `OpportunityCard.tsx`: botões Aprovar/Rejeitar/Apagar só renderizam com
  `isAdmin`; `app/actions.ts` tem `exigirAdmin()` checando a role no
  servidor antes de aprovar/rejeitar/apagar (defesa em profundidade,
  não só esconder o botão)
- `TopBar.tsx` + `components/UserMenu.tsx` (novo): canto direito mostra
  "Login"/"Criar Conta" deslogado, ou avatar+e-mail+"Sair" logado

### UI de gestão de usuários (21/06/2026, sessão seguinte)
Pendência #6 resolvida: nova rota `/usuarios` (`apps/admin/app/usuarios/page.tsx`),
só acessível por admin (`redirect("/")` se não for), lista todos os usuários
(e-mail via `supabaseAdmin.auth.admin.listUsers()` + `role` da tabela `perfis`)
com botão para promover (`publico`→`admin`) ou remover admin
(`admin`→`publico`) — `alterarRolePerfil` em `app/actions.ts`, bloqueada para
o próprio usuário logado (defesa em profundidade além do botão desabilitado
no client). Reaproveita o mesmo layout (`Sidebar`+`NavegacaoProvider`) da
Central de Oportunidades — item novo "Usuários" na `Sidebar`, fora do array
de abas (não é uma `Aba` do `DiscoveriesBoard`, é uma rota própria), visível
só para admin, destacado via `usePathname` (e não via `abaAtiva`, que só
reflete a URL `/`). Não precisou de migration nova.

Base pensada para evoluir: hoje `perfis.role` é só `'admin'|'publico'`, mas a
intenção é ter mais tipos de permissão no futuro, ligados a planos pagos
(ainda não definidos) — quando isso acontecer, vai exigir trocar o toggle
binário atual por um seletor de múltiplos tiers.

### RLS em `opportunities` e `favoritos` (mesma migration `0009`)
- Proteção em profundidade — hoje o app lê/grava via `supabaseAdmin`
  (ignora RLS), o gate real é nas Server Actions/Server Components; RLS
  cobre o dia em que algo passar a usar o client anon direto do navegador
- `opportunities`: select público só pra `status='aprovada'`, demais
  abas e todo update/delete exigem `perfis.role='admin'`
- `favoritos`: cada usuário só vê/grava as próprias linhas

### E-mails transacionais — SMTP customizado (Resend)
- Painel do Supabase configurado com SMTP do **Resend** (domínio próprio
  `repasselivre.com` verificado) em vez do serviço de e-mail padrão do
  Supabase — necessário porque o padrão tem um limite de envio muito
  baixo no plano free (bateu `over_email_send_rate_limit` só de testar)
- Visual/template dos e-mails (assunto, corpo, remetente "amigável")
  ainda não foi customizado — usa o template padrão do Supabase, só com
  o transporte trocado; fica pendente abaixo

## Aprovação/rejeição/exclusão em massa (21/06/2026, sessão seguinte)

Hoje aprovar/rejeitar/apagar só existia um a um no rodapé do card. Novo
mecanismo de seleção múltipla pedido pelo usuário, pensando em perfis admin
que vão precisar processar lotes maiores conforme o volume de oportunidades
cresce.

- `components/SelecaoMultiplaProvider.tsx` (novo): contexto compartilhado
  (mesmo padrão de `NavegacaoProvider`) com `modoSelecao` (boolean) e
  `selecionados` (`Set<string>` de ids) — sem mudança de schema
- `components/TopBar.tsx`: botão **"Selecionar Vários"** (só admin, exceto
  aba Favoritos) liga o modo; com o modo ativo, a barra de busca/ordenar/
  filtrar é substituída por `components/BarraSelecaoMultipla.tsx`
  (contador + botões contextuais: Aprovar/Rejeitar nas abas de gestão,
  Apagar na aba Rejeitadas, sempre com Cancelar); `useEffect` zera a
  seleção ao trocar de aba
- `components/OpportunityCard.tsx`: com o modo ativo, mostra um checkbox no
  canto superior esquerdo da foto (simétrico ao coração de favorito) e
  esconde a linha de ações individuais (Aprovar/Rejeitar/Apagar/
  Compartilhar)
- `app/actions.ts`: novas `aprovarOportunidades(ids)`,
  `rejeitarOportunidades(ids)` e `apagarOportunidades(ids)` — reaproveitam
  `atualizarStatusEmMassa` (refatorada de `atualizarStatus`, agora usa
  `.in("id", ids)`) e `moverParaHistoricoEApagar` (já existente, mesma
  função usada por "Apagar tudo" das Rejeitadas — preserva o histórico)
- Testado ao vivo via Chrome MCP: selecionar 2 itens em Descobertas e
  aprovar em lote moveu os 2 para "Oportunidades" e a contagem caiu de 114
  para 112 corretamente; modo de seleção desliga automaticamente após a
  ação

## Ajustes finos pós-seleção em massa (21/06/2026, sessão seguinte)

Rodada de pequenos ajustes pedidos diretamente sobre o que já estava no ar.

### Selo de fonte escondido durante a seleção
`components/OpportunityCard.tsx`: o selo `.selo-fonte` ("OLX"/"Inserção
Direta", canto superior esquerdo da foto) se sobrepunha visualmente ao novo
checkbox de seleção (mesmo canto). Corrigido escondendo o selo quando
`isAdmin && modoSelecao` — só o checkbox fica visível nesse modo.

### Skeleton de loading durante ações em massa
`components/SelecaoMultiplaProvider.tsx`: o `useTransition` que processa as
ações em massa (antes local em `BarraSelecaoMultipla`) subiu pro contexto
(`processando` + `executarEmMassa`), pra poder ser lido também por
`components/BoardArea.tsx` — que já mostrava o `BoardSkeleton` durante
navegação (`useNavegacao().pendente`) e agora mostra o mesmo skeleton
também durante `processando` (aprovar/rejeitar/apagar em massa).

### Mensagens de erro/sucesso padronizadas (Login/Cadastro/Redefinir Senha)
`app/login/LoginForm.tsx`, `app/cadastro/CadastroForm.tsx`,
`app/redefinir-senha/RedefinirSenhaForm.tsx`: o feedback era só texto verde
simples (`.login-feedback`, classe removida) — inclusive erros apareciam em
verde, o que confundia. Agora o estado guarda `{ tipo: "erro" | "sucesso",
texto }` e renderiza com as mesmas classes já usadas no formulário
`/enviar` (`.formulario-erro` vermelho, `.formulario-sucesso` verde),
mantendo um único padrão visual de feedback em todo o painel.

### Botões "Login"/"Criar Conta" redesenhados
`app/globals.css` (`.top-bar-login`, `.top-bar-cadastro`): tamanho igualado
ao `.botao-anunciar` (padding, font-size 14px, font-weight 700,
border-radius 8px), com cores distintas e harmoniosas — "Login" com
contorno verde (`#2bac60`) e fundo transparente, "Criar Conta" com fundo
sólido verde-escuro (`#0a5d2c`, mesmo tom do selo de classificação Diamante
e do estado ativo da sidebar).

### Redesenho da busca + filtro de Estado (UF), depois refinado no estilo OLX
Pedido pensando na expansão do Motor de Descoberta para SC (hoje só varre
RS) — seguindo o espírito do cabeçalho da OLX (busca + seletor de
localização integrados, lupa clicável de verdade).
- `components/DiscoveriesBoard.tsx`: `FiltrosBoard` ganhou `estado?: string`,
  aplicado com `.eq("estado", filtros.estado)` nas duas ramificações de
  `buscarOportunidades` (normal e favoritos) — mesmo padrão de
  `precoMin`/`precoMax`. Nova `buscarEstadosDisponiveis()`: consulta
  `opportunities.estado` (sem filtro de aba/status — é a UF de qualquer
  anúncio já salvo) e filtra `UFS` (`lib/mascaras.ts`) pelas UFs realmente
  presentes — o `<select>` só lista quem tem anúncio de verdade, hoje só
  "RS"; quando o Motor de Descoberta passar a varrer SC, a opção aparece
  sozinha, sem precisar editar código
- `app/page.tsx`: chama `buscarEstadosDisponiveis()` em paralelo com
  `contarOportunidades`, passa a lista pra `TopBar`; lê `estado` da
  querystring, valida contra `UFS`
- `components/TopBar.tsx` + `app/globals.css` (`.busca-slim`): reordenado
  pra bater com o padrão da OLX — **campo de texto → `<select>` de UF →
  botão de lupa**, cada um separado por um divisor sutil dentro da mesma
  caixa (antes era select→ícone-decorativo→input, com a lupa só
  visual). Caixa maior (`max-width` 420px, leve sombra), input com
  `font-size` 15px (era 13px)
- A lupa (`.busca-slim-botao`) virou um `<button>` real, com efeito de
  clique (`hover` verde claro, `scale(0.96)` ao pressionar) — dispara a
  busca na hora (cancela o debounce de 400ms), e Enter no campo de texto
  faz o mesmo; atende quem prefere clicar em algo em vez de confiar que a
  busca já é "ao vivo"
- Testado ao vivo: `<select>` mostra só "RS" (única UF com dados); buscar
  "Onix" + clicar na lupa filtrou pra 9 resultados

### Fonte dos chips de classificação
`.filtro-chip` ("Todas"/"Bronze 5%+"/"Prata 10%+"/etc., `globals.css`):
`font-size` de 12px para 14.4px (+20%, pedido direto) — mais legível ao
lado da busca redesenhada.

## Identidade visual + menu overlay + reorganização da TopBar (22/06/2026)

### Logo e favicon reais
- `apps/admin/public/logo.svg` — arquivo vetorial oficial da marca (ícone
  "RL" em gradiente verde + wordmark "REPASSE LIVRE"), enviado pelo usuário
  como SVG traçado (não PNG) e inserido sem fundo (a versão original trazia
  uma camada de fundo branco com recortes no formato das letras — removida
  pra manter transparência real em qualquer fundo)
- `apps/admin/app/icon.svg` — favicon usando o mesmo path do ícone "RL",
  centralizado, também sem fundo branco (convenção do Next.js App Router:
  arquivo `app/icon.svg` é detectado automaticamente, sem precisar tocar em
  `layout.tsx`)
- Passou por duas rodadas de recriação manual (tentativas de desenhar o
  ícone à mão em SVG, sem sucesso — ficou parecendo "K") até o usuário
  enviar a arte vetorial real; lição: pedir o arquivo fonte antes de tentar
  recriar um logo de marca à mão

### Logo movido da Sidebar pra TopBar
O logo começou na sidebar (substituindo o texto "Repasse Livre"), mas o
usuário pediu pra mover pra TopBar, ao lado da busca — ali ocupa a altura
cheia da barra (44px, depois ajustado para 40px = -10% a pedido) e é um
link (`next/link`) pra `/`.

### Menu lateral virou overlay (estilo r7.com)
`components/Sidebar.tsx` reescrito: antes era um painel que colapsava
(256px ↔ 64px, com hover-peek e preferência salva em `localStorage`).
Agora:
- Carril fino (64px) **sempre visível** e fixo no layout (não desloca o
  conteúdo), só com ícones de navegação — sem localStorage, sem hover-peek
- Clicar no hambúrguer abre um **painel overlay** (`position: fixed`,
  280px, com fundo escurecido por trás) que sobrepõe o conteúdo sem mudar
  o layout geral, fecha ao clicar fora ou apertar Esc
- O logo completo (`/logo.svg`) aparece no topo desse painel — já que não
  cabe no carril fino, e é exatamente o lugar "bonito" pra ele nesse modo,
  como o usuário observou
- Painel tem os itens com label+contador; carril só tem os ícones

### Reorganização da TopBar
- **Ordenar/Filtrar Preço** saíram da TopBar e foram pra
  `components/FiltroClassificacao.tsx`, ao lado dos chips de classificação
  (empurrados pra direita com `margin-left: auto`) — fica tudo que filtra
  a lista numa linha só, separado da busca/navegação
- Label **"Ordenar por:"** adicionado antes do dropdown de ordenação
  (`.filtro-ordenacao-label`)
- **"Anunciar"** saiu do grupo de botões da direita (`top-bar-acoes`) e
  passou pra `top-bar-linha-principal`, ao lado da busca — o grupo da
  direita ficou só com "Selecionar Vários" (admin) e o `UserMenu`
  (Login/Criar Conta ou avatar)

### Correção de overflow/sobreposição no layout responsivo
Bug real encontrado: em larguras intermediárias (~590-720px), o botão
"Anunciar" ficava sobreposto ao "Criar Conta" em vez de quebrar linha.
Causa raiz: `.top-bar-linha-principal` usava `flex: 1` (= `flex-basis: 0%`),
o que faz o navegador calcular o tamanho "ideal" do item como zero,
escondendo do algoritmo de quebra de linha (`flex-wrap`) que o conteúdo
real (logo + busca + Anunciar) precisava de mais espaço — resultado: nunca
quebrava, só sobrepunha. Corrigido trocando para `flex: 1 1 auto` (basis
baseado no conteúdo real) + `min-width: 0` (permite encolher além do
conteúdo, já que a busca tem seu próprio piso de `min-width`) +
`flex-wrap: wrap` como rede de segurança. Validado via
`document.body.style.width` forçado (não foi possível redimensionar a
janela real do Chrome neste ambiente) em 320px/375px/591px/722px — sem
sobreposição em nenhum caso.

Também corrigido: o `<select>` de Estado (UF) tinha `flex-shrink: 0`
(nunca encolhia), forçando a busca a ficar espremida. Agora encolhe
(`flex-shrink: 1`, `max-width: 130px`) e troca o rótulo padrão de "Todos
os estados" para **"UF"** abaixo de 640px (`matchMedia` + `useState` em
`TopBar.tsx`), liberando espaço real pro campo de busca em telas
estreitas.

## Refino responsivo + paginação + breadcrumb (23/06/2026)

Sessão longa, guiada por testes diretos no responsive viewer (extensão do
Chrome) e depois pela ferramenta de preview interna (MCP `Claude_Preview`,
que sobe o `next dev` e permite screenshot/click/eval — precisou de
`.claude/launch.json` na raiz `C:\claude` com `runtimeExecutable` apontando
pro `node.exe` direto, já que `node`/`npm` não estão no PATH dos shells
sandboxados desta máquina; comando completo:
`node node_modules/next/dist/bin/next dev <pasta>`). O preview server travou
(`preview_screenshot` em timeout) várias vezes ao longo da sessão — sempre
resolvido com `preview_stop` + `preview_start` de novo, sem precisar
investigar a causa.

### Ambiente local mais rápido
- Exclusão do Windows Defender pra pasta `C:\claude` (precisa de PowerShell
  administrador, `Add-MpPreference -ExclusionPath "C:\claude"`)
- Tentativa de usar Turbopack (`next dev --turbo`) **revertida**: o Next
  14.2.35 com Turbopack quebra a resolução de um `import()` dinâmico dentro
  de `@supabase/supabase-js` (`@opentelemetry/api`, pacote opcional não
  instalado) — Webpack (padrão) ignora isso de boa, Turbopack não. Script
  `dev` voltou a ser só `next dev`
- Política de execução do PowerShell (`Set-ExecutionPolicy RemoteSigned
  -Scope CurrentUser`) precisou ser ajustada na máquina do usuário pra
  `npm run dev` funcionar sem usar `npm.cmd` toda hora

### TopBar virou cabeçalho global full-width
`app/page.tsx`: `<TopBar>` saiu de dentro de `.layout`/`.conteudo` e passou
a ser renderizado **antes**, como uma barra branca fixa (`position:
sticky`) que ocupa a largura inteira da viewport, com `border-bottom`
separando do conteúdo cinza — antes ficava confinada dentro do padding do
`.conteudo`, do lado da Sidebar. `Sidebar` ganhou `top`/`height` ajustados
(`calc(100vh - 69px)`) pra não ficar embaixo da nova barra.

### Sidebar no mobile: hambúrguer flutuante, sem fileira de ícones
No mobile (`≤800px`), a fileira de ícones sem rótulo da Sidebar colapsada
(redundante com o hambúrguer, que já abre o painel completo com rótulos)
foi escondida — só sobra o botão hambúrguer, agora `position: fixed` no
canto superior esquerdo, sobre a TopBar (`z-index` mais alto), na mesma
"linha" visual da logo.

**Bug encontrado e corrigido**: a regra `.sidebar-lista, .sidebar-rodape {
display: none }` usava uma classe compartilhada entre a fileira colapsada
*e* o painel overlay completo (mesma classe, dois lugares) — escondia os
itens dos dois, deixando o painel em branco ao abrir. Corrigido escopando
pra `.sidebar > .sidebar-lista, .sidebar > .sidebar-rodape` (só o carril,
não o overlay).

**Bug de cascata CSS encontrado duas vezes nesta sessão**: os blocos
`@media` do `globals.css` ficavam *antes* das regras base no arquivo — uma
regra incondicional definida depois de um `@media` no código-fonte sempre
vence no empate de especificidade, **mesmo que o media query bata** com o
viewport atual. Resolvido movendo os dois blocos `@media (max-width:
800px)` e `@media (max-width: 480px)` pro **final** do arquivo. Lição: em
`globals.css`, media queries específicas sempre devem vir depois das
regras gerais que sobrescrevem.

### Busca colapsa em lupa no mobile (estilo YouTube)
`components/TopBar.tsx`: no mobile, a caixa de busca completa
(texto+UF+lupa) some, sobra só um ícone de lupa no grupo de ações (junto
com "Anunciar" compacto e o ícone de usuário). Ao clicar, expande em
overlay branco cobrindo a barra inteira (`position: absolute; inset: 0`),
com `padding-left: 56px` reservando espaço pro hambúrguer fixo (que continua
visível por cima) e um botão "X" pra fechar.

### "Anunciar" e Login/Criar Conta também no menu mobile
- `components/UserMenu.tsx`: Login/Criar Conta deslogado deixaram de ser
  dois botões fixos na TopBar — agora ficam dentro do dropdown do ícone de
  usuário (clique único), liberando espaço
- `components/Sidebar.tsx`: painel overlay ganhou um rodapé com **Anunciar**
  (sempre) e **Login**/**Criar Conta** (só deslogado) — `usuarioLogado`
  como prop nova

### Chips de classificação: sticky + colapsam em botão no mobile
- `.filtro-classificacao` fica `position: sticky` colado embaixo da TopBar
  ao rolar (`top: 55px`, a altura real da TopBar no mobile)
- **Bug encontrado**: `.board` tinha `overflow: hidden`, o que vira a
  "âncora" do `position: sticky` (em vez da viewport) — o `top` passava a
  ser medido a partir do topo do `.board`, empurrando os chips pra baixo
  mesmo no topo da página (~30px de vão vazio). Corrigido com `.board {
  overflow: visible }` no mobile
- No mobile, os chips soltos (`Todas`/`Bronze 5%+`/etc.) ficavam "bagunçados"
  — escondidos atrás de um botão **"Filtrar por Margem FIPE"** (com seta que
  gira), que revela os chips ao tocar (`FiltroClassificacao.tsx`, novo state
  `chipsAbertos`)

### Paginação real (SQL, não mais carregar tudo)
A base já passa de 100+ oportunidades; a ordenação ("Mais recente"/"Maior
Margem"/etc.) era feita **em JavaScript depois de buscar todas as linhas**
— não escalava.

- **Migration `0011_data_ordenacao_paginacao.sql`** (aplicada manualmente
  pelo usuário no SQL Editor): coluna gerada `data_ordenacao = coalesce(
  data_publicacao_origem, data_captura)` (permite `ORDER BY` no SQL, já que
  `supabase-js` não expõe `COALESCE` direto) + índices `(status,
  data_ordenacao desc)`, `(status, margem_percentual desc)`, `(status,
  preco)`
- `components/DiscoveriesBoard.tsx`: `buscarOportunidades` agora usa
  `.order()` + `.range()` do Supabase (`ITENS_POR_PAGINA = 40`, igual à
  ordem de grandeza da OLX/WebMotors) e retorna `{ itens, total }`
  (`count: "exact"` do PostgREST). `contarOportunidades` (badges da
  Sidebar) também deixou de carregar tudo só pra contar — usa `count:
  "exact", head: true`
- **Paginação numerada** (`components/Paginacao.tsx`, novo), estilo
  OLX/WebMotors (ambos usam página numerada, não scroll infinito —
  confirmado por inspeção, já que os dois bloqueiam scraping direto) — `1 2
  … 5` com setas, `?pagina=N` na URL preservando todos os filtros. Mudar
  busca/estado/classificação/ordem **reseta pra página 1**
  (`params.delete("pagina")` nos `atualizarParams` de `TopBar.tsx` e
  `FiltroClassificacao.tsx`)
- Decisão consciente registrada: paginação por número (não scroll
  infinito) pra resolver o caso de uso "achei um anúncio na página 3, saí e
  quero voltar direto nela" — scroll infinito "ingênuo" reintroduziria esse
  problema. Se entrar scroll infinito no futuro (cogitado só pro mobile,
  ver Pendências), precisa manter a URL sincronizada com a posição
  (`?pagina=N` indo subindo conforme carrega mais lotes), não substituir a
  paginação

### Cabeçalho-breadcrumb com filtro de estado imediato
Layout de referência: badge com total + "`{Aba}` no `{Estado}`" (estado em
negrito) à esquerda, "`{início}-{fim}` de `{total}` resultados" à direita,
mesma linha (`.board-header` virou `flex` com `justify-content:
space-between`, filhos `.board-header-titulo`/`.board-header-resultados`).
"Todos os estados" mostra **"Brasil"** em vez de omitir.

Depois, a pedido do usuário (testando como usuário real no celular): o
`{Estado}` do breadcrumb virou um **seletor clicável** (`components/
SeletorEstadoBreadcrumb.tsx`, novo, client component) com seta ao lado —
filtra na hora, sem precisar abrir a lupa primeiro. Motivação: no mobile
(75% do tráfego) o seletor de UF só existia dentro da busca expansível,
exigindo um clique extra só pra descobrir que o filtro existe. Reaproveita
`estadosDisponiveis` (já calculado em `page.tsx` pra TopBar) e o mesmo
padrão de dropdown com clique-fora-fecha do `IconDropdown.tsx`.

### Login/Cadastro: visual mais limpo
- `app/login/LoginForm.tsx` e `app/cadastro/CadastroForm.tsx`: labels
  visíveis acima dos campos (`campo-titulo-grupo`) removidos — só
  placeholder + ícone, com `aria-label` no input preservando
  acessibilidade
- Título textual ("Repasse Livre"/"Criar conta") trocado pelo **logo**
  (`/logo.svg`) no topo do card. O `<h1>` continua no HTML (bom pra
  SEO/leitores de tela) mas visualmente oculto via nova classe utilitária
  `.visualmente-oculto` (técnica clip-rect, sem `display:none` —
  leitores de tela ainda leem, mas não ocupa espaço/não aparece)

### Commits desta sessão (em ordem)
1. Refino layout responsivo do admin para mobile
2. Adiciona paginação numerada na Central de Oportunidades
3. Cabeçalho da lista vira breadcrumb com total, estado e intervalo de
   resultados
4. Ajustes de fonte do título (16px → 15px)
5. Simplifica formulários de login/cadastro e troca título pelo logo
6. Filtro de estado imediato no título da lista (breadcrumb)

## Página individual de oportunidade + ajustes de mobile e fotos (23/06/2026, sessão seguinte)

### Breadcrumb do filtro de estado — área de toque maior
- `components/SeletorEstadoBreadcrumb.tsx`: antes só a UF (2 letras) era
  clicável pra abrir o seletor; agora o componente recebe `titulo` e
  renderiza "Oportunidades no **Brasil/UF**" inteiro dentro do
  `<button>`, ampliando a área de toque no mobile.

### "Selecionar Vários" sumindo no mobile
- Bug: `app/globals.css` tinha um `display:none` em
  `.botao-selecionar-varios` dentro do breakpoint mobile, sobrando do
  refino responsivo da sessão anterior — só admin via esse botão, e no
  mobile ele desaparecia por completo.
- Corrigido pra virar ícone (igual aos outros botões da TopBar no
  mobile) em vez de esconder. Texto (`<span>`) escondido via CSS,
  ícone (`ListChecks`) continua visível.
- Efeito colateral: com 4 ícones na TopBar (admin), o grupo passou a
  sobrepor a logo centralizada — `.top-bar-linha-principal` trocou de
  `justify-content: center` pra `flex-start`, removendo a dependência
  de um cálculo implícito de largura que mudava conforme o usuário
  (admin vs. público).

### Altura da foto de capa no mobile
- `.foto-capa` usava `clamp(170px, 22vw, 210px)` — pensado pro grid de
  colunas do desktop. No mobile (card ocupa a tela toda), isso resultava
  numa foto baixa/larga (~2:1). Override no breakpoint mobile pra
  `aspect-ratio: 4/3`, acompanhando a largura real do card.

### Redimensionamento de fotos no upload
- Problema: `app/api/fotos/route.ts` salvava o arquivo original direto
  no Storage — celulares tiram fotos de 4000px+/vários MB, o que deixava
  os cards lentos pra carregar.
- Adicionado `sharp` (`npm install sharp` em `apps/admin`) — resize pra
  no máximo 1280×960 (`fit: "inside"`, `withoutEnlargement: true`, não
  aumenta fotos menores) + reencode JPEG qualidade 82 antes do upload.
  `export const runtime = "nodejs"` explícito (sharp precisa de binário
  nativo, não funciona em runtime edge).
- **Importante**: isso só corrige uploads novos. Fotos já enviadas antes
  continuam no tamanho original no Storage — reprocessar as existentes
  ficou pendente (precisaria de um script varrendo o bucket).

### Página individual de oportunidade (`/oportunidade/[id]`)
- Motivação: a Inserção Direta não tinha link próprio pra compartilhar
  — só texto+foto copiados, com o WhatsApp do vendedor solto no texto.
  OLX também ganhou página própria pra consistência.
- `app/oportunidade/[id]/page.tsx`: rota pública (mesma regra de acesso
  da aba "Oportunidades" — qualquer `status='aprovada'`), com
  `generateMetadata` (title/description/og:image) pro preview do link
  no WhatsApp. `buscarOportunidadePorId()` nova em
  `components/DiscoveriesBoard.tsx` (`maybeSingle`, filtra por
  `status='aprovada'` — não expõe descobertas/rejeitadas por id).
- `components/PaginaOportunidade.tsx`: mostra **tudo** que existe no
  banco (diferente do card, que mostra um resumo) — câmbio, opcionais,
  sinistro/leilão, perfil do vendedor, além do que já aparecia no card.
- `components/GaleriaFotos.tsx`: carrossel client-side com
  scroll-snap (sem lib nova) — `foto_principal` + `fotos_secundarias`,
  contador "N/total" e dots de navegação.
- `components/BotaoCompartilharPagina.tsx`: Web Share API com fallback
  pra clipboard.
- `lib/site.ts`: `URL_BASE_SITE` (env `NEXT_PUBLIC_SITE_URL`, fallback
  `https://repasselivre.com`) + `urlOportunidade(id)`.
- `lib/formatadores.ts`: extraído de dentro de `OpportunityCard.tsx`
  (moeda/km/data) pra reaproveitar na página nova.
- `lib/compartilhamento.ts`: `gerarTextoCompartilhamento` agora inclui
  o link da página própria no lugar da linha de contato solta
  (WhatsApp do vendedor / link da OLX) — quem recebe já vê essa
  informação dentro da página.

### Card da Central — simplificação (pedido explícito do usuário: "ficou pesado visualmente")
- Card chegou a ganhar uma ficha Ano/KM/Câmbio/Local (grid 2 colunas,
  estilo da página individual) + linha classificação/data abaixo da
  foto — **desfeito** a pedido do usuário, card é pra ser resumo rápido,
  detalhe fica na página individual.
- Decisão final do card: **Ano e KM removidos** (ano já aparece no
  título, KM fica só na página individual — usuário interessado clica
  pra ver mais).
- **Card inteiro ficou clicável** (`onClick` no `div.card`, navega via
  `useRouter().push`), removendo o link "Abrir anúncio original" do
  rodapé (agora redundante com a página individual). Botões internos
  (favoritar, checkbox de seleção em massa, ações Aprovar/Rejeitar/
  Apagar/Compartilhar, link do WhatsApp) usam `evento.stopPropagation()`
  pra não disparar a navegação. No modo de seleção em massa (admin),
  clicar no card alterna a seleção em vez de navegar.
- Título limitado a 2 linhas com `-webkit-line-clamp` (`.titulo`) —
  títulos longos (ex: "Volkswagen Taos Highline 1.4 250 TSI Flex AUT
  2022") quebravam em 3 linhas e desalinhavam os cards da mesma fileira.
- Botão "Compartilhar" ganhou ícone (`Share2`) e mensagem de feedback
  melhor: "Você já pode colar as informações direto no WhatsApp!"
  (2,5s, antes era "Texto copiado!" por 1,5s) — também passou a tratar
  falha de clipboard (`try/catch`), que antes não existia.

### Nota de ambiente (preview local)
- `preview_screenshot` trava com frequência nesta máquina — solução
  rápida é `preview_stop` + `preview_start` de novo, não precisa
  investigar (já documentado em sessões anteriores).
- O navegador headless do `Claude_Preview` nega permissão de
  `navigator.clipboard.writeText` (`NotAllowedError`) — ao testar o
  botão "Compartilhar" por lá, o fallback de erro é esperado e não
  indica bug real; em navegador de usuário real (com gesto de clique)
  funciona.

### Commits desta sessão (em ordem)
1. Amplia área clicável do filtro de estado no breadcrumb da lista
2. Mostra "Selecionar Vários" como ícone no mobile em vez de esconder
3. Alinha logo à esquerda no mobile em vez de centralizar
4. Aumenta altura da foto de capa no mobile (aspect-ratio 4:3)
5. Redimensiona fotos de oportunidades para no máximo 1280×960 no upload
6. Cria página individual de oportunidade (`/oportunidade/[id]`)
7. (a comitar) Simplifica o card da Central: remove Ano/KM e link de
   anúncio original, card inteiro clicável, título em 2 linhas, botão
   Compartilhar com ícone e mensagem melhor

## SEO: máscara de telefone, URLs amigáveis, páginas de cidade/estado/marca e painel de variáveis (25-26/06/2026)

Sessão longa, dividida em várias rodadas guiadas por pedidos diretos do
usuário em cima do que já estava no ar, mais um trabalho avulso de
backfill/infra do worker no início.

### Backfill residual de descrições + infra do worker
- Confirmado via query direta no Supabase: **278 oportunidades** ainda
  com descrição quebrada (regressão parcial do backfill de 25/06
  anterior). Tentativa de rodar `npm run backfill:descricoes` localmente
  no Windows falhou: `curl_chrome116` (curl-impersonate) é um binário
  Linux instalado só dentro da imagem Docker do worker (ver `Dockerfile`
  de `apps/discovery-worker`), não existe nativamente no Windows.
- Railway CLI 5.23.1 instalado globalmente nesta máquina
  (`npm install -g @railway/cli`) e autenticado (`railway login`), mas
  **bloqueado**: usuário confirmou que só pode rodar o backfill quando o
  cron de varredura não estiver em execução no Railway. **Pendente**:
  trocar o Start Command do serviço pra `npm run backfill:descricoes`,
  rodar, reverter pra `npm run discover` — fora do horário do cron.

### Ocultar telefone na descrição de anúncios captados
- Anúncios de "descoberta" (OLX e futuros portais) não devem expor dados
  pessoais do anunciante original — só `origem_tipo='insercao_direta'`
  (nosso próprio anunciante) tem contato exibido.
- `lib/mascaras.ts`: `ocultarTelefonesNaDescricao` detecta sequências de
  10-11 dígitos (telefone BR, com/sem formatação, com/sem `+55`) no texto
  de `descricao` e quebra em segmentos.
- `components/PaginaOportunidade.tsx`: aplica a máscara só quando
  `!ehInsercaoDireta`, renderizando um badge "telefone oculto"
  (`.telefone-oculto` em `globals.css`) com tooltip "Contato disponível
  apenas no anúncio original" no lugar do número — puramente na exibição,
  sem tocar a captação/armazenamento (a `descricao` continua salva crua
  no banco).

### Base técnica de SEO
- `app/robots.ts`: libera `/`, bloqueia rotas administrativas/auth
  (`/usuarios`, `/enviar`, `/login`, `/cadastro`, `/redefinir-senha`,
  `/auth`, `/api`, `/worker`), aponta pro sitemap.
- `app/sitemap.ts`: dinâmico, lista oportunidades com `status='aprovada'`
  (URLs de produto + cidade + estado), `revalidate = 3600`.
- `app/layout.tsx`: `metadataBase`, title template (`"%s — Repasse
  Livre"`), description, Open Graph e Twitter Card padrão.
- Página individual ganhou `alternates.canonical`, Twitter Card e um
  `<script type="application/ld+json">` com schema.org `Vehicle`/`Offer`
  (nome, km, ano, preço, imagem, área servida).

### URLs amigáveis — de `/oportunidade/{uuid}` pra `/carros/{cidade-uf}/{slug}`
- Formato final, depois de duas iterações: `/carros/recife-pe/honda-
  civic-coupe-si-2-4-16v-206cv-mec-2p-2015-{uuid}` — cidade/estado no
  path (categoria indexável própria), slug do produto sem repetir geo
  (já está no path), id completo no final do slug (mesmo padrão que a
  OLX usa nos links que capturamos, garante unicidade sem coluna/índice
  extra). Path raiz passou de `/oportunidades` pra **`/carros`**
  (palavra-chave mais forte pra SEO automotivo) logo depois da primeira
  implementação.
- `lib/slug.ts`: `slugify`, `gerarSlugCidade`, `dividirSlugCidade`,
  `gerarSlugEstado`, `gerarSlugOportunidade` (sem geo, evita duplicar o
  ano quando já está no título), `extrairIdDaSlug` (regex de uuid no
  fim do slug — aceita tanto o slug novo quanto um link antigo que era só
  o uuid puro).
- `lib/estados.ts`: mapa UF → nome completo (`NOME_POR_UF`).
- `lib/localidade.ts` (novo): `resolverLocalidade(cidadeUf)` compartilhada
  entre as páginas de listagem e de marca — tenta cidade
  (`buscarCidadePorSlug`, exige sufixo `-uf`), depois estado
  (`buscarEstadoPorSlug`, slug por extenso nunca colide com o sufixo de
  cidade).
- `app/carros/[cidadeUf]/[slug]/page.tsx`: página individual (slug
  termina em uuid) **ou** página de marca dentro da cidade/estado (slug
  sem uuid, ex.: `/carros/sao-paulo-sp/volkswagen`) — mesmo arquivo de
  rota pra evitar conflito de rota dinâmica no Next.js.
- `app/carros/[cidadeUf]/page.tsx`: resolve cidade → estado → marca de
  nível Brasil (`/carros/volkswagen`, sem geo) nessa ordem.
- `app/oportunidade/[slug]/page.tsx`: shim de redirect 308 — cobre uuid
  puro de antes, slug-com-geo de uma versão intermediária, e qualquer
  link `/oportunidade/...` velho. Tudo cai em `caminhoOportunidade()`
  (`lib/site.ts`), fonte única da verdade pro path atual.
- `lib/site.ts`: `caminhoOportunidade`/`urlOportunidade`,
  `caminhoCidade`/`urlCidade`, `caminhoEstado`/`urlEstado`,
  `caminhoMarca`/`urlMarca` (cobre os 3 níveis: cidade+marca,
  estado+marca, só marca/nacional).

### Breadcrumb na página individual
- `components/BreadcrumbOportunidade.tsx`: `Carros > {Estado} > {Cidade}
  > {Marca}`, cada nível com link real (`/`, `/carros/{estadoSlug}`,
  `/carros/{cidadeUf}`, `/carros/{cidadeUf}/{marca}`) + JSON-LD
  `BreadcrumbList`. Marca extraída por heurística simples (`lib/marca.ts`
  `extrairMarca`: primeira palavra do título) — sem lista fixa de marcas
  pra manter.
- Visível só no desktop (`@media min-width: 768px`, classe
  `.breadcrumb-pagina`) — decisão explícita do usuário, no mobile fica
  `display: none`.
- Fica **fora do corpo do conteúdo**, na mesma linha do link "← Voltar"
  (texto simplificado, antes "Voltar para as oportunidades") — ver
  `.pagina-oportunidade-topo` em `globals.css`.

### Páginas de cidade, estado e marca (3 níveis) + variável `$tags`
- `/carros/{cidadeUf}/` lista oportunidades da cidade ou do estado
  (mesma rota resolve os dois); `/carros/{cidadeUf}/{marca}` e
  `/carros/{marca}` (nacional) listam por marca dentro/fora de um
  recorte geográfico — todas paginadas (`?pagina=N`), reaproveitando o
  grid (`OpportunityCard`).
- `lib/tags.ts` (`buscarTagsMarcas`) e `buscarMarcaPorSlug`/
  `buscarEstadoPorSlug` (`components/DiscoveriesBoard.tsx`) calculam
  frequência de marca por cidade/estado/nacional — mesma base de dados
  que poderia alimentar um futuro painel de BI (ex.: "quantos Chevrolet
  tem em SP", "qual cidade tem mais Fiat" — ideia levantada pelo
  usuário, ainda não estruturada, ver Pendências).

### Painel `/seo` completo — 5 páginas-âncora e mapa de variáveis
- Migration `0014_seo_paginas.sql` (aplicada manualmente pelo usuário):
  tabela `seo_paginas` (chave/valor — `titulo`, `descricao`,
  `atualizado_em`; coluna `imagem_og` existe mas não é mais usada, ver
  abaixo).
- `lib/seoVariaveis.ts` (client-safe, sem import de supabase):
  `CHAVES_SEO_PAGINAS` (`home`, `cidade`, `estado`, `marca`, `produto`),
  `VARIAVEIS_SEO` (legenda exibida no painel), `substituirVariaveisSeo`
  (ordena por tamanho de variável decrescente antes de substituir — sem
  isso `$tag` é substituído antes de `$tags` ser reconhecido, por ser
  prefixo).
- `lib/seo.ts` (server-only): `buscarConfigSeo`, `buscarTodasConfigsSeo`,
  `buscarFotoDestaque` (ver abaixo) — todas usando `supabaseAdmin`.
- Mapa de variáveis final (pedido explícito do usuário, com exemplo
  textual): `$title_ad`/`$description_ad` (produto), `$tag` (marca,
  singular), `$tags` (3 marcas mais frequentes do recorte), `$estado`,
  `$cidade` (cidade+estado combinados). `$cidade` é reaproveitada com
  significado diferente por página (ex.: "Recife Pernambuco" na de
  cidade, só "Pernambuco" na de estado) — decisão deliberada pra não
  multiplicar nomes de variável.
- `components/PainelSeo.tsx`: 5 seções (Home/Cidade/Estado/Marca/
  Individual), cada uma com Título + Descrição + botão **Salvar**
  próprio (sem campo de imagem — ver abaixo), e uma legenda fixa no topo
  listando todas as variáveis disponíveis.
- **Campo de imagem manual removido**: usuário considerou baixo valor
  manter um campo de URL pra preencher manualmente — substituído por
  `buscarFotoDestaque` (`lib/seo.ts`), que busca a foto do anúncio mais
  recente daquele recorte (cidade/estado/marca/home) automaticamente.
  Produto individual sempre usa a própria foto do carro.

### Bug de arquitetura: client component importando `lib/supabase.ts` indiretamente
- `components/PainelSeo.tsx` (`"use client"`) importava de `lib/seo.ts`,
  que importa `lib/supabase.ts` (cliente admin com service role key) —
  isso faz o bundler levar esse módulo pro **navegador**, onde
  `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (sem prefixo
  `NEXT_PUBLIC_`) não existem, lançando `Error: SUPABASE_URL e
  SUPABASE_SERVICE_ROLE_KEY são obrigatórios.` só ao acessar `/seo`.
- Corrigido separando `lib/seoVariaveis.ts` (sem nenhum import de
  supabase) de `lib/seo.ts` (só as funções que de fato precisam do
  Supabase) — `PainelSeo.tsx` passou a importar do arquivo client-safe.
- Varredura manual em todos os componentes `"use client"` do projeto não
  achou nenhum outro caso — os demais que importam de `lib/` ou usam
  `type Usuario`/`type Aba` fazem isso via `import type` (apagado em
  compile-time, seguro). **Regra geral pra evitar recorrência**: nenhum
  arquivo importado (direta ou indiretamente) por um componente
  `"use client"` deve ter `lib/supabase.ts`/`lib/supabase-server.ts` no
  grafo de import de valor (não-type).

### Nota de ambiente (troubleshooting desta sessão)
- Erro "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios" no
  navegador pode ter duas causas distintas, ambas vistas nesta sessão:
  (1) o bug de arquitetura acima, ou (2) uma variável de ambiente vazia
  presa na sessão do terminal (PowerShell mantém `$env:` até a janela
  fechar) — resolvido fechando o terminal e abrindo um novo antes de
  `npm run dev`. Cache `.next` stale também pode mascarar a causa real
  depois de corrigida — `Remove-Item -Recurse -Force .next` antes de
  testar de novo se o erro persistir sem motivo aparente.
- Processo `node.exe` travado na porta 3000 às vezes não pode ser
  finalizado via `Stop-Process`/`taskkill` rodado por uma sessão sem
  privilégio suficiente (`Acesso negado`) — nesse caso, finalizar via
  Gerenciador de Tarefas (aba Detalhes, buscar pelo PID) é o caminho que
  funciona.

### Pesquisa futura levantada pelo usuário (ainda não implementada)
- **Painel de busca/edição de páginas individuais** além das 5
  páginas-âncora — ideia mencionada como "talvez o mais lógico", não
  implementada nesta sessão (ficou só a base de 5 âncoras fixas).
- **BI/analytics** a partir das contagens de marca por cidade/estado já
  calculadas pelas páginas de SEO (ex.: "quantos Chevrolet em SP", "qual
  cidade tem mais Fiat") — hoje calculado on-the-fly sem agregação nem
  histórico; precisaria de uma tabela/view de agregação pra virar
  dashboard de verdade.
- **Google AI Overview / agentes de IA** — usuário observou que a
  atualização recente do Google prioriza esse tipo de superfície sobre
  busca tradicional; alinhar com isso fica como conversa futura.

### Commits desta sessão (em ordem)
1. Oculta telefone na descrição de anúncios captados de outras plataformas
2. Adiciona base técnica de SEO: robots.txt, sitemap dinâmico, metadata e JSON-LD
3. Reestrutura URLs de oportunidade com cidade/estado/marca no path (`/carros/...`)
4. Adiciona breadcrumb com JSON-LD na página individual
5. Adiciona páginas de estado e marca (cidade/estado/nacional) com SEO via template
6. Implementa painel `/seo` com 5 páginas-âncora e mapa de variáveis
7. Remove campo de imagem manual do painel SEO, usa foto do anúncio automaticamente
8. Corrige client component importando o cliente Supabase indiretamente

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
5. **Visual e remetente dos e-mails de autenticação** ainda usam o
   template padrão do Supabase (só o SMTP foi trocado pro Resend) —
   falta personalizar assunto/corpo/remetente com a marca Repasse Livre
6. ~~**UI de gestão de usuários**~~ — resolvida em 21/06/2026, ver seção
   "UI de gestão de usuários" acima (rota `/usuarios`)
7. ~~Ao subir o admin para domínio real, atualizar Site URL/Redirect URLs~~
   — resolvida em 22/06/2026: admin em produção na Vercel
   (`repasselivre.com`), Supabase Auth já atualizado
8. Coluna antiga `opportunities.favorito` (boolean global) ficou órfã
   desde a troca pra favoritos por usuário — remoção fica para uma
   migration futura de limpeza
9. **Múltiplos tiers de permissão** ligados a planos pagos (futuro,
   ainda não definido) — vai exigir expandir `perfis.role` além de
   `'admin'|'publico'` e trocar o toggle binário de `/usuarios` por um
   seletor de múltiplas opções
10. ~~Tratamento de imagens nas oportunidades "Enviadas"~~ — resolvida em
    23/06/2026 (sessão seguinte): redimensionamento/compressão via
    `sharp` em `app/api/fotos/route.ts` (máx. 1280×960, JPEG qualidade
    82). **Falta**: reprocessar fotos já enviadas antes dessa mudança
    (continuam no tamanho original no Storage) — precisaria de um
    script varrendo o bucket `oportunidades-fotos`.
11. **Scroll infinito no mobile** (cogitado, não decidido) — ver nota em
    "Paginação real" acima sobre manter a URL sincronizada com a posição
    se for implementado, pra não regredir o caso de uso "voltar pra
    página 3"
12. ~~[PRÓXIMO PASSO de 23/06]~~ — seguido pela rodada extensa de SEO em
    25-26/06/2026 (ver seção acima)
13. **Backfill residual de descrições** (278 registros) — bloqueado até
    o cron de varredura do Railway não estar em execução; Railway CLI já
    instalado/autenticado localmente, falta só trocar o Start Command,
    rodar `npm run backfill:descricoes` e reverter
14. **Gap 16h-21h / cron 2h vs 4h** — checkpoint incremental foi
    adiantado numa sessão anterior pra evitar overlap; ainda falta
    decidir se mantém 4h ou volta pra 2h
15. **Analytics/BI** a partir das contagens de marca por cidade/estado já
    calculadas pelas páginas de SEO — ideia levantada pelo usuário,
    precisa de tabela/view de agregação pra não ficar só on-the-fly (ver
    seção de SEO acima)
16. **Painel de busca/edição de páginas individuais** (além das 5
    páginas-âncora do `/seo`) — mencionado como ideia futura, não
    implementado
17. **Google AI Overview / agentes de IA** — alinhar a estratégia de SEO
    com essa superfície, ainda não conversado em detalhe
18. Visual dos chips de atributos OLX (cor/combustível/etc. na seção
    "Detalhes" da página individual) — pendente de refino de design
19. **[PRÓXIMO PASSO]** Nenhum pedido explícito em aberto ao final da
    sessão de 25-26/06/2026 — última mudança foi a correção do bug de
    arquitetura do painel `/seo`. Perguntar ao usuário o que vem a
    seguir.

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
