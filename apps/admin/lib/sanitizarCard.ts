import type { Oportunidade } from "./types";

/**
 * Remove os campos que revelariam a ORIGEM/CONTATO de uma oferta TRAVADA (premium)
 * ANTES de mandar o objeto pro OpportunityCard (client component). Sem isso, como
 * o card é "use client", o objeto inteiro é serializado no payload RSC/props — e um
 * usuário esperto lê `link_origem` (URL da OLX/ML/FB), WhatsApp e nome do vendedor
 * direto no inspetor, driblando o overlay. Mantém o que o card MOSTRA (veículo,
 * preço, FIPE, margem, foto, cidade). Ver project_repasse_livre_client_safe_split.
 */
export function sanitizarCardBloqueado(op: Oportunidade): Oportunidade {
  return {
    ...op,
    link_origem: "", // a URL da fonte é o que vendemos — nunca vai pro não-pagante
    whatsapp: null,
    nome_remetente: null,
    descricao: null, // pode conter telefone/contato do vendedor
  };
}
