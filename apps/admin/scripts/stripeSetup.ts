import "./_carregarEnv"; // PRIMEIRO — popula process.env de .env.local
import { getStripe } from "@/lib/stripe";

/**
 * Cria o Produto + Preço (R$ 99/mês recorrente) do plano premium no Stripe e
 * imprime o STRIPE_PRICE_ID pra colar no .env.local (e na Vercel). Rodar UMA vez
 * depois de configurar STRIPE_SECRET_KEY (modo teste primeiro).
 *   npm run stripe:setup
 */
async function main(): Promise<void> {
  const stripe = getStripe();

  const produto = await stripe.products.create({
    name: "Repasse Livre Premium",
    description:
      "Acesso premium: todas as ofertas abaixo da FIPE, análise do Copiloto, Radar do Investidor, tendências de mercado e alertas instantâneos.",
  });

  const preco = await stripe.prices.create({
    product: produto.id,
    currency: "brl",
    unit_amount: 9900, // R$ 99,00 (em centavos)
    recurring: { interval: "month" },
  });

  console.log("✔ Produto criado:", produto.id);
  console.log("✔ Preço mensal R$ 99 criado:", preco.id);
  console.log("\nCole no .env.local (e nas variáveis da Vercel):");
  console.log(`STRIPE_PRICE_ID=${preco.id}`);
}

main().catch((erro) => {
  console.error("[stripe:setup] falha:", erro);
  process.exit(1);
});
