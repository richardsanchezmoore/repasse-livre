import Link from "next/link";
import { CadastroForm } from "./CadastroForm";

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  const linkLogin = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";

  return (
    <div className="login-pagina">
      <div className="login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Repasse Livre" className="login-logo" />
        <h1 className="visualmente-oculto">Criar conta</h1>
        <p className="login-subtitulo">Crie sua conta para favoritar oportunidades e acompanhar de onde estiver.</p>
        <CadastroForm redirect={redirect} />
        <p className="login-rodape">
          Já tem conta? <Link href={linkLogin}>Fazer login</Link>
        </p>
      </div>
    </div>
  );
}
