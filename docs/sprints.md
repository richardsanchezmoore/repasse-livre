# Sprints — Repasse Livre (Fase Zero)

Proposta de roadmap dividido em sprints, com base no
[backlog](backlog.md) e na [arquitetura](arquitetura.md) propostos. Cada
sprint assume foco incremental e entregável de ponta a ponta, não apenas
camadas técnicas isoladas.

## Sprint 1 — Fundamentos

Objetivo: ter a base de dados e a integração de FIPE prontas para suportar o
Motor de Descoberta.

- Modelar e criar a entidade Opportunity no Banco Nacional de Oportunidades
- Modelar entidade FipeReferencia
- Integração inicial com fonte de consulta FIPE
- Estrutura base do projeto (organização de pastas, ambiente, configuração)

## Sprint 2 — Motor de Descoberta

Objetivo: descobrir oportunidades automaticamente a partir da OLX.

- Captura de anúncios de veículos na OLX
- Extração de dados do anúncio individual (título, preço, cidade, estado,
  fotos, descrição, link)
- Cálculo de margem (preço vs. FIPE)
- Regra de elegibilidade (descarte abaixo de 5%)
- Classificação por faixa de margem
- Persistência da oportunidade elegível no banco

## Sprint 3 — Central de Oportunidades

Objetivo: dar ao operador um painel funcional para revisar e agir sobre as
oportunidades descobertas.

- Box "Descobertas"
- Box "Enviadas"
- Card de oportunidade (foto, veículo, cidade, margem, fonte)
- Ações de aprovar, rejeitar, favoritar e compartilhar

## Sprint 4 — Inserção Direta

Objetivo: permitir que usuários enviem oportunidades manualmente, com as
mesmas garantias de qualidade do Motor de Descoberta.

- Formulário de submissão manual
- Validações obrigatórias (captcha, WhatsApp, foto)
- Consulta FIPE automática e cálculo de margem
- Aplicação da margem mínima de 5% como filtro de entrada no banco

## Sprint 5 — Distribuição e Audiência

Objetivo: levar as oportunidades aprovadas até a audiência e começar a
construir a base de leads.

- Publicação no canal oficial
- Replicação na comunidade WhatsApp e grupos de avisos
- Landing page de captação (nome, WhatsApp, perfil)
- Fluxo pós-cadastro (acesso ao canal e à comunidade)

## Sprint 6 — Atualização dinâmica de FIPE e hardening

Objetivo: garantir que as oportunidades distribuídas permaneçam corretas ao
longo do tempo e que a operação tenha visibilidade básica do sistema.

- Job de atualização dinâmica da FIPE
- Recalculo de margem das oportunidades já salvas após virada mensal
- Observabilidade básica (logs/alertas de falha no Motor de Descoberta)
- Ajustes operacionais identificados nas sprints anteriores

## Fora do roadmap da Fase Zero

Marketplace, aplicativo mobile, pagamentos, novas fontes de descoberta
(Mercado Livre, Webmotors, Napista) e qualquer hipótese de monetização ficam
fora deste roadmap — são evoluções futuras condicionadas à validação da tese
da Fase Zero.
