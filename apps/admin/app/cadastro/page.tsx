import Link from "next/link";
import { CadastroForm } from "./CadastroForm";

export default function CadastroPage() {
  return (
    <div className="login-pagina">
      <div className="login-card">
        <h1 className="login-titulo">Criar conta</h1>
        <p className="login-subtitulo">Crie sua conta para favoritar oportunidades e acompanhar de onde estiver.</p>
        <CadastroForm />
        <p className="login-rodape">
          Já tem conta? <Link href="/login">Fazer login</Link>
        </p>
      </div>
    </div>
  );
}
