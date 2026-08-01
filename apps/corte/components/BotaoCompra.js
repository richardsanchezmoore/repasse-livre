"use client";

/**
 * CTA de compra (Cakto) com auto-login pós-pagamento.
 *
 * Antes de sair pro checkout, gera um token de claim, guarda no localStorage
 * (corte_claim) e o injeta no link como ?sck=claim_{token}. A Cakto propaga o sck
 * pro webhook (que amarra o token à conta) e pra URL de retorno. Na /bem-vinda o
 * token vira sessão (sem digitar e-mail). Ver components/BemVindaAcesso.
 *
 * Navega na MESMA aba de propósito: o funil inteiro (checkout → /bem-vinda) fica
 * numa aba só, e o localStorage faz a ponte.
 */
export default function BotaoCompra({ url, className = "pill", style, children }) {
  function ir(e) {
    e.preventDefault();
    if (!url) return;
    let token = "";
    try {
      token = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(36).slice(2);
      localStorage.setItem("corte_claim", token);
    } catch { /* storage bloqueado → segue sem localStorage; o sck na URL ainda cobre */ }
    const sep = url.includes("?") ? "&" : "?";
    window.location.href = token ? `${url}${sep}sck=claim_${token}` : url;
  }
  return (
    <a href={url || "#"} onClick={ir} className={className} style={style}>
      {children}
    </a>
  );
}
