# Handoff: Dashboard de Inteligência de Estoque — Seminovos (Brutalist)

## Overview
Painel executivo de uma única página que mostra a distribuição geográfica do estoque de carros seminovos no Brasil, preços médios por estado e cidade, os anúncios mais disputados (por modelo + UF) e a presença de marcas de luxo por estado. Leitura rápida de **onde estão os carros e por quanto**.

**Estética: "Brutalist de alto contraste" — tema claro.** Fundo bege quente, molduras pretas grossas (`3px solid #111`), tipografia ultra-pesada (Archivo Black / Archivo 900) em caixa-alta, blocos de cor sólidos e saturados, zero sombras e zero cantos arredondados. Numeração de seção em badge preto. Vibe de pôster/relatório editorial impresso.

## About the Design Files
`Mercado de Seminovos B.dc.html` é a **referência de design definitiva** desta linha. É uma **referência em HTML** (protótipo de aparência + comportamento), **não** código de produção. Recrie no seu codebase (React, Vue, Svelte…) com as bibliotecas/padrões já estabelecidos. O protótipo é um "Design Component" (template HTML + classe de lógica JS) — **ignore o wrapper `<x-dc>`/`DCLogic`**; o que importa é o markup, os estilos inline, a estrutura de dados e a lógica de cálculo.

## Fidelity
**Alta fidelidade (hifi).** Cores, tipografia, espaçamento e interações finalizados. As barras/mapa são `<div>`s com largura percentual; pode trocar por lib de charting desde que o resultado seja visualmente equivalente — mas **mantenha a moldura preta grossa e os cantos retos**, são a assinatura do estilo.

---

## Layout Global
- **Container**: `max-width: 1200px`, centralizado, padding `clamp(16px,4vw,44px)`.
- **Fundo da página**: `#e9e4d6` (bege). **Tinta**: `#111`. **Superfície de card**: `#f4f1e8`.
- **Regra visual nº1**: tudo é caixa com `border: 3px solid #111` (cards, header, toggles, chips), divisórias internas também `3px`. Linhas de lista usam `1.5px solid #d8d2c0`. **Sem border-radius. Sem box-shadow.**
- **Toggles e badges de seção** são pretos sólidos (`#111` / texto `#f4f1e8`).
- Cor de acento "sistema": **amarelo** `oklch(0.84 0.19 95)` (faixa do eyebrow, KPI de ticket).

### Header (uma caixa única dividida)
- Caixa `3px solid #111`, fundo `#f4f1e8`. Topo dividido por borda `3px`:
  - Esquerda: eyebrow mono uppercase em **fundo amarelo** `oklch(0.84 0.19 95)`, padding 4px 9px → "Inteligência de Estoque · Seminovos". Abaixo, H1 **Archivo Black** `clamp(40px,6.6vw,76px)`, line-height 0.86, uppercase: "Onde estão / os carros".
  - Direita: parágrafo de apoio (Archivo 500, 15px) com `border-left:3px solid #111`, padding-left 14px.
- **Faixa de 4 KPIs** (grid 4 colunas, divisórias `3px`): rótulo mono 10px uppercase + valor **Archivo 900** `clamp(30px,3.6vw,42px)`, `letter-spacing:-0.04em`. O **Ticket** tem fundo amarelo `oklch(0.84 0.19 95)`. Valores:
  - Estoque nacional: **2.091** (soma do estoque de todas as UFs)
  - Ticket médio: **R$ 98.203** (média ponderada: `Σ(estoque×preço)/Σestoque`)
  - UFs cobertas: **26**
  - Cidades: **20**

### Cabeçalho de seção (padrão)
Badge preto com número em **Archivo Black** (`01`..`04`, fundo `#111`, texto `#f4f1e8`, padding 2px 10px) + título Archivo 900 uppercase `clamp(22px,3vw,32px)`. Toggle à direita quando aplicável (caixa `3px solid #111`, sem gap interno).

---

## Seção 01 — Estados mais ativos (mapa + ranking)
Grid 2 colunas `minmax(0,1fr) minmax(0,1.05fr)`, gap `clamp(16px,2.5vw,24px)`.

**Toggle** "Estoque" / "Preço médio" controla mapa **e** ranking. Pílula ativa: fundo `#111`, texto `#f4f1e8`, weight 700. Inativa: transparente, texto `#6b6452`.

### Mapa-tile do Brasil (card esquerdo)
- *Tile/grid map* esquemático (não geográfico): grid 7 colunas, `grid-auto-rows:1fr`, gap 4px, `aspect-ratio:7/9`, `max-width:340px`, centralizado.
- Cada UF = tile com `border:1.5px solid #111` (vira `2.5px` em hover), sigla mono 11px weight 700. **Sem número dentro do tile** (a leitura de valor vem no painel de hover + ranking).
- **Cor do tile = rampa brutalista sólida**, hue único por métrica: **vermelho hue 25** (Estoque) / **azul hue 250** (Preço). Fórmula OKLCH: `L = 0.92 − 0.50·t`, `C = 0.03 + 0.18·t`. Texto branco se `L < 0.6`, senão `#111`.
- **Normalização**: `t = sqrt((v − min)/(max − min))`.
- **Hover**: borda do tile engrossa; painel abaixo (borda-topo `3px`, min-height 52px) mostra sigla em **Archivo Black 30px** + linha 1 "`{estoque} anúncios · {preço} médio`" + linha 2 "`Estoque #{rank} · Preço #{rank} do país`". `onMouseLeave` no container limpa.

**Posições no grid (row, col):**
```
RR(1,4) AP(1,5)
AM(2,3) PA(2,4) MA(2,5) CE(2,6) RN(2,7)
AC(3,2) RO(3,3) TO(3,4) PI(3,5) PE(3,6) PB(3,7)
MT(4,3) BA(4,5) AL(4,6) SE(4,7)
MS(5,3) GO(5,4) DF(5,5)
MG(6,5) ES(6,6)
SP(7,4) RJ(7,5)
PR(8,4) SC(9,4) RS(10,4)
```
(AP sem dado de estoque; tile pode ser omitido.)

**Legenda**: "Menos"/"Acessível" → 5 swatches (cada um `border:1.5px solid #111`; t = 0.08/0.3/0.52/0.74/0.96) → "Mais"/"Caro".

### Ranking + Insights (coluna direita, 2 caixas)
- **Top 12 por métrica**: linhas `grid-template-columns: 30px 1fr auto`. UF (Archivo 800, 13px) + barra (caixa `2px solid #111` h15px, preenchimento na cor da rampa, largura `t·100%`) + valor (mono 700, 11.5px). Reordena com o toggle.
- **Caixa "Preço · extremos do país"**: duas colunas.
  - "MAIS CAROS" — label em **badge** fundo `oklch(0.62 0.2 25)` texto branco. Top 4: MT R$ 203.680, AM R$ 131.811, ES R$ 124.555, SC R$ 116.933.
  - "ACESSÍVEIS" — label em badge fundo `oklch(0.6 0.16 150)` texto branco. 4 menores: AC R$ 20.000, RO R$ 61.640, RJ R$ 80.357, MA R$ 79.865.

---

## Seção 02 — Cidades mais ativas
- Toggle "Estoque"/"Preço médio" controla ordenação **e** métrica das barras.
- Caixa única, 20 linhas: `grid-template-columns: 185px 1fr`. Esquerda = nome (14px weight 700, ellipsis) + chip UF (mono 9.5px weight 700, `border:1.5px solid #111`). Direita = barra (caixa `2px solid #111` h20px) + valor (mono 700, 12px).
- Barra: largura `v/max(view)·100%`, cor `mapColor(0.55 + 0.35·t, hue)` com hue 25 (estoque) / 250 (preço). Transição `width .35s cubic-bezier(.4,0,.2,1)`.
- Valor: estoque "`{n} un.`"; preço `R$ {n}`.

---

## Seção 03 — Mais disputados
- Toggle "Volume"/"Margem" controla ordenação e métrica da barra.
- **Filtro por marca**: chips "Todas / Chevrolet / Volkswagen / Jeep / Hyundai / Fiat" — quadradinho de cor (`border:1.5px solid #111`) + nome. Caixa `2px solid #111`. Ativo: fundo `#111` texto `#f4f1e8`. Inativo: fundo `#f4f1e8` texto `#111`.
- Caixa de tabela. Cabeçalho (mono 9.5px uppercase, borda-baixo `3px`): "Modelo · UF" | "{Volume de anúncios · margem | Melhor margem · volume}" | "Faixa de KM".
- **Linhas** (`170px 1fr 150px`, borda-baixo `1.5px #d8d2c0`):
  - Col 1: quadradinho cor da marca (`1.5px solid #111`) + Modelo (13.5px weight 800) + UF mono + nome da marca (10.5px `#8a8270`).
  - Col 2: barra (caixa `2px solid #111` h16px, cor da marca, largura `v/max·100%`) + "`{qtd} un.`" e margem. **Margem ≥ 25% vira badge** fundo `oklch(0.6 0.2 25)` texto branco; caso contrário texto `#6b6452`. (Destaque: Jeep Compass SP = 52,9%.)
  - Col 3: faixa de KM sobre escala global (km máx = 211.545). Caixa `1.5px solid #111` h8px fundo `#e9e4d6`; segmento preto sólido `#111`, `left = kmMin/211545·100%`, largura `(kmMax−kmMin)/211545·100%`. Label mono 9px "`{kmMin}–{kmMax}`".

**Cores das marcas (OKLCH, saturadas p/ fundo claro):**
- Chevrolet `oklch(0.78 0.16 90)`
- Volkswagen `oklch(0.55 0.18 250)`
- Jeep `oklch(0.6 0.16 150)`
- Hyundai `oklch(0.62 0.13 210)`
- Fiat `oklch(0.6 0.2 25)`

---

## Seção 04 — Marcas de luxo
- Frase de apoio: "O Rio Grande do Sul concentra a liderança de quase todas as marcas premium do país." (Archivo 500, `#3a362b`).
- Grid de cards: `repeat(auto-fit, minmax(300px, 1fr))`, gap 12px.
- **Card** (`3px solid #111`, fundo `#f4f1e8`, padding 18px 20px):
  - Topo: quadradinho de cor (`2px solid #111`) + nome (Archivo 900, 20px, uppercase) | total no Brasil (mono 700, à direita).
  - Subtítulo: "`Lidera: {UF} · {total} no Brasil`" (mono uppercase `#6b6452`).
  - Lista de 5 UFs: `grid-template-columns: 28px 1fr 28px`. UF (Archivo; **líder weight 900 cor `#111`**, demais weight 600 `#8a8270`) + barra (caixa `1.5px solid #111` h11px, largura `qty/líder·100%`; líder cor cheia `oklch(0.62 0.17 {hue})`, demais `oklch(0.78 0.09 {hue})`) + qtd à direita.
- **hue por marca**: Audi 55, BMW 250, Land 150, Lexus 320, Mercedes-Benz 200, Porsche 60.

---

## Interactions & Behavior
- **Toggles** (3×): trocam `mapMetric`, `citySort`, `dispSort` → reordena, recalcula larguras e cores.
- **Chips de marca**: definem `dispBrand` ("Todas" = sem filtro).
- **Hover no mapa**: `onMouseEnter` por tile seta `hoverUf`; `onMouseLeave` no container limpa.
- **Transições**: barras animam largura 350ms `cubic-bezier(.4,0,.2,1)`; toggles/chips 120ms. Sem rede — dados estáticos.

## State Management
- `mapMetric`: `'estoque' | 'preco'` (default `'estoque'`)
- `citySort`: `'estoque' | 'preco'` (default `'estoque'`)
- `dispBrand`: nome da marca ou `'Todas'` (default `'Todas'`)
- `dispSort`: `'qtd' | 'margem'` (default `'qtd'`)
- `hoverUf`: sigla da UF ou `null`

## Design Tokens
**Cores**
- Fundo `#e9e4d6` · Tinta `#111` · Card `#f4f1e8`
- Texto secundário `#3a362b` · mutado `#6b6452` · apagado `#8a8270` · divisória de lista `#d8d2c0`
- Acento sistema (amarelo) `oklch(0.84 0.19 95)`
- Rampa do mapa: `L = 0.92 − 0.50·t`, `C = 0.03 + 0.18·t`; hue 25 (estoque, vermelho) / 250 (preço, azul)
- Badge "caro"/margem alta `oklch(0.6–0.62 0.2 25)` · "acessível" `oklch(0.6 0.16 150)`

**Tipografia**
- Display/títulos grandes: **Archivo Black** (H1, badges de número, sigla de hover)
- UI/números/títulos de seção: **Archivo** 600/700/800/900 (números de KPI em 900)
- Rótulos/dados: **Space Mono** 400/700
- Caixa-alta nos títulos; `letter-spacing` negativo (até `-0.04em`) nos números grandes

**Bordas/forma**
- Molduras `3px solid #111` (cards/header/toggles), barras `2px`, tiles/chips/swatches `1.5px`, linhas de lista `1.5px #d8d2c0`. **Sem radius, sem sombra.**
- Container `max-width 1200px`; gaps de seção `clamp(22px,3vw,34px)`

## Assets
Nenhum asset externo. Fontes via Google Fonts (Archivo, Archivo Black, Space Mono). Mapa e gráficos em CSS/HTML — sem imagens.

## Dados
Tudo hard-coded na classe de lógica do `.dc.html` (`estados`, `cidades`, `disputadosRaw`, `luxoRaw`, `grid`, `brandColor`). No app real virá de API — mantenha as transformações (normalização sqrt, média ponderada do ticket, larguras relativas, badge de margem ≥ 25%).

## Files
- `Mercado de Seminovos B.dc.html` — referência definitiva (brutalist / tema claro).
