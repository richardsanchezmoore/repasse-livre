# Backlog — Repasse Livre (Fase Zero)

Backlog funcional derivado do [PRD](prd-funcional.md), transformado em
tarefas executáveis e organizado por sprint. Prioriza exclusivamente a Fase
Zero (sem marketplace, sem aplicativo, sem pagamentos).

## Sprint 1 — Fundamentos + Motor de Descoberta

- [ ] Modelar entidade Opportunity (veículo, versão, ano, câmbio, cidade,
      estado, preço, FIPE, margem, foto principal, fotos secundárias, link
      origem, fonte, data captura, status)
- [ ] Modelar entidade FipeReferencia (marca, modelo, ano, valor, mês de
      referência)
- [ ] Integrar consulta à tabela FIPE
- [ ] Capturar listagem de anúncios de veículos na OLX
- [ ] Abrir cada anúncio individualmente e extrair título, preço, cidade,
      estado, fotos, descrição e link
- [ ] Calcular margem percentual (preço vs. FIPE)
- [ ] Aplicar regra de elegibilidade (descartar se margem < 5%)
- [ ] Classificar oportunidade elegível por faixa de margem
      (🟢 5–9,99% / 🔥 10–14,99% / 🚀 15–19,99% / 🏆 20%+)
- [ ] Persistir oportunidade elegível no Banco Nacional de Oportunidades

## Sprint 2 — Central de Oportunidades + Inserção Direta

- [ ] Criar box "Descobertas" listando oportunidades vindas do Motor de
      Descoberta
- [ ] Criar box "Enviadas" listando oportunidades já distribuídas
- [ ] Criar card de oportunidade com foto, veículo, cidade, margem e fonte
- [ ] Implementar ação de aprovar oportunidade
- [ ] Implementar ação de rejeitar oportunidade
- [ ] Implementar ação de favoritar oportunidade
- [ ] Implementar ação de compartilhar oportunidade
- [ ] Criar formulário de Inserção Direta (nome, WhatsApp, marca, modelo,
      ano, versão, câmbio, cidade, KM, motivo da venda, fotos)
- [ ] Validação obrigatória de captcha
- [ ] Validação obrigatória de WhatsApp
- [ ] Validação obrigatória de presença de foto
- [ ] Consulta automática de FIPE para o veículo informado na Inserção
      Direta
- [ ] Aplicar margem mínima de 5% como critério de elegibilidade na Inserção
      Direta
- [ ] Descartar submissões não elegíveis sem gravar no banco principal

## Sprint 3 — Distribuição + Audiência

- [ ] Publicar oportunidades aprovadas no canal oficial (Repasse Livre |
      Oportunidades Automotivas)
- [ ] Replicar oportunidades na comunidade WhatsApp
- [ ] Replicar oportunidades em grupos de avisos
- [ ] Criar landing page com headline "Descobrimos oportunidades automotivas
      todos os dias para você."
- [ ] Capturar nome, WhatsApp e perfil do lead na landing page
- [ ] Implementar seleção de perfil (Comprador Particular, Investidor,
      Lojista, Intermediador, Repassador)
- [ ] Redirecionar lead pós-cadastro para acesso ao canal
- [ ] Redirecionar lead pós-cadastro para entrada na comunidade

## Sprint 4 — Atualização dinâmica de FIPE + hardening

- [ ] Criar job de atualização dinâmica da FIPE
- [ ] Recalcular margem das oportunidades já salvas após virada mensal da
      FIPE
- [ ] Implementar deduplicação básica de oportunidades repetidas
- [ ] Adicionar observabilidade básica (logs/alertas de falha no Motor de
      Descoberta)
- [ ] Revisar e ajustar regras operacionais identificadas nas sprints
      anteriores

## Fora do backlog da Fase Zero (não construir agora)

- Marketplace transacional
- Aplicativo mobile
- Pagamentos
- Integração com Mercado Livre, Webmotors, Napista e outras fontes
- Qualquer funcionalidade de monetização (grupo premium, acesso antecipado,
  assinatura, destaque de oportunidades, direito de anunciar, ferramentas
  para anunciantes)
