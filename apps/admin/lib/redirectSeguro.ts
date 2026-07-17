/**
 * Valida um destino de redirect vindo de query string (`?redirect=...`)
 * antes de usar — sem isso, um link malicioso poderia usar nosso domínio
 * pra redirecionar pra outro site depois do login (open redirect). Só
 * aceita caminho relativo começando com uma única barra.
 */
export function caminhoRedirectSeguro(redirect: string | null | undefined): string {
  // Sem destino explícito → /conta (não a home): o pós-login é o momento de apresentar
  // o painel do usuário e fazer as chamadas sutis pro PRO. Quem veio de um anúncio
  // (?redirect=/carros/...) volta pra lá; login "solto" cai na conta.
  if (!redirect) return "/conta";
  return redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/conta";
}
