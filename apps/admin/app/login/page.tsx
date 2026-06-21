import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="login-pagina">
      <div className="login-card">
        <h1 className="login-titulo">Repasse Livre</h1>
        <p className="login-subtitulo">Entre para favoritar oportunidades e acompanhar de onde estiver.</p>
        <LoginForm />
        <p className="login-rodape">
          Não tem conta? <Link href="/cadastro">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
