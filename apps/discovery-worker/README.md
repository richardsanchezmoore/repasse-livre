# Motor de Descoberta — discovery-worker

Worker Node.js + TypeScript responsável pela Sprint 1: captura de anúncios
de veículos na OLX, consulta de FIPE, cálculo de margem, classificação e
persistência das oportunidades elegíveis no Supabase.

## Setup

```bash
npm install
cp .env.example .env
# preencher SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env
```

Antes de rodar, aplique a migration em `supabase/migrations/0001_init_opportunities.sql`
no seu projeto Supabase. As tabelas `discovery_runs` (histórico de varreduras,
exibido no painel `/worker` do admin) e `worker_config` (config editável pelo
mesmo painel) ficam em `supabase/migrations/0013_discovery_runs_config.sql`.

## Uso

```bash
npm run discover
```

As configs abaixo (`OLX_CATEGORY_URL`, `MODO_VARREDURA`, `MARGEM_MINIMA_PERCENTUAL`,
`JANELA_INICIAL_DIAS`, `MAX_PAGINAS`, `JANELA_INICIO`, `JANELA_FIM`) são lidas
primeiro da tabela `worker_config` no Supabase — editável pelo painel `/worker`
do `apps/admin`, sem redeploy — e só caem nas env vars abaixo quando a chave
correspondente não existe na tabela. Útil pra rodar local sem nenhuma linha em
`worker_config` ainda.

Executa uma varredura paginada da categoria/região configurada em
`OLX_CATEGORY_URL`, ordenada por data (mais recentes primeiro), e salva no
Supabase as oportunidades com margem igual ou superior a
`MARGEM_MINIMA_PERCENTUAL` (padrão: 5%).

### Modos de varredura

- **`MODO_VARREDURA=inicial`** — varredura ampla de bootstrap, para popular
  a prateleira antes do primeiro envio. Pagina até encontrar um anúncio
  mais antigo que `JANELA_INICIAL_DIAS` (padrão: 30 dias). Rodar uma única
  vez.
- **`MODO_VARREDURA=incremental`** (padrão) — uso recorrente. Pagina até
  encontrar o primeiro anúncio que já existe no banco (`link_origem`) e
  para ali, sem reprocessar o que já foi visto em execuções anteriores.
  Pensado para ser disparado por um cron externo a cada 6 horas (ex: cron
  job no Railway) — este processo não tem agendador embutido.

Em ambos os modos, `MAX_PAGINAS` (padrão: 50) limita o número de páginas
por execução como proteção contra varredura sem fim.

## Decisões técnicas relevantes

- **Transporte via `curl`**: o `fetch` nativo do Node (undici) recebe 403 da
  proteção anti-bot da OLX mesmo enviando os mesmos headers que o `curl`
  envia com sucesso — a barreira filtra por fingerprint de TLS/HTTP do
  cliente, não só pelos headers. Por isso `olxService.ts` executa `curl`
  como subprocesso. O ambiente de execução (Railway/VPS) precisa ter `curl`
  disponível.
- **Extração via `__NEXT_DATA__`**: a listagem da OLX expõe os anúncios em
  um bloco JSON embutido no HTML, então não é necessário parsing de DOM nem
  browser headless.
- **FIPE direto da página individual do anúncio, não da API externa**: a
  página de cada anúncio embute `abuyFipePrice.fipePrice` e
  `abuyPriceRef.year_month_ref` — o FIPE que a própria OLX já calculou para
  aquele veículo exato. Essa é a única fonte de FIPE usada pelo Motor de
  Descoberta hoje. A versão anterior tentava primeiro uma correspondência
  textual contra uma API externa de FIPE (por marca/modelo/ano) e só
  confirmava com o valor da OLX depois — um backfill nos primeiros 20
  registros salvos por esse método mostrou 4 (20%) com margem errada o
  suficiente para mudar a decisão de aprovar ou não (ex: um Volkswagen Gol
  calculado com 31% de margem por aproximação textual, vs. -0,8% real —
  na prática, prejuízo, não oportunidade). Por isso o worker agora abre a
  página individual de **todo** anúncio novo, não só dos que pareciam
  elegíveis — mais requisições à OLX por execução, mas dado confiável.
  `fipeService.ts` (a API externa) continua no projeto para uso futuro na
  Inserção Direta, onde o formulário usa selects de marca/modelo/ano exatos
  e não depende de aproximação textual.
- **Filtro nativo "Ofertas abaixo da FIPE" (`fpdll`), resolvido em tempo de
  execução**: a OLX tem um filtro de listagem que já restringe o universo a
  anúncios com preço abaixo da FIPE (de ~24.000 para ~800 anúncios no RS,
  medido em 19/06/2026) — reduz bastante o volume da varredura incremental
  e aumenta a taxa de acerto (de ~12% para ~45% de elegibilidade nos testes).
  A chave de query string desse filtro (`fpdll`) não é fixada no código:
  `resolverChaveFiltroFipe` lê a definição do filtro embutida na própria
  página (procurando o id `fipe_price_discount_level`) e usa o que estiver
  lá, com `fpdll` como fallback se a leitura falhar — assim, se a OLX
  renomear esse parâmetro no futuro, a varredura se adapta sozinha em vez
  de quebrar silenciosamente.

## Limitações conhecidas desta versão (Sprint 1)

- Alguns anúncios ainda podem ficar sem correspondência na FIPE
  (`semFipe` no log) quando o texto é muito diferente do catálogo.
- O agendamento em si (disparar a cada 6h) precisa de um cron externo — o
  worker só executa uma varredura por invocação.
- O corte do modo incremental assume que a OLX nunca reordena/atrasa a
  publicação de um anúncio mais antigo para o topo da listagem; se isso
  ocorrer, esse anúncio específico pode não ser capturado.
- **A API pública da FIPE (`parallelum.com.br`) tem limite de taxa (429)**
  sob volume sustentado de requisições. O serviço já faz cache de
  marcas/modelos em memória durante a execução e tenta novamente (até 3x,
  com espera progressiva) em caso de 429, mas isso não resolve um bloqueio
  prolongado — observado durante os testes desta sprint. Antes de produção,
  vale avaliar um plano pago/com chave de API da FIPE, ou um throttling
  mais agressivo entre requisições.
