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
no seu projeto Supabase.

## Uso

```bash
npm run discover
```

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
- **Correspondência com FIPE por sobreposição de palavras**: o texto livre
  da OLX não bate exatamente com os nomes da tabela FIPE (ex: a FIPE
  cataloga a Evoque como "Range Rover Evoque", a OLX usa "Land Rover
  Evoque"). A busca pontua candidatos por palavras em comum em vez de exigir
  substring exata, o que resolveu a maioria dos casos testados manualmente.
- **Confirmação com o FIPE que a própria OLX já calculou**: a página
  individual de cada anúncio embute `abuyFipePrice.fipePrice` — o valor de
  FIPE que a OLX já associou exatamente ao veículo do anúncio, mais
  confiável que a correspondência textual contra a API externa (que pode
  perder informação, ex: o campo `vehicle_model` da OLX às vezes omite o
  nome da linha do veículo, como "Gol" ou "Fusca"). Por isso, depois que um
  anúncio passa pelo filtro inicial de elegibilidade usando a API externa,
  o worker abre a página individual desse anúncio para confirmar/corrigir
  o valor de FIPE antes de salvar — sem aumentar o volume de acesso para
  todos os anúncios, só para os que já parecem elegíveis.

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
