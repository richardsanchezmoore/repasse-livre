# Backlog — Repasse Livre (Fase Zero)

Backlog funcional derivado do [PRD](prd-funcional.md) e da
[arquitetura](arquitetura.md) propostos. Itens organizados por componente.

## Motor de Descoberta

- [ ] Capturar listagem de anúncios de veículos na OLX
- [ ] Abrir cada anúncio individualmente e extrair: título, preço, cidade,
      estado, fotos, descrição, link
- [ ] Consultar valor FIPE do veículo extraído
- [ ] Calcular margem percentual (preço vs. FIPE)
- [ ] Aplicar regra de elegibilidade (descartar se margem < 5%)
- [ ] Classificar oportunidade elegível por faixa de margem
      (🟢 5–9,99% / 🔥 10–14,99% / 🚀 15–19,99% / 🏆 20%+)
- [ ] Persistir oportunidade elegível no Banco Nacional de Oportunidades

## Banco Nacional de Oportunidades

- [ ] Modelar entidade Opportunity com todos os campos do PRD
- [ ] Armazenar histórico da FIPE capturada no momento da descoberta
- [ ] Job de atualização dinâmica da FIPE para oportunidades já salvas
- [ ] Recalcular margem após virada mensal da FIPE

## Central de Oportunidades (painel operacional)

- [ ] Box "Descobertas" listando oportunidades vindas do Motor de Descoberta
- [ ] Box "Enviadas" listando oportunidades já distribuídas
- [ ] Card de oportunidade com foto, veículo, cidade, margem e fonte
- [ ] Ação: aprovar oportunidade
- [ ] Ação: rejeitar oportunidade
- [ ] Ação: favoritar oportunidade
- [ ] Ação: compartilhar oportunidade
- [ ] Validação operacional manual de qualidade visual e coerência das fotos

## Inserção Direta

- [ ] Formulário de envio manual de oportunidade (nome, WhatsApp, marca,
      modelo, ano, versão, câmbio, cidade, KM, motivo da venda, fotos)
- [ ] Validação obrigatória de captcha
- [ ] Validação obrigatória de WhatsApp
- [ ] Validação obrigatória de presença de foto
- [ ] Consulta automática de FIPE para o veículo informado
- [ ] Aplicar margem mínima de 5% como critério de elegibilidade
- [ ] Descartar submissões não elegíveis sem gravar no banco principal

## Distribuição

- [ ] Publicação de oportunidades aprovadas no canal oficial (Repasse Livre |
      Oportunidades Automotivas)
- [ ] Replicação de oportunidades na comunidade WhatsApp
- [ ] Replicação em grupos de avisos

## Audiência / Landing Page

- [ ] Landing page com headline "Descobrimos oportunidades automotivas todos
      os dias para você."
- [ ] Captura de nome, WhatsApp e perfil do lead
- [ ] Seleção de perfil (Comprador Particular, Investidor, Lojista,
      Intermediador, Repassador)
- [ ] Pós-cadastro: redirecionar para acesso ao canal
- [ ] Pós-cadastro: redirecionar para entrada na comunidade

## Fora do backlog da Fase Zero (não construir agora)

- Marketplace transacional
- Aplicativo mobile
- Pagamentos
- Integração com Mercado Livre, Webmotors, Napista e outras fontes
- Qualquer funcionalidade de monetização (grupo premium, acesso antecipado,
  assinatura, destaque de oportunidades, direito de anunciar, ferramentas
  para anunciantes)
