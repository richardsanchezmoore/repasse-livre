# Motor brasileiro — congelado para consulta (23/09/2026)

Cópia dos arquivos do motor de descoberta **como ele funcionava no Brasil**,
com a FIPE no centro de tudo. Guardado a pedido do Gustavo: *"não destruir por
completo o que temos feito por lá... embora não faça sentido para o Paraguai"*.

⚠️ **Extensão `.bak` de propósito.** Estes arquivos estão FORA de `src/`, então
o TypeScript não os compila e eles não entram em nenhum build. São documento,
não código vivo. Para voltar a usar um deles, copie de volta para `src/` e tire
o `.bak`.

## Por que foram congelados

No Paraguai **não existe tabela FIPE**. E a FIPE não era só um campo a mais
aqui — era a **trava do scraping**. Em `facebookMain.ts`:

```ts
const ref = await resolverFipe(a);
if (!ref) {
  await registrarVistoFacebook(id, "sem_fipe");
  continue;          // ← o anúncio é DESCARTADO
}
```

Ou seja: rodar este motor no Paraguai raspava tudo certinho e jogava 100% fora,
porque nada casaria com uma tabela que não existe. O mesmo vale para
`margin.ts` (`calcularMargemPercentual`, `classificar`, `ehElegivel`), para o
`MARGEM_MINIMA_PERCENTUAL` e para o teto de suspeita.

## O que ainda vale a pena aprender daqui

Mesmo sem a FIPE, estes arquivos guardam coisas caras de redescobrir:

- **`facebookMarketplaceService.ts`** — a heurística de texto livre. O Facebook
  não tem campo estruturado: marca, modelo, ano e câmbio saem de frase solta.
  Isso é 100% reaproveitável no Paraguai, é o mesmo Facebook.
  Ver [[project_repasse_livre_fb_aplicacao_separada]].
- **As guardas contra anúncio enganoso** — "assumir financiamento" (o preço é
  só a dívida), e a âncora que descarta quando a FIPE casada fica muito acima
  da que o anunciante declara. A primeira vale em qualquer país; a segunda é a
  lógica de *sanidade de preço*, que vai ser reescrita contra a tabela própria.
- **`mercadoLivreService.ts`** — paginação, o livro-razão de vistos e o filtro
  de "anunciados hoje". Nada disso depende de FIPE.
- **`margin.ts`** — a forma do cálculo. Só troca a referência: onde lia FIPE,
  vai ler a média do próprio mercado.

## O que NÃO se aproveita

- `fipeService.ts`, `historicoFipe.ts`, `mapaAprendidoFipe.ts` — são a FIPE em
  si. No Paraguai o que ocupa esse lugar é a tabela que o Auto Radar PY vai
  construir a partir das próprias capturas.
- `olxService.ts`, `webmotorsMain.ts`, `webmotorsService.ts` — nenhuma das duas
  fontes existe no Paraguai.

## A inversão de ordem que isso implica

No Brasil a referência existia antes do produto, então o motor podia filtrar já
na captura. No Paraguai é o contrário: **primeiro captura crua e sem trava de
preço**, porque não há contra o que comparar; a referência nasce do volume; e
só então o filtro volta, comparando contra a tabela própria.

Ver [[project_auto_radar_py_handoff]].
