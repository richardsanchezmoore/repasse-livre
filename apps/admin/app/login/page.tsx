import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  const linkCadastro = redirect ? `/cadastro?redirect=${encodeURIComponent(redirect)}` : "/cadastro";

  return (
    <div className="login-pagina">
      <div className="login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Repasse Livre" className="login-logo" />
        <h1 className="visualmente-oculto">Entrar — Repasse Livre</h1>
        <p className="login-subtitulo">Entre para favoritar oportunidades e acompanhar de onde estiver.</p>
        <LoginForm redirect={redirect} />
        <p className="login-rodape">
          Não tem conta? <Link href={linkCadastro}>Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
