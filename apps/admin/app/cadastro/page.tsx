import { CadastroForm } from "./CadastroForm";
import { PaginaCadastro } from "./PaginaCadastro";

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return (
    <PaginaCadastro redirect={redirect}>
      <CadastroForm redirect={redirect} />
    </PaginaCadastro>
  );
}
