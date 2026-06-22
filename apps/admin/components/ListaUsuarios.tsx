"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { alterarRolePerfil } from "@/app/actions";

export interface UsuarioComRole {
  userId: string;
  email: string | null;
  role: "admin" | "publico";
}

export function ListaUsuarios({
  usuarios,
  usuarioAtualId,
}: {
  usuarios: UsuarioComRole[];
  usuarioAtualId: string;
}) {
  const [pendente, iniciarTransicao] = useTransition();
  const [idEmAlteracao, setIdEmAlteracao] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function alterarRole(userId: string, novaRole: "admin" | "publico") {
    if (novaRole === "publico" && !confirm("Remover acesso de administrador deste usuário?")) {
      return;
    }
    setErro(null);
    setIdEmAlteracao(userId);
    iniciarTransicao(async () => {
      try {
        await alterarRolePerfil(userId, novaRole);
      } catch (erroCapturado) {
        setErro(erroCapturado instanceof Error ? erroCapturado.message : "Falha ao alterar permissão.");
      } finally {
        setIdEmAlteracao(null);
      }
    });
  }

  return (
    <div className="usuarios-tabela-container">
      {erro && <p className="campo-erro">{erro}</p>}
      <table className="usuarios-tabela">
        <thead>
          <tr>
            <th>E-mail</th>
            <th>Permissão</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) => {
            const ehVoceMesmo = usuario.userId === usuarioAtualId;
            const carregando = pendente && idEmAlteracao === usuario.userId;
            return (
              <tr key={usuario.userId} className="usuarios-linha">
                <td>{usuario.email ?? "(sem e-mail)"}</td>
                <td>
                  <span className={`usuarios-selo ${usuario.role === "admin" ? "usuarios-selo-admin" : "usuarios-selo-publico"}`}>
                    {usuario.role === "admin" ? "Admin" : "Público"}
                  </span>
                </td>
                <td>
                  {usuario.role === "admin" ? (
                    <button
                      type="button"
                      className="usuarios-botao usuarios-botao-remover"
                      disabled={ehVoceMesmo || carregando}
                      title={ehVoceMesmo ? "Você não pode remover sua própria permissão de admin" : undefined}
                      onClick={() => alterarRole(usuario.userId, "publico")}
                    >
                      <ShieldOff size={16} strokeWidth={1.75} />
                      {carregando ? "Removendo…" : "Remover admin"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="usuarios-botao usuarios-botao-promover"
                      disabled={carregando}
                      onClick={() => alterarRole(usuario.userId, "admin")}
                    >
                      <ShieldCheck size={16} strokeWidth={1.75} />
                      {carregando ? "Promovendo…" : "Promover a admin"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
