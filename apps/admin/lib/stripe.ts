import "server-only";
import Stripe from "stripe";

/**
 * Cliente Stripe (server-only). Lazy: só instancia no primeiro uso, com erro
 * claro se a chave não estiver configurada — assim o build/import não quebra
 * antes de `STRIPE_SECRET_KEY` existir no ambiente. Usa a versão de API padrão
 * da conta (não fixa `apiVersion` pra não brigar com o pin do SDK).
 */
let cliente: Stripe | null = null;

export function getStripe(): Stripe {
  if (!cliente) {
    const chave = process.env.STRIPE_SECRET_KEY;
    if (!chave) throw new Error("STRIPE_SECRET_KEY não configurada.");
    cliente = new Stripe(chave);
  }
  return cliente;
}
