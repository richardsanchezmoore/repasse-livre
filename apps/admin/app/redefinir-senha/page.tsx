import { RedefinirSenhaForm } from "./RedefinirSenhaForm";

export default function RedefinirSenhaPage() {
  return (
    <div className="login-pagina">
      <div className="login-card">
        <h1 className="login-titulo">Nova senha</h1>
        <p className="login-subtitulo">Defina uma nova senha para sua conta.</p>
        <RedefinirSenhaForm />
      </div>
    </div>
  );
}
