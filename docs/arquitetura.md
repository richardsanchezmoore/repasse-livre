# Arquitetura — Repasse Livre (Fase Zero)

## 1. Resumo executivo do produto

O Repasse Livre é uma máquina de descoberta, classificação e distribuição de
oportunidades automotivas. Na Fase Zero, o produto **não é um marketplace**:
ele varre fontes públicas (começando pela OLX), identifica anúncios com preço
abaixo da FIPE, classifica a margem encontrada e distribui essas oportunidades
para uma audiência qualificada via canal/comunidade no WhatsApp.

O valor central não está em transacionar veículos, e sim em agregar e
qualificar oportunidades espalhadas em múltiplas fontes, entregando-as em um
único canal. A audiência construída nessa fase é o principal ativo do
projeto e a base para hipóteses de monetização futuras (grupo premium,
destaque de oportunidades, etc.), que ficam fora do escopo da Fase Zero.

## 2. Arquitetura sugerida

Arquitetura em alto nível, orientada a um pipeline de descoberta →
classificação → distribuição, com um banco central de oportunidades.

```
┌─────────────────┐     ┌──────────────────────┐     ┌────────────────────┐
│  Motor de        │     │  Banco Nacional de    │     │  Central de         │
│  Descoberta      │ ──> │  Oportunidades        │ ──> │  Oportunidades      │
│  (scraper OLX)   │     │  (armazenamento)      │     │  (painel/operação)  │
└─────────────────┘     └──────────────────────┘     └────────────────────┘
        │                                                       │
        │                                                       ▼
        │                                             ┌────────────────────┐
        │                                             │  Distribuição        │
        └───────────────┐                             │  (canal/comunidade  │
                         ▼                             │   WhatsApp)         │
              ┌──────────────────────┐                └────────────────────┘
              │  Inserção Direta      │                          ▲
              │  (landing page/form)  │ ─────────────────────────┘
              └──────────────────────┘
```

**Componentes:**

- **Motor de Descoberta**: job/worker que captura anúncios na OLX, abre cada
  anúncio individualmente, extrai os dados (título, preço, cidade, estado,
  fotos, descrição, FIPE, link), calcula a margem em relação à FIPE e persiste
  apenas as oportunidades elegíveis (mínimo 5% abaixo da FIPE).
- **Serviço de FIPE**: responsável por consultar/cachear valores de FIPE e
  por reavaliar a margem das oportunidades já salvas quando a tabela FIPE
  vira de mês — evita distribuir oportunidades com margem desatualizada.
- **Banco Nacional de Oportunidades**: armazenamento central com os campos
  definidos no PRD (veículo, versão, ano, câmbio, cidade, estado, preço,
  FIPE, margem, fotos, link origem, fonte, data de captura, status).
- **Inserção Direta**: formulário público (landing page) para que usuários
  enviem oportunidades manualmente, com validações obrigatórias (captcha,
  WhatsApp, foto, consulta FIPE, margem mínima de 5%) antes de entrar no
  banco.
- **Central de Oportunidades**: painel operacional com os boxes
  "Descobertas" e "Enviadas", onde o operador aprova, rejeita, favorita ou
  compartilha cada card — validando apenas qualidade visual e coerência das
  fotos, nunca os dados (que já chegam validados pelas regras de
  elegibilidade).
- **Distribuição**: publicação das oportunidades aprovadas no canal oficial
  e replicação em comunidade/grupos de avisos no WhatsApp.
- **Landing Page / Captação de Audiência**: página de captura de leads
  (nome, WhatsApp, perfil) que direciona o usuário para o canal e a
  comunidade após o cadastro.

## 3. Entidades principais do banco

**Opportunity (Oportunidade)**
- id
- fonte (ex: OLX)
- link_origem
- veiculo
- versao
- ano
- cambio
- cidade
- estado
- preco
- fipe_valor
- fipe_data_referencia
- margem_percentual
- classificacao (🟢/🔥/🚀/🏆)
- foto_principal
- fotos_secundarias (lista)
- descricao
- origem_tipo (descoberta | inserção direta)
- status (descoberta | aprovada | rejeitada | enviada | favoritada)
- data_captura
- data_atualizacao

**Lead (Audiência)**
- id
- nome
- whatsapp
- perfil (Comprador Particular | Investidor | Lojista | Intermediador |
  Repassador)
- data_cadastro
- canal_acessado (bool)
- comunidade_acessada (bool)

**InsercaoDireta (submissão manual, antes de virar Opportunity)**
- id
- nome
- whatsapp
- marca
- modelo
- ano
- versao
- cambio
- cidade
- km
- motivo_venda
- fotos
- captcha_validado (bool)
- fipe_valor
- margem_percentual
- status_validacao (pendente | elegível | descartada)

**FipeReferencia**
- id
- marca
- modelo
- ano
- valor
- mes_referencia

## 4. Roadmap dividido em sprints

Ver detalhamento completo em [sprints.md](sprints.md). Visão geral:

- **Sprint 1** — Fundamentos: modelagem do banco de oportunidades, integração
  inicial com FIPE, estrutura do projeto.
- **Sprint 2** — Motor de Descoberta: scraper OLX, extração de dados, cálculo
  de margem, regra de elegibilidade e classificação.
- **Sprint 3** — Central de Oportunidades: painel operacional (Descobertas /
  Enviadas), ações de aprovar/rejeitar/favoritar/compartilhar.
- **Sprint 4** — Inserção Direta: landing page de submissão manual com
  validações obrigatórias.
- **Sprint 5** — Distribuição e Audiência: publicação no canal oficial,
  landing page de captação de leads, integração com comunidade WhatsApp.
- **Sprint 6** — Atualização dinâmica de FIPE e hardening: reavaliação de
  margem após virada mensal, observabilidade básica, ajustes operacionais.

## 5. O que entra na Fase Zero

- Motor de Descoberta (fonte inicial: OLX)
- Cálculo de margem e classificação por faixas (5% a 20%+)
- Banco Nacional de Oportunidades
- Atualização dinâmica da FIPE
- Central de Oportunidades (painel operacional)
- Inserção Direta com validações obrigatórias
- Distribuição via canal oficial e comunidade WhatsApp
- Landing page de captação de audiência

## 6. O que não entra na Fase Zero

- Marketplace (compra/venda transacionada na plataforma)
- Aplicativo mobile
- Pagamentos
- Outras fontes além da OLX (Mercado Livre, Webmotors, Napista) — previstas
  para fase futura
- Qualquer hipótese de monetização (grupo premium, acesso antecipado,
  assinatura, destaque de oportunidades, direito de anunciar, ferramentas
  para anunciantes)

## 7. Riscos técnicos

- **Bloqueio/anti-scraping da OLX**: a fonte principal pode implementar
  captchas, rate limiting ou mudanças de layout que quebrem o Motor de
  Descoberta sem aviso. Precisa de monitoramento e plano de contingência
  (ex: rotação de acesso, fallback manual via Inserção Direta).
- **Dependência da FIPE**: a tabela FIPE vira mensalmente; se a reavaliação
  dinâmica falhar, oportunidades distribuídas podem exibir margens
  incorretas, comprometendo a credibilidade do canal.
- **Qualidade de dados extraídos**: variações no formato dos anúncios da OLX
  podem gerar extração incorreta de preço, ano ou versão, distorcendo o
  cálculo de margem.
- **Volume vs. operação manual**: a Central de Oportunidades depende de
  validação humana (qualidade visual). Se o volume de descobertas crescer
  rápido, a operação manual pode se tornar um bottleneck.
- **Duplicidade de oportunidades**: o mesmo veículo pode aparecer
  re-anunciado ou em múltiplas fontes futuras, exigindo lógica de
  deduplicação para não poluir o canal.
- **Compliance de WhatsApp**: distribuição em massa via WhatsApp (canal e
  grupos) está sujeita a políticas anti-spam da plataforma; uso indevido
  pode levar a bloqueio do número/canal.
- **Escalabilidade da arquitetura de descoberta**: a adição futura de novas
  fontes (Mercado Livre, Webmotors, Napista) exige que o Motor de Descoberta
  seja desenhado de forma extensível desde já, mesmo que a Fase Zero use
  apenas a OLX, para evitar retrabalho.
