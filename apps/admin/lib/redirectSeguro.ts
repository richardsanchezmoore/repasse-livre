/**
 * Valida um destino de redirect vindo de query string (`?redirect=...`)
 * antes de usar — sem isso, um link malicioso poderia usar nosso domínio
 * pra redirecionar pra outro site depois do login (open redirect). Só
 * aceita caminho relativo começando com uma única barra.
 */
export function caminhoRedirectSeguro(redirect: string | null | undefined): string {
  if (!redirect) return "/";
  return redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
}
