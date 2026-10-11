import { LoginForm } from "./LoginForm";
import { PaginaLogin } from "./PaginaLogin";

/**
 * ⚠️ A casca é CLIENTE (precisa do idioma, que vem do caminho) e a página é
 * servidor (precisa do searchParams). Por isso a divisão: a rota resolve o
 * redirect, o componente cuida do texto.
 */
export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return (
    <PaginaLogin redirect={redirect}>
      <LoginForm redirect={redirect} />
    </PaginaLogin>
  );
}
