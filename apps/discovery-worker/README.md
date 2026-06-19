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

Isso executa uma varredura única da categoria/região configurada em
`OLX_CATEGORY_URL` e salva no Supabase as oportunidades com margem igual ou
superior a `MARGEM_MINIMA_PERCENTUAL` (padrão: 5%).

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

## Limitações conhecidas desta versão (Sprint 1)

- Alguns anúncios ainda podem ficar sem correspondência na FIPE
  (`semFipe` no log) quando o texto é muito diferente do catálogo.
- Captura apenas uma página de listagem por execução (sem paginação).
- A lógica de agendamento (varredura inicial ampla + leituras a cada 8h) e a
  estratégia de diff incremental ainda não estão implementadas — hoje a
  deduplicação é feita apenas por `link_origem` único no banco.
