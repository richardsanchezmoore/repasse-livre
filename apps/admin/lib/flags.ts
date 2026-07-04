/**
 * Feature flags simples via env (NEXT_PUBLIC_* pra funcionar no cliente).
 *
 * FACEBOOK_LOGIN_ATIVO: o login com Facebook está pronto (código + provedor no
 * Supabase), mas o app do Meta NÃO pode ser publicado ao público sem Business
 * Verification, que exige CNPJ. Enquanto isso, o botão fica ESCONDIDO em
 * produção pra visitantes não verem um botão que erra. Pra ativar quando o CNPJ
 * sair: setar `NEXT_PUBLIC_FACEBOOK_LOGIN_ENABLED=true` no Vercel e redeployar
 * (sem mudança de código). Ver project_repasse_livre_facebook_login_pendente.
 */
export const FACEBOOK_LOGIN_ATIVO = process.env.NEXT_PUBLIC_FACEBOOK_LOGIN_ENABLED === "true";
