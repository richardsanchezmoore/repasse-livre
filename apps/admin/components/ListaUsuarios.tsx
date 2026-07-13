"use client";

import { useState, useTransition } from "react";
import { Gem, Loader2, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { alterarPremiumPerfil, alterarRolePerfil, apagarUsuario } from "@/app/actions";

export interface UsuarioComRole {
  userId: string;
  email: string | null;
  /** Nome do cadastro (Google ou preenchido pela Cakto no checkout), ou null. */
  nome: string | null;
  /** WhatsApp cru (ex.: "5551996901333"), ou null. */
  whatsapp: string | null;
  role: "admin" | "publico";
  /** Flag manual de cortesia (perfis.premium) — o que o botão gema liga/desliga. */
  premiumManual: boolean;
  /** Tem assinatura ATIVA dentro da validade (premium pago, não cortesia). */
  assinante: boolean;
  /** Validade da assinatura já formatada (Brasília), p/ o tooltip do assinante. */
  premiumExpiraEm: string | null;
  /** Foto de perfil do login (Google), ou null → cai na inicial. */
  avatarUrl: string | null;
  /** Provedor do login: "Google" | "E-mail" | "Facebook" | … */
  origem: string;
  /** ISO cru do created_at (só p/ ordenação no server). */
  criadoEmIso: string | null;
  /** Data/hora de cadastro já formatada (Brasília). */
  cadastro: string | null;
  /** Último acesso já formatado, ou null. */
  ultimoAcesso: string | null;
}

function soDigitos(s: string): string {
  return s.replace(/\D/g, "");
}
/** Link wa.me (só dígitos) pra abrir a conversa direto. */
function linkWhatsapp(w: string): string {
  return `https://wa.me/${soDigitos(w)}`;
}
/** Exibe (DDD) 9xxxx-xxxx, com ou sem o 55 na frente; senão mostra cru. */
function formatarWhatsapp(w: string): string {
  const d = soDigitos(w);
  const comPais = d.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  if (comPais) return `(${comPais[1]}) ${comPais[2]}-${comPais[3]}`;
  const semPais = d.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  if (semPais) return `(${semPais[1]}) ${semPais[2]}-${semPais[3]}`;
  return w;
}

/** Avatar do usuário: foto do login (Google) em círculo, ou a inicial num
 * fundo verde. Cai na inicial se não tem foto OU se a imagem falhar. */
function AvatarUsuario({ url, inicial }: { url: string | null; inicial: string }) {
  const [ok, setOk] = useState(Boolean(url));
  return (
    <span className="usuarios-avatar">
      {url && ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="usuarios-avatar-img"
          referrerPolicy="no-referrer"
          onError={() => setOk(false)}
        />
      ) : (
        inicial
      )}
    </span>
  );
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

  function alterarPremium(userId: string, premium: boolean) {
    setErro(null);
    setIdEmAlteracao(userId);
    iniciarTransicao(async () => {
      try {
        await alterarPremiumPerfil(userId, premium);
      } catch (erroCapturado) {
        setErro(erroCapturado instanceof Error ? erroCapturado.message : "Falha ao alterar assinatura.");
      } finally {
        setIdEmAlteracao(null);
      }
    });
  }

  function excluirUsuario(userId: string, email: string | null) {
    if (
      !confirm(
        `Excluir a conta de ${email ?? "este usuário"}? Essa ação não pode ser desfeita — login, perfil e favoritos serão apagados.`
      )
    ) {
      return;
    }
    setErro(null);
    setIdEmAlteracao(userId);
    iniciarTransicao(async () => {
      try {
        await apagarUsuario(userId);
      } catch (erroCapturado) {
        setErro(erroCapturado instanceof Error ? erroCapturado.message : "Falha ao excluir usuário.");
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
            <th>WhatsApp</th>
            <th>Origem</th>
            <th>Cadastro</th>
            <th>Permissão</th>
            <th>Premium</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) => {
            const ehVoceMesmo = usuario.userId === usuarioAtualId;
            const carregando = pendente && idEmAlteracao === usuario.userId;
            return (
              <tr key={usuario.userId} className="usuarios-linha">
                <td>
                  <div className="usuarios-email-cel">
                    <AvatarUsuario
                      url={usuario.avatarUrl}
                      inicial={(usuario.nome ?? usuario.email ?? "?").charAt(0).toUpperCase()}
                    />
                    <div className="usuarios-email-nome">
                      <span>{usuario.email ?? "(sem e-mail)"}</span>
                      {usuario.nome && <span className="usuarios-nome-sub">{usuario.nome}</span>}
                    </div>
                  </div>
                </td>
                <td>
                  {usuario.whatsapp ? (
                    <a
                      href={linkWhatsapp(usuario.whatsapp)}
                      target="_blank"
                      rel="noreferrer"
                      className="usuarios-whats"
                      title="Abrir conversa no WhatsApp"
                    >
                      {formatarWhatsapp(usuario.whatsapp)}
                    </a>
                  ) : (
                    <span className="usuarios-selo usuarios-selo-publico">—</span>
                  )}
                </td>
                <td>
                  <span
                    className={`usuarios-selo usuarios-selo-origem${
                      usuario.origem === "Google" ? " usuarios-selo-origem-google" : ""
                    }`}
                  >
                    {usuario.origem}
                  </span>
                </td>
                <td className="usuarios-cadastro">
                  <span>{usuario.cadastro ?? "—"}</span>
                  {usuario.ultimoAcesso && (
                    <span className="usuarios-cadastro-acesso">último acesso {usuario.ultimoAcesso}</span>
                  )}
                </td>
                <td>
                  <span className={`usuarios-selo ${usuario.role === "admin" ? "usuarios-selo-admin" : "usuarios-selo-publico"}`}>
                    {usuario.role === "admin" ? "Admin" : "Público"}
                  </span>
                </td>
                <td>
                  {usuario.assinante ? (
                    <span
                      className="usuarios-selo usuarios-selo-premium"
                      title={usuario.premiumExpiraEm ? `Assinante ativo até ${usuario.premiumExpiraEm}` : "Assinante ativo"}
                    >
                      PRO · assinante
                    </span>
                  ) : usuario.premiumManual ? (
                    <span className="usuarios-selo usuarios-selo-premium" title="Premium manual (cortesia)">
                      PRO · cortesia
                    </span>
                  ) : (
                    <span className="usuarios-selo usuarios-selo-publico">—</span>
                  )}
                </td>
                <td className="usuarios-acoes">
                  <button
                    type="button"
                    className={`usuarios-icone-btn usuarios-icone-premium${usuario.premiumManual ? " ativo" : ""}`}
                    disabled={carregando}
                    title={usuario.premiumManual ? "Remover premium de cortesia" : "Dar premium de cortesia"}
                    aria-label={usuario.premiumManual ? "Remover premium de cortesia" : "Dar premium de cortesia"}
                    onClick={() => alterarPremium(usuario.userId, !usuario.premiumManual)}
                  >
                    {carregando ? <Loader2 size={16} className="animate-spin" /> : <Gem size={16} strokeWidth={1.9} />}
                  </button>
                  {usuario.role === "admin" ? (
                    <button
                      type="button"
                      className="usuarios-icone-btn usuarios-icone-admin"
                      disabled={ehVoceMesmo || carregando}
                      title={ehVoceMesmo ? "Você não pode remover sua própria permissão de admin" : "Remover admin"}
                      aria-label="Remover admin"
                      onClick={() => alterarRole(usuario.userId, "publico")}
                    >
                      <ShieldOff size={16} strokeWidth={1.9} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="usuarios-icone-btn usuarios-icone-admin"
                      disabled={carregando}
                      title="Promover a admin"
                      aria-label="Promover a admin"
                      onClick={() => alterarRole(usuario.userId, "admin")}
                    >
                      <ShieldCheck size={16} strokeWidth={1.9} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="usuarios-icone-btn usuarios-icone-apagar"
                    disabled={ehVoceMesmo || carregando}
                    title={ehVoceMesmo ? "Você não pode excluir sua própria conta por aqui" : "Excluir conta"}
                    aria-label="Excluir conta"
                    onClick={() => excluirUsuario(usuario.userId, usuario.email)}
                  >
                    <Trash2 size={16} strokeWidth={1.9} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
